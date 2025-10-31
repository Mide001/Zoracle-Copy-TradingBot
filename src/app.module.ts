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
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('mongodb.uri'),
      }),
      inject: [ConfigService],
    }),
    AlchemyWebhookModule,
    MonitoringModule,
  ],
  controllers: [AppController],
})
export class AppModule {}