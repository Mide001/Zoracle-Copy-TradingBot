import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import {
  CopyTradingConfig,
  CopyTradingConfigSchema,
} from '../schemas/copy-trading-config.schema';

@Injectable()
export class CopyTradingConfigRepository {
  constructor(
    @InjectModel(CopyTradingConfig.name)
    private configModel: Model<CopyTradingConfig>,
  ) {}

  async findByWalletAddress(
    walletAddress: string,
  ): Promise<CopyTradingConfig[]> {
    return this.configModel
      .find({
        walletAddress: walletAddress.toLowerCase(),
        isActive: true,
      })
      .exec();
  }

  async findById(configId: string): Promise<CopyTradingConfig | null> {
    return this.configModel.findOne({ configId }).exec();
  }

  async findAllActive(): Promise<CopyTradingConfig[]> {
    return this.configModel.find({ isActive: true }).exec();
  }
}

