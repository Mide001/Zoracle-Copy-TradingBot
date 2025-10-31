import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { CopyTradeJobData } from '../dto/copy-trade-job.dto';
import { SwapService } from '../../swap/swap.service';

@Processor('copy-trade')
export class CopyTradeProcessor {
  private readonly logger = new Logger(CopyTradeProcessor.name);

  constructor(private swapService: SwapService) {}

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
        // For SELL, we need to calculate how much token to sell
        // For now, we'll use the trader's token amount (value from activity)
        // but this could be improved with better calculation
        fromToken = tokenAddress;
        toToken = nativeToken;
        
        // Use delegationAmount as target ETH value, but we need token amount
        // For simplicity, using a calculated amount - this may need adjustment
        // Note: This is a simplification - ideally we'd calculate based on current price
        const tokenAmount = job.data.value?.toString() || delegationAmount;
        fromAmount = this.swapService.convertToWei(tokenAmount);
        
        this.logger.log(
          `SELL swap: Selling ${tokenSymbol} tokens (target ${delegationAmount} ETH value)`,
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

