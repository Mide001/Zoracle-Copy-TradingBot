import { Controller, Post, Body, Logger, HttpCode, BadRequestException, UsePipes } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { WebhookReceiverService } from '../services/webhook-receiver.service';
import { WebhookEventDto } from '../dto/webhook-event.dto';

@Controller('webhook')
export class WebhookReceiverController {
  private readonly logger = new Logger(WebhookReceiverController.name);

  constructor(private webhookReceiverService: WebhookReceiverService) {}

  @Post()
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ skipMissingProperties: true, whitelist: false, forbidNonWhitelisted: false }))
  async receiveWebhook(@Body() event: any) {
    try {
      // Validate basic structure before processing
      if (!event || !event.id) {
        this.logger.warn('Invalid webhook: missing id field');
        throw new BadRequestException('Invalid webhook payload: missing required field "id"');
      }

      if (!event.event || !event.event.network) {
        this.logger.warn('Invalid webhook: missing event.network field');
        throw new BadRequestException('Invalid webhook payload: missing required field "event.network"');
      }

      // Log webhook details for debugging
      this.logger.debug(`Webhook structure: id=${event.id}, type=${event.type}, network=${event.event?.network}, activities=${event.event?.activity?.length || 0}`);
      
      this.logger.log(`Received webhook event: ${event.id}`);
      await this.webhookReceiverService.processWebhookEvent(event as WebhookEventDto);
      return { message: 'Webhook received successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        this.logger.error(`Webhook validation error: ${error.message}`);
        throw error;
      }
      this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
      // Log the payload for debugging (truncate if too large)
      const payloadPreview = JSON.stringify(event).substring(0, 500);
      this.logger.debug(`Webhook payload preview: ${payloadPreview}`);
      // Don't return 400 for processing errors, return 200 to acknowledge receipt
      // Alchemy will retry if we return error status codes
      return { message: 'Webhook received but processing failed', error: error.message };
    }
  }
}
