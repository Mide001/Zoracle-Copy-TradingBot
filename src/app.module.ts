import { Module } from '@nestjs/common';
import { AppController } from './root.controller.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AlchemyWebhookModule } from './modules/alchemy-webhook/alchemy-webhook.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { RedisModule } from './modules/redis/redis.module';
import { QueueModule } from './modules/queue/queue.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    RedisModule,
    QueueModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('mongodb.uri');
        if (!uri) {
          throw new Error('MONGODB_URI environment variable is required but not set');
        }
        return {
          uri,
          // Connection options to prevent blocking startup
          serverSelectionTimeoutMS: 5000, // 5 second timeout
          socketTimeoutMS: 45000,
          connectTimeoutMS: 10000,
          retryWrites: true,
          retryReads: true,
        };
      },
      inject: [ConfigService],
    }),
    AlchemyWebhookModule,
    MonitoringModule,
  ],
  controllers: [AppController],
})
export class AppModule {}