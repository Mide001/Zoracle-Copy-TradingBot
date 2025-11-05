import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { TradeNotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly telegramBotApiUrl: string | null;

  constructor(private configService: ConfigService) {
    const apiUrl = this.configService.get<string>(
      'notifications.telegramBotApiUrl',
    );
    this.telegramBotApiUrl = apiUrl || null;
    
    if (this.telegramBotApiUrl) {
      this.logger.log(`Telegram bot API URL configured: ${this.telegramBotApiUrl}`);
    } else {
      this.logger.warn('Telegram bot API URL not configured - notifications will be skipped');
      // Debug: Check raw env var
      const rawEnv = process.env.TELEGRAM_BOT_API_URL;
      if (rawEnv) {
        this.logger.debug(`Found TELEGRAM_BOT_API_URL in process.env: ${rawEnv}`);
      }
    }
  }

  /**
   * Send trade notification to user via main Telegram bot
   */
  async sendTradeNotification(dto: TradeNotificationDto): Promise<void> {
    if (!this.telegramBotApiUrl) {
      this.logger.warn(
        'Telegram bot API URL not configured, skipping notification',
      );
      return;
    }

    try {
      this.logger.log(
        `Sending trade notification to Telegram ID ${dto.telegramId} for ${dto.tradeType} ${dto.tokenSymbol}`,
      );

      const url = `${this.telegramBotApiUrl}/api/notifications/trade`;
      this.logger.debug(`Sending notification to: ${url}`);
      this.logger.debug(`Notification payload: ${JSON.stringify(dto)}`);

      const response = await axios.post(url, dto, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      if (response.data.success) {
        this.logger.log(
          `Trade notification sent successfully to Telegram ID ${dto.telegramId}`,
        );
      } else {
        this.logger.warn(
          `Notification API returned unsuccessful response: ${response.data.message || 'Unknown error'}`,
        );
        this.logger.debug(`Response data: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        // Log but don't throw - notification failures shouldn't break trade execution
        this.logger.error(
          `Failed to send trade notification: ${axiosError.message}`,
        );
        if (axiosError.response) {
          this.logger.error(
            `Notification API error response: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`,
          );
        }
        if (axiosError.request) {
          this.logger.error(
            `Notification API request failed: ${axiosError.request.url || 'No URL'} - ${axiosError.code || 'No error code'}`,
          );
        }
      } else {
        this.logger.error(
          `Unexpected error sending notification: ${error.message}`,
        );
      }
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Send a generic alert/info notification to user
   */
  async sendAlertNotification(params: {
    telegramId: string;
    configId: string;
    accountName: string;
    message: string;
  }): Promise<void> {
    if (!this.telegramBotApiUrl) {
      this.logger.warn('Telegram bot API URL not configured, skipping alert');
      return;
    }

    try {
      const url = `${this.telegramBotApiUrl}/api/notifications/alert`;
      this.logger.log(
        `Sending alert notification to Telegram ID ${params.telegramId}: ${params.message}`,
      );
      await axios.post(
        url,
        {
          telegramId: params.telegramId,
          configId: params.configId,
          accountName: params.accountName,
          message: params.message,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        },
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        this.logger.error(
          `Failed to send alert notification: ${axiosError.message}`,
        );
      } else {
        this.logger.error(
          `Unexpected error sending alert notification: ${error.message}`,
        );
      }
    }
  }
}

