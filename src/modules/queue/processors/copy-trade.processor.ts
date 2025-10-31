import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { CopyTradeJobData } from '../dto/copy-trade-job.dto';

@Processor('copy-trade')
export class CopyTradeProcessor {
  private readonly logger = new Logger(CopyTradeProcessor.name);

  @Process()
  async handleCopyTrade(job: Job<CopyTradeJobData>) {
    const { configId, accountName, tradeType, tokenSymbol, txHash } = job.data;

    this.logger.log(
      `Processing copy trade job [${job.id}] for config ${configId} | ${tradeType} ${tokenSymbol} | tx: ${txHash}`,
    );

    try {
      // TODO: Implement copy trade execution logic here
      // 1. Calculate trade amount based on delegationAmount/remainingAmount
      // 2. Execute swap on DEX (buy/sell token)
      // 3. Update remainingAmount in MongoDB
      // 4. Send notification to Telegram if needed
      // 5. Handle errors and retries

      this.logger.log(
        `Copy trade job [${job.id}] completed successfully for config ${configId}`,
      );

      return {
        success: true,
        configId,
        accountName,
        tradeType,
        tokenSymbol,
      };
    } catch (error) {
      this.logger.error(
        `Copy trade job [${job.id}] failed for config ${configId}: ${error.message}`,
      );
      throw error; // Bull will handle retries based on queue config
    }
  }
}

