import { Injectable, Logger } from '@nestjs/common';
import { CopyTradingConfigRepository } from '../repositories/copy-trading-config.repository';
import { CopyTradingConfig } from '../schemas/copy-trading-config.schema';

@Injectable()
export class CopyTradingConfigService {
  private readonly logger = new Logger(CopyTradingConfigService.name);

  constructor(
    private configRepository: CopyTradingConfigRepository,
  ) {}

  async findActiveConfigsByWallet(
    walletAddress: string,
  ): Promise<CopyTradingConfig[]> {
    return this.configRepository.findByWalletAddress(walletAddress);
  }

  async findConfigById(configId: string): Promise<CopyTradingConfig | null> {
    return this.configRepository.findById(configId);
  }

  async getAllActiveConfigs(): Promise<CopyTradingConfig[]> {
    return this.configRepository.findAllActive();
  }
}

