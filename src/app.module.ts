import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AlchemyWebhookModule } from './modules/alchemy-webhook/alchemy-webhook.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
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
})
export class AppModule {}