import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class AlchemyApiService {
  private readonly logger = new Logger(AlchemyApiService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly webhookId: string;

  constructor(private configService: ConfigService) {
    const webhookId = this.configService.get<string>('alchemy.webhookId');
    const authToken = this.configService.get<string>('alchemy.authToken');
    const baseUrl = this.configService.get<string>('alchemy.apiBaseUrl');

    if (!webhookId) {
      throw new Error('Alchemy webhookId not configured');
    }
    if (!authToken) {
      throw new Error('Alchemy authToken not configured');
    }
    if (!baseUrl) {
      throw new Error('Alchemy apiBaseUrl not configured');
    }

    this.webhookId = webhookId;

    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      headers: {
        'X-Alchemy-Token': authToken,
        'Content-Type': 'application/json',
      },
    });
  }

  async addAddressesToWebhook(addresses: string[]): Promise<void> {
    try {
      this.logger.log(
        `Adding ${addresses.length} addresses to webhook ${this.webhookId}`,
      );

      const response = await this.axiosInstance.patch(
        `/update-webhook-addresses`,
        {
          webhook_id: this.webhookId,
          addresses_to_add: addresses,
          addresses_to_remove: [],
        },
      );

      this.logger.log(
        `Successfully added addresses: ${JSON.stringify(response.data)}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add addresses to alchemy webhook: ${error.message}`,
      );
      throw new HttpException(
        `Failed to add addresses to Alchemy webhook: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async removeAddressesFromWebhook(addresses: string[]): Promise<void> {
    try {
      this.logger.log(
        `Removing ${addresses.length} addresses from webhook ${this.webhookId}`,
      );

      const response = await this.axiosInstance.patch(
        `/update-webhook-addresses`,
        {
          webhook_id: this.webhookId,
          addresses_to_add: [],
          addresses_to_remove: addresses,
        },
      );

      this.logger.log(
        `Successfully removed addresses: ${JSON.stringify(response.data)}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to remove addresses from Alchemy webhook: ${error.message}`,
      );
      throw new HttpException(
        `Failed to remove addresses from Alchemy webhook: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getWebhookDetails(): Promise<any> {
    try {
      const response = await this.axiosInstance.get(
        `/webhook/${this.webhookId}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get webhook details: ${error.message}`);
      throw new HttpException(
        `Failed to get webhook details: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
