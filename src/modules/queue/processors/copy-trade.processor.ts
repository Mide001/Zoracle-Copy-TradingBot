import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { CopyTradeJobData } from '../dto/copy-trade-job.dto';
import { SwapService } from '../../swap/swap.service';
import { RedisService } from '../../redis/redis.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Processor('copy-trade')
export class CopyTradeProcessor {
  private readonly logger = new Logger(CopyTradeProcessor.name);

  constructor(
    private swapService: SwapService,
    private redisService: RedisService,
    private notificationsService: NotificationsService,
  ) {}

  @Process()
  async handleCopyTrade(job: Job<CopyTradeJobData>) {
    const {
      configId,
      accountName,
      tradeType,
      tokenSymbol,
      tokenAddress,
      txHash,
      network,
      delegationAmount,
      maxSlippage,
    } = job.data;

    this.logger.log(
      `Processing copy trade job [${job.id}] for config ${configId} | ${tradeType} ${tokenSymbol} | tx: ${txHash}`,
    );

    try {
      // Normalize network (BASE_MAINNET → base)
      const normalizedNetwork = this.swapService.normalizeNetwork(network);
      
      // Get native token address (ETH)
      const nativeToken = this.swapService.getNativeTokenAddress(network);

      // Convert slippage from string (e.g., "0.01") to basis points (e.g., 100)
      const slippageBps = this.swapService.convertSlippageToBps(maxSlippage);

      // Determine swap direction
      let fromToken: string;
      let toToken: string;
      let fromAmount: string;

      if (tradeType === 'BUY') {
        // Buying token: ETH → Token
        fromToken = nativeToken;
        toToken = tokenAddress;
        // Convert delegationAmount (amount per trade) to wei
        fromAmount = this.swapService.convertToWei(delegationAmount);
        
        this.logger.log(
          `BUY swap: Spending ${delegationAmount} ETH to buy ${tokenSymbol}`,
        );
      } else {
        // SELL: Token → ETH
        // Sell 100% of what was bought - retrieve from Redis
        fromToken = tokenAddress;
        toToken = nativeToken;
        
        // Get the token amount we bought (stored in Redis after BUY)
        const holdingKey = `copy-trade:holdings:${configId}:${tokenAddress.toLowerCase()}:${normalizedNetwork}`;
        const storedTokenAmount = await this.redisService.get(holdingKey);
        
        if (!storedTokenAmount) {
          throw new Error(
            `No token holdings found for config ${configId} and token ${tokenSymbol}. Cannot sell without prior purchase.`,
          );
        }
        
        fromAmount = storedTokenAmount; // Already in wei format
        const tokenAmountDisplay = (BigInt(storedTokenAmount) / BigInt(1e18)).toString();
        
        this.logger.log(
          `SELL swap: Selling 100% of ${tokenSymbol} tokens (${tokenAmountDisplay} tokens)`,
        );
      }

      // Execute swap
      const swapResult = await this.swapService.executeSwap({
        accountName,
        fromToken,
        toToken,
        fromAmount,
        slippageBps,
        network: normalizedNetwork,
      });

      if (swapResult.success && swapResult.data) {
        this.logger.log(
          `Copy trade job [${job.id}] completed successfully for config ${configId}`,
        );
        this.logger.log(
          `Transaction: ${swapResult.data.transactionHash} | Explorer: ${swapResult.data.transactionExplorer}`,
        );

        // Return immediately after swap - don't block on balance queries or notifications
        // This reduces latency significantly
        const result = {
          success: true,
          configId,
          accountName,
          tradeType,
          tokenSymbol,
          transactionHash: swapResult.data.transactionHash,
          blockNumber: swapResult.data.blockNumber,
        };

        // Handle token holdings tracking and notifications asynchronously (non-blocking)
        if (tradeType === 'BUY') {
          const holdingKey = `copy-trade:holdings:${configId}:${tokenAddress.toLowerCase()}:${normalizedNetwork}`;
          
          // Store estimated amount immediately for SELL operations
          // This ensures SELL can proceed even if balance query fails
          const estimatedTokenAmountWei = job.data.value
            ? this.swapService.convertToWei(job.data.value.toString())
            : fromAmount;
          await this.redisService.set(holdingKey, estimatedTokenAmountWei);
          this.logger.debug(
            `Stored estimated token holdings for immediate SELL capability: ${tokenSymbol}`,
          );

          // Fire and forget: Query balance in background and update Redis
          // Don't wait for this - it can take 1-3 seconds
          this.updateBuyHoldingsAsync(
            configId,
            accountName,
            tokenAddress,
            tokenSymbol,
            normalizedNetwork,
            holdingKey,
            fromAmount,
            job.data.value,
            swapResult.data.transactionHash,
            swapResult.data.transactionExplorer,
            job.data.telegramId,
          ).catch((error) => {
            this.logger.error(
              `Error in async buy holdings update: ${error.message}`,
            );
          });
        } else if (tradeType === 'SELL') {
          // After successful SELL, remove the holdings (sold 100%)
          const holdingKey = `copy-trade:holdings:${configId}:${tokenAddress.toLowerCase()}:${normalizedNetwork}`;
          const soldAmountWei = await this.redisService.get(holdingKey);
          await this.redisService.del(holdingKey);
          
          this.logger.log(
            `Cleared token holdings for ${tokenSymbol} after successful SELL (config ${configId})`,
          );

          // Send notification asynchronously (non-blocking)
          const tokenAmountFormatted = soldAmountWei
            ? (
                Number(BigInt(soldAmountWei)) / 1e18
              ).toLocaleString(undefined, {
                maximumFractionDigits: 6,
              })
            : 'all';

          this.notificationsService
            .sendTradeNotification({
              telegramId: job.data.telegramId,
              configId,
              accountName,
              tradeType: 'SELL',
              tokenSymbol,
              tokenAddress,
              tokenAmount: tokenAmountFormatted,
              transactionHash: swapResult.data.transactionHash,
              transactionExplorer: swapResult.data.transactionExplorer,
              network: normalizedNetwork,
            })
            .catch((error) => {
              this.logger.error(
                `Error sending SELL notification: ${error.message}`,
              );
            });
        }

        return result;
      } else {
        throw new Error(swapResult.error || 'Swap execution failed');
      }
    } catch (error) {
      const errorMessage = error?.message || String(error);
      this.logger.error(
        `Copy trade job [${job.id}] failed for config ${configId}: ${errorMessage}`,
      );

      // Notify user on insufficient balance - check multiple patterns
      const isInsufficientBalance = 
        typeof errorMessage === 'string' &&
        (
          /insufficient.*balance/i.test(errorMessage) ||
          /insufficient.*funds/i.test(errorMessage) ||
          /insufficient.*eth/i.test(errorMessage)
        );

      if (isInsufficientBalance) {
        // Deduplicate notifications: only send once per trade (txHash + configId)
        // This prevents duplicate notifications when job retries
        const notificationKey = `notification:sent:insufficient-balance:${txHash}:${configId}`;
        const alreadySent = await this.redisService.get(notificationKey);
        
        if (alreadySent) {
          this.logger.log(
            `Insufficient balance notification already sent for trade ${txHash} (config ${configId}), skipping duplicate`,
          );
        } else {
          this.logger.log(
            `Insufficient balance detected for config ${configId}, sending alert notification`,
          );
          const msg = `⚠️ Copy trade from ${configId} failed.\n\nReason: Insufficient funds in your wallet.\nPlease add funds to keep copying their trades automatically.`;
          try {
            await this.notificationsService.sendAlertNotification({
              telegramId: job.data.telegramId,
              configId,
              accountName,
              message: msg,
            });
            
            // Mark notification as sent (TTL: 1 hour to prevent spam if same trade fails multiple times)
            await this.redisService.set(notificationKey, '1', 3600);
            
            this.logger.log(`Alert notification sent for insufficient balance (config ${configId})`);
          } catch (notifError) {
            this.logger.error(
              `Failed to send insufficient balance alert: ${notifError.message}`,
            );
          }
        }
        
        // Mark job as permanently failed - no retries for insufficient balance
        // Retrying won't help since the balance won't magically increase
        this.logger.warn(
          `Marking job [${job.id}] as permanently failed due to insufficient balance (no retries)`,
        );
        await job.moveToFailed(error as Error, true);
        return; // Don't re-throw - job is already marked as failed
      }
      
      // Re-throw to trigger Bull retry mechanism for other errors
      throw error;
    }
  }

  /**
   * Update buy holdings asynchronously (non-blocking)
   * This method runs in the background to query actual balance and update Redis
   */
  private async updateBuyHoldingsAsync(
    configId: string,
    accountName: string,
    tokenAddress: string,
    tokenSymbol: string,
    normalizedNetwork: string,
    holdingKey: string,
    fromAmount: string,
    value: string | undefined,
    transactionHash: string,
    transactionExplorer: string,
    telegramId: string,
  ): Promise<void> {
    // Wait for transaction to be mined (reduced from 3s to 1s)
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Query actual token balance with retry logic
    let actualBalance: string | null = null;
    let retries = 2;
    while (retries > 0 && !actualBalance) {
      actualBalance = await this.swapService.getTokenBalance(
        accountName,
        tokenAddress,
        normalizedNetwork,
      );
      if (!actualBalance && retries > 1) {
        // Wait another second before retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      retries--;
    }
    
    let tokenAmountFormatted: string;

    if (actualBalance) {
      // Store actual balance received
      await this.redisService.set(holdingKey, actualBalance);
      // Calculate formatted amount for notification
      const balanceBigInt = BigInt(actualBalance);
      tokenAmountFormatted = (
        Number(balanceBigInt) / 1e18
      ).toLocaleString(undefined, {
        maximumFractionDigits: 6,
      });
      this.logger.log(
        `Updated token holdings with actual balance: ${tokenSymbol} (${actualBalance} wei) for config ${configId}`,
      );
    } else {
      // Fallback: Use a calculated estimate based on ETH spent
      this.logger.warn(
        `Unable to query actual balance for ${tokenSymbol}. Keeping estimated value.`,
      );
      const estimatedTokenAmountWei = value
        ? this.swapService.convertToWei(value.toString())
        : fromAmount;
      
      await this.redisService.set(holdingKey, estimatedTokenAmountWei);
      tokenAmountFormatted = (
        Number(BigInt(estimatedTokenAmountWei)) / 1e18
      ).toLocaleString(undefined, {
        maximumFractionDigits: 6,
      });
      this.logger.warn(
        `Kept estimated token holdings: ${tokenSymbol} (${estimatedTokenAmountWei} wei)`,
      );
    }

    // Send notification asynchronously (non-blocking)
    this.notificationsService
      .sendTradeNotification({
        telegramId,
        configId,
        accountName,
        tradeType: 'BUY',
        tokenSymbol,
        tokenAddress,
        tokenAmount: tokenAmountFormatted,
        transactionHash,
        transactionExplorer,
        network: normalizedNetwork,
      })
      .catch((error) => {
        this.logger.error(
          `Error sending BUY notification: ${error.message}`,
        );
      });
  }
}

