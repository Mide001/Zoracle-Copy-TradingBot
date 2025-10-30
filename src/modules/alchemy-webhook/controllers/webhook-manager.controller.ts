import { Controller, Post, Delete, Get, Body, Logger } from '@nestjs/common';
import { WebhookManagerService } from '../services/webhook-manager.service';
import { AddAddressesDto } from '../dto/add-addresses.dto';
import { RemoveAddressesDto } from '../dto/remove-addresses.dto';
import { MonitoringService } from '../../monitoring/services/monitoring.service';

@Controller('webhooks')
export class WebhookManagerController {
  private readonly logger = new Logger(WebhookManagerController.name);

  constructor(
    private webhookManagerService: WebhookManagerService,
    private monitoringService: MonitoringService,
  ) {}

  @Post('addresses')
  async addAddresses(@Body() dto: AddAddressesDto) {
    this.logger.log(`Request to add ${dto.addresses.length} addresses`);
    const result = await this.webhookManagerService.addAddresses(dto.addresses);
    return {
      message: 'Addresses added successfully',
      ...result,
    };
  }

  @Delete('addresses')
  async removeAddresses(@Body() dto: RemoveAddressesDto) {
    this.logger.log(`Request to remove ${dto.addresses.length} addresses`);
    const result = await this.webhookManagerService.removeAddresses(
      dto.addresses,
    );
    return {
      message: 'Addresses removed successfully',
      ...result,
    };
  }

  @Get('addresses')
  async listAddresses() {
    const addresses = await this.monitoringService.getAllAddresses();
    return {
      count: addresses.length,
      addresses,
    };
  }

  @Post('addresses/db')
  async addAddressesToDbOnly(@Body() dto: AddAddressesDto) {
    this.logger.log(
      `DB-only add request for ${dto.addresses.length} addresses`,
    );
    const success: string[] = [];
    const failed: { address: string; error: string }[] = [];
    for (const address of dto.addresses) {
      try {
        await this.monitoringService.addAddress(address);
        success.push(address);
      } catch (e: any) {
        failed.push({ address, error: e.message });
      }
    }
    return { message: 'DB-only add processed', success, failed };
  }

  @Post('sync')
  async syncToWebhook() {
    this.logger.log('Manual sync requested');
    const result = await this.webhookManagerService.syncDatabaseToWebhook();
    return {
      message: 'Sync completed',
      ...result,
    };
  }
}
