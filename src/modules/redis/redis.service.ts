import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('redis.uri');
    
    if (!redisUrl) {
      throw new Error(
        'REDIS_URI environment variable is required but not set. Please configure Redis connection in your .env file.',
      );
    }

    this.client = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.log(`Redis retry attempt ${times}, delay ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis client error: ${err.message}`);
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client ready');
    });
  }

  onModuleDestroy() {
    this.client?.disconnect();
    this.logger.log('Redis client disconnected');
  }

  /**
   * Check if an event has been processed (deduplication)
   * @param key Unique identifier for the event (e.g., txHash + network)
   * @param ttlSeconds Time to live in seconds (default: 24 hours)
   * @returns true if already processed, false if new
   */
  async isEventProcessed(
    key: string,
    ttlSeconds: number = 86400,
  ): Promise<boolean> {
    try {
      const redisKey = `webhook:processed:${key}`;
      const exists = await this.client.exists(redisKey);
      
      if (exists) {
        return true; // Already processed
      }

      // Mark as processed with TTL
      await this.client.setex(redisKey, ttlSeconds, '1');
      return false; // New event
    } catch (error) {
      this.logger.error(`Error checking event processing: ${error.message}`);
      // On error, assume not processed to avoid blocking valid events
      return false;
    }
  }

  /**
   * Mark an event as processed
   * @param key Unique identifier
   * @param ttlSeconds Time to live in seconds
   */
  async markEventProcessed(key: string, ttlSeconds: number = 86400): Promise<void> {
    try {
      const redisKey = `webhook:processed:${key}`;
      await this.client.setex(redisKey, ttlSeconds, '1');
    } catch (error) {
      this.logger.error(`Error marking event processed: ${error.message}`);
    }
  }

  /**
   * Get Redis client for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Set a key-value pair with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Error setting Redis key: ${error.message}`);
    }
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Error getting Redis key: ${error.message}`);
      return null;
    }
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Error deleting Redis key: ${error.message}`);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking Redis key existence: ${error.message}`);
      return false;
    }
  }
}

