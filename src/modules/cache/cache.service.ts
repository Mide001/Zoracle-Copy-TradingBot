import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async wasEventProcessed(eventId: string): Promise<boolean> {
    const key = `event:processed:${eventId}`;
    const result = await this.cacheManager.get(key);
    return !!result;
  }

  async markEventAsProcessed(eventId: string): Promise<void> {
    const key = `event:processed:${eventId}`;
    await this.cacheManager.set(key, true, 3600000);
  }

  async isAddressMonitored(address: string): Promise<boolean> {
    const key = `monitored:${address.toLowerCase()}`;
    const result = await this.cacheManager.get(key);
    return !!result;
  }

  async addMonitoredAddress(address: string, userId: string): Promise<void> {
    const key = `monitored:${address.toLowerCase()}`;
    await this.cacheManager.set(key, userId, 0);
  }

  async removeMonitoredAddress(address: string): Promise<void> {
    const key = `monitored:${address.toLowerCase()}`;
    await this.cacheManager.del(key);
  }

  async cacheUserSettings(userId: string, settings: any): Promise<void> {
    const key = `user:settings:${userId}`;
    await this.cacheManager.set(key, JSON.stringify(settings), 3600000);
  }
  async getUserSettings(userId: string): Promise<any | null> {
    const key = `user:settings:${userId}`;
    const result = await this.cacheManager.get(key);
    return result ? JSON.parse(result as string) : null;
  }

  async rebuildMonitoredCache(
    addresses: Array<{ address: string; userId: string }>,
  ): Promise<void> {
    for (const { address, userId } of addresses) {
      await this.addMonitoredAddress(address, userId);
    }
  }
}
