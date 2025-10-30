import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhookReceiverController } from './controllers/webhook-receiver.controller';
import { WebhookManagerController } from './controllers/webhook-manager.controller';
import { WebhookReceiverService } from './services/webhook-receiver.service';
import { WebhookManagerService } from './services/webhook-manager.service';
import { AlchemyApiService } from './services/alchemy-api.service';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { RawBodyMiddleware } from '../../common/middleware/raw-body.middleware';
import { AlchemySignatureMiddleware } from '../../common/middleware/alchemy-signature.middleware';

@Module({
  imports: [ConfigModule, MonitoringModule],
  controllers: [WebhookReceiverController, WebhookManagerController],
  providers: [WebhookReceiverService, WebhookManagerService, AlchemyApiService],
})
export class AlchemyWebhookModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RawBodyMiddleware, AlchemySignatureMiddleware)
      .forRoutes({ path: 'webhook', method: RequestMethod.POST });
  }
}
