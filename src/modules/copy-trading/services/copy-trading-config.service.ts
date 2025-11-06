import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CopyTradingConfigRepository } from '../repositories/copy-trading-config.repository';
import { CopyTradingConfig } from '../schemas/copy-trading-config.schema';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class CopyTradingConfigService implements OnModuleInit {
  private readonly logger = new Logger(CopyTradingConfigService.name);
  private readonly CACHE_TTL = 3600; // 1 hour TTL for config cache
  private readonly CACHE_PREFIX = 'copy-trading:configs:wallet:';
  private readonly ALL_CONFIGS_KEY = 'copy-trading:configs:all';

  constructor(
    private configRepository: CopyTradingConfigRepository,
    private redisService: RedisService,
  ) {}

  async onModuleInit() {
    // Warm up cache on startup
    await this.warmCache();
    this.logger.log('Copy trading config cache warmed up');
  }

  /**
   * Find active configs by wallet address - uses Redis cache for fast lookups
   */
  async findActiveConfigsByWallet(
    walletAddress: string,
  ): Promise<CopyTradingConfig[]> {
    const normalizedAddress = walletAddress.toLowerCase();
    const cacheKey = `${this.CACHE_PREFIX}${normalizedAddress}`;

    try {
      // Try Redis cache first
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        const configs = JSON.parse(cached) as CopyTradingConfig[];
        this.logger.debug(
          `Cache HIT for wallet ${normalizedAddress}: ${configs.length} configs`,
        );
        return configs;
      }

      // Cache miss - query MongoDB
      this.logger.debug(`Cache MISS for wallet ${normalizedAddress}, querying MongoDB`);
      const configs = await this.configRepository.findByWalletAddress(
        normalizedAddress,
      );

      // Cache the result
      await this.redisService.set(
        cacheKey,
        JSON.stringify(configs),
        this.CACHE_TTL,
      );

      return configs;
    } catch (error) {
      this.logger.error(
        `Error in findActiveConfigsByWallet: ${error.message}. Falling back to MongoDB`,
      );
      // Fallback to MongoDB on error
      return this.configRepository.findByWalletAddress(normalizedAddress);
    }
  }

  async findConfigById(configId: string): Promise<CopyTradingConfig | null> {
    return this.configRepository.findById(configId);
  }

  async getAllActiveConfigs(): Promise<CopyTradingConfig[]> {
    try {
      // Try Redis cache first
      const cached = await this.redisService.get(this.ALL_CONFIGS_KEY);
      if (cached) {
        const configs = JSON.parse(cached) as CopyTradingConfig[];
        this.logger.debug(`Cache HIT for all active configs: ${configs.length} configs`);
        return configs;
      }

      // Cache miss - query MongoDB
      this.logger.debug('Cache MISS for all active configs, querying MongoDB');
      const configs = await this.configRepository.findAllActive();

      // Cache the result
      await this.redisService.set(
        this.ALL_CONFIGS_KEY,
        JSON.stringify(configs),
        this.CACHE_TTL,
      );

      return configs;
    } catch (error) {
      this.logger.error(
        `Error in getAllActiveConfigs: ${error.message}. Falling back to MongoDB`,
      );
      // Fallback to MongoDB on error
      return this.configRepository.findAllActive();
    }
  }

  /**
   * Warm up the cache by loading all active configs and indexing by wallet
   */
  async warmCache(): Promise<void> {
    try {
      this.logger.log('Warming up copy trading config cache...');
      const allConfigs = await this.configRepository.findAllActive();

      // Group configs by wallet address
      const configsByWallet = new Map<string, CopyTradingConfig[]>();
      for (const config of allConfigs) {
        const wallet = config.walletAddress.toLowerCase();
        if (!configsByWallet.has(wallet)) {
          configsByWallet.set(wallet, []);
        }
        configsByWallet.get(wallet)!.push(config);
      }

      // Cache each wallet's configs
      const cachePromises: Promise<void>[] = [];
      for (const [wallet, configs] of configsByWallet.entries()) {
        const cacheKey = `${this.CACHE_PREFIX}${wallet}`;
        cachePromises.push(
          this.redisService.set(
            cacheKey,
            JSON.stringify(configs),
            this.CACHE_TTL,
          ),
        );
      }

      // Cache all configs
      cachePromises.push(
        this.redisService.set(
          this.ALL_CONFIGS_KEY,
          JSON.stringify(allConfigs),
          this.CACHE_TTL,
        ),
      );

      await Promise.all(cachePromises);

      this.logger.log(
        `Cache warmed up: ${allConfigs.length} configs for ${configsByWallet.size} wallets`,
      );
    } catch (error) {
      this.logger.error(`Error warming cache: ${error.message}`);
    }
  }

  /**
   * Invalidate cache for a specific wallet (call this when configs change)
   */
  async invalidateWalletCache(walletAddress: string): Promise<void> {
    const normalizedAddress = walletAddress.toLowerCase();
    const cacheKey = `${this.CACHE_PREFIX}${normalizedAddress}`;
    await this.redisService.del(cacheKey);
    await this.redisService.del(this.ALL_CONFIGS_KEY);
    this.logger.debug(`Cache invalidated for wallet ${normalizedAddress}`);
  }

  /**
   * Invalidate all config caches (call this when any config changes)
   */
  async invalidateAllCache(): Promise<void> {
    // Get all wallet cache keys and delete them
    // Note: This is a simple approach. For production, consider using Redis SCAN
    // or maintaining a set of wallet addresses
    await this.redisService.del(this.ALL_CONFIGS_KEY);
    this.logger.debug('All config caches invalidated');
  }
}

