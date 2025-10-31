import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { CopyTradeJobData } from '../dto/copy-trade-job.dto';
import { SwapService } from '../../swap/swap.service';
import { RedisService } from '../../redis/redis.service';

@Processor('copy-trade')
export class CopyTradeProcessor {
  private readonly logger = new Logger(CopyTradeProcessor.name);

  constructor(
    private swapService: SwapService,
    private redisService: RedisService,
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
          // After successful BUY, we need to store the token amount received
          // Note: Swap API response doesn't include token amount received,
          // so we'll need to calculate or estimate it
          // For now, we'll store based on the trader's token amount as reference
          // TODO: Enhance to get actual token amount from swap response or query balance
          
          const holdingKey = `copy-trade:holdings:${configId}:${tokenAddress.toLowerCase()}:${normalizedNetwork}`;
          
          // Use trader's token value as reference (or estimate based on ETH spent)
          // This is an approximation - ideally we'd get actual received amount
          const tokenAmountWei = job.data.value
            ? this.swapService.convertToWei(job.data.value.toString())
            : fromAmount; // Fallback to same as ETH spent (rough estimate)
          
          // Store without TTL (persist until SELL)
          await this.redisService.set(holdingKey, tokenAmountWei);
          
          this.logger.log(
            `Stored token holdings: ${tokenSymbol} (${tokenAmountWei} wei) for config ${configId}`,
          );
        } else if (tradeType === 'SELL') {
          // After successful SELL, remove the holdings (sold 100%)
          const holdingKey = `copy-trade:holdings:${configId}:${tokenAddress.toLowerCase()}:${normalizedNetwork}`;
          await this.redisService.del(holdingKey);
          
          this.logger.log(
            `Cleared token holdings for ${tokenSymbol} after successful SELL (config ${configId})`,
          );
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

