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

        // Handle token holdings tracking
        if (tradeType === 'BUY') {
          // After successful BUY, wait for transaction to be mined then query actual balance
          // Note: We cannot use trader's value as it may differ due to price/execution differences
          
          const holdingKey = `copy-trade:holdings:${configId}:${tokenAddress.toLowerCase()}:${normalizedNetwork}`;
          
          // Wait a few seconds for transaction to be mined and balance to update
          await new Promise((resolve) => setTimeout(resolve, 3000));
          
          // Query actual token balance
          const actualBalance = await this.swapService.getTokenBalance(
            accountName,
            tokenAddress,
            normalizedNetwork,
          );
          
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
              `Stored actual token holdings: ${tokenSymbol} (${actualBalance} wei) for config ${configId}`,
            );
          } else {
            // Fallback: Use a calculated estimate based on ETH spent (will be inaccurate)
            // WARNING: This is a temporary fallback until balance query is implemented
            this.logger.warn(
              `Unable to query actual balance for ${tokenSymbol}. Using estimate (may be inaccurate).`,
            );
            // Store estimated value as fallback (divide ETH spent by estimated price ratio)
            // This is a rough approximation and should be replaced with actual balance query
            const estimatedTokenAmountWei = job.data.value
              ? this.swapService.convertToWei(job.data.value.toString())
              : fromAmount;
            
            await this.redisService.set(holdingKey, estimatedTokenAmountWei);
            tokenAmountFormatted = (
              Number(BigInt(estimatedTokenAmountWei)) / 1e18
            ).toLocaleString(undefined, {
              maximumFractionDigits: 6,
            });
            this.logger.warn(
              `Stored estimated token holdings: ${tokenSymbol} (${estimatedTokenAmountWei} wei) - ACTUAL BALANCE QUERY NEEDED`,
            );
          }

          // Send notification for BUY
          await this.notificationsService.sendTradeNotification({
            telegramId: job.data.telegramId,
            configId,
            accountName,
            tradeType: 'BUY',
            tokenSymbol,
            tokenAddress,
            tokenAmount: tokenAmountFormatted,
            transactionHash: swapResult.data.transactionHash,
            transactionExplorer: swapResult.data.transactionExplorer,
            network: normalizedNetwork,
          });
        } else if (tradeType === 'SELL') {
          // After successful SELL, remove the holdings (sold 100%)
          const holdingKey = `copy-trade:holdings:${configId}:${tokenAddress.toLowerCase()}:${normalizedNetwork}`;
          const soldAmountWei = await this.redisService.get(holdingKey);
          await this.redisService.del(holdingKey);
          
          this.logger.log(
            `Cleared token holdings for ${tokenSymbol} after successful SELL (config ${configId})`,
          );

          // Calculate formatted amount for notification
          const tokenAmountFormatted = soldAmountWei
            ? (
                Number(BigInt(soldAmountWei)) / 1e18
              ).toLocaleString(undefined, {
                maximumFractionDigits: 6,
              })
            : 'all';

          // Send notification for SELL
          await this.notificationsService.sendTradeNotification({
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
          });
        }

        return {
          success: true,
          configId,
          accountName,
          tradeType,
          tokenSymbol,
          transactionHash: swapResult.data.transactionHash,
          blockNumber: swapResult.data.blockNumber,
        };
      } else {
        throw new Error(swapResult.error || 'Swap execution failed');
      }
    } catch (error) {
      this.logger.error(
        `Copy trade job [${job.id}] failed for config ${configId}: ${error.message}`,
      );
      
      // Re-throw to trigger Bull retry mechanism
      throw error;
    }
  }
}

