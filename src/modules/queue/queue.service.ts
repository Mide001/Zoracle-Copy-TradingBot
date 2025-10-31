import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { CopyTradeJobData } from './dto/copy-trade-job.dto';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('copy-trade') private copyTradeQueue: Queue<CopyTradeJobData>,
  ) {}

  async enqueueCopyTrade(jobData: CopyTradeJobData): Promise<void> {
    try {
      const job = await this.copyTradeQueue.add(jobData, {
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 seconds, exponential backoff
        },
        removeOnComplete: 50, // Keep last 50 completed jobs
        removeOnFail: 100, // Keep last 100 failed jobs
      });

      this.logger.log(
        `Enqueued copy trade job [${job.id}] for config ${jobData.configId} | ${jobData.tradeType} ${jobData.tokenSymbol}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue copy trade job for config ${jobData.configId}: ${error.message}`,
      );
      throw error;
    }
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.copyTradeQueue.getWaitingCount(),
      this.copyTradeQueue.getActiveCount(),
      this.copyTradeQueue.getCompletedCount(),
      this.copyTradeQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}

