import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CopyTradingConfig,
  CopyTradingConfigSchema,
} from './schemas/copy-trading-config.schema';
import { CopyTradingConfigRepository } from './repositories/copy-trading-config.repository';
import { CopyTradingConfigService } from './services/copy-trading-config.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CopyTradingConfig.name, schema: CopyTradingConfigSchema },
    ]),
  ],
  providers: [CopyTradingConfigRepository, CopyTradingConfigService],
  exports: [CopyTradingConfigService],
})
export class CopyTradingModule {}

