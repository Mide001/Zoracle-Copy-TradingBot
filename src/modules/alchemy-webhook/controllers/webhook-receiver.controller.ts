import { Controller, Post, Body, Logger, HttpCode } from '@nestjs/common';
import { WebhookReceiverService } from '../services/webhook-receiver.service';
import { WebhookEventDto } from '../dto/webhook-event.dto';

@Controller('webhook')
export class WebhookReceiverController {
  private readonly logger = new Logger(WebhookReceiverController.name);

  constructor(private webhookReceiverService: WebhookReceiverService) {}

  @Post()
  @HttpCode(200)
  async receiveWebhook(@Body() event: WebhookEventDto) {
    this.logger.log(`Received webhook event: ${event.id}`);
    await this.webhookReceiverService.processWebhookEvent(event);
    return { message: 'Webhook received successfully' };
  }
}
