import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CopyTradeProcessor } from './processors/copy-trade.processor';
import { QueueService } from './queue.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUri = configService.get<string>('redis.uri');
        
        // Parse Redis URI or use defaults
        let host = 'localhost';
        let port = 6379;
        let password: string | undefined;
        
        if (redisUri && redisUri !== 'redis://localhost:6379') {
          try {
            const url = new URL(redisUri);
            host = url.hostname;
            port = parseInt(url.port || '6379', 10);
            password = url.password || undefined;
          } catch (error) {
            // Fallback to defaults if parsing fails
          }
        }

        return {
          redis: {
            host,
            port,
            password,
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'copy-trade',
    }),
  ],
  providers: [CopyTradeProcessor, QueueService],
  exports: [QueueService],
})
export class QueueModule {}

