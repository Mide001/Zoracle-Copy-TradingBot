import { Injectable, Logger } from '@nestjs/common';
import { MonitoringService } from '../../monitoring/services/monitoring.service';
import { AlchemyApiService } from './alchemy-api.service';

@Injectable()
export class WebhookManagerService {
  private readonly logger = new Logger(WebhookManagerService.name);

  constructor(
    private monitoringService: MonitoringService,
    private alchemyApiService: AlchemyApiService,
  ) {}

  async addAddresses(
    addresses: string[],
  ): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    // Step 1: Add to MongoDB
    for (const address of addresses) {
      try {
        await this.monitoringService.addAddress(address);
        success.push(address);
      } catch (error) {
        this.logger.error(
          `Failed to add address ${address} to MongoDB: ${error.message}`,
        );
        failed.push(address);
      }
    }

    // Step 2: Add to Alchemy webhook (only successful ones)
    if (success.length > 0) {
      try {
        await this.alchemyApiService.addAddressesToWebhook(success);
        this.logger.log(
          `Successfully synced ${success.length} addresses to Alchemy webhook`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to sync addresses to Alchemy: ${error.message}`,
        );
        // Rollback: remove from MongoDB
        for (const address of success) {
          try {
            await this.monitoringService.removeAddress(address);
          } catch (rollbackError) {
            this.logger.error(
              `Rollback failed for ${address}: ${rollbackError.message}`,
            );
          }
        }
        throw error;
      }
    }

    return { success, failed };
  }

  async removeAddresses(addresses: string[]): Promise<{ success: string[] }> {
    const success: string[] = [];

    // Step 1: Remove from Alchemy webhook first
    try {
      await this.alchemyApiService.removeAddressesFromWebhook(addresses);
    } catch (error) {
      this.logger.error(
        `Failed to remove addresses from Alchemy: ${error.message}`,
      );
      throw error;
    }

    // Step 2: Remove from MongoDB
    for (const address of addresses) {
      try {
        await this.monitoringService.removeAddress(address);
        success.push(address);
      } catch (error) {
        this.logger.error(
          `Failed to remove address ${address} from MongoDB: ${error.message}`,
        );
      }
    }

    return { success };
  }

  async syncDatabaseToWebhook(): Promise<{ synced: number }> {
    const allAddresses = await this.monitoringService.getAllAddresses();

    if (allAddresses.length === 0) {
      this.logger.log('No addresses to sync');
      return { synced: 0 };
    }

    // Get current webhook details
    const webhookDetails = await this.alchemyApiService.getWebhookDetails();
    const currentAddresses = webhookDetails.data?.addresses || [];

    // Find differences
    const toAdd = allAddresses.filter(
      (addr) => !currentAddresses.includes(addr.toLowerCase()),
    );
    const toRemove = currentAddresses.filter(
      (addr) => !allAddresses.includes(addr.toLowerCase()),
    );

    if (toAdd.length > 0) {
      await this.alchemyApiService.addAddressesToWebhook(toAdd);
      this.logger.log(`Synced ${toAdd.length} new addresses to webhook`);
    }

    if (toRemove.length > 0) {
      await this.alchemyApiService.removeAddressesFromWebhook(toRemove);
      this.logger.log(
        `Removed ${toRemove.length} stale addresses from webhook`,
      );
    }

    return { synced: toAdd.length + toRemove.length };
  }
}
