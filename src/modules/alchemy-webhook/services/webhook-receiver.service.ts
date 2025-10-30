import { Injectable, Logger } from '@nestjs/common';
import { WebhookEventDto } from '../dto/webhook-event.dto';

@Injectable()
export class WebhookReceiverService {
  private readonly logger = new Logger(WebhookReceiverService.name);

  async processWebhookEvent(event: WebhookEventDto): Promise<void> {
    this.logger.log(`Processing webhook event ID: ${event.id}`);
    this.logger.log(`Event type: ${event.type}`);
    this.logger.log(`Network: ${event.event.network}`);
    this.logger.log(`Activities count: ${event.event.activity.length}`);

    // Log each activity
    event.event.activity.forEach((activity, index) => {
      this.logger.log(`Activity ${index + 1}:`);
      this.logger.log(`  From: ${activity.fromAddress}`);
      this.logger.log(`  To: ${activity.toAddress}`);
      this.logger.log(`  Asset: ${activity.asset}`);
      this.logger.log(`  Value: ${activity.value}`);
      this.logger.log(`  Category: ${activity.category}`);
      this.logger.log(`  Hash: ${activity.hash}`);
    });

    // TODO: Copy trading logic here
  }
}