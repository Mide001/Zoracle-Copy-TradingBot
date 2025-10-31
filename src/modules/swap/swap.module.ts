import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SwapService } from './swap.service';

@Module({
  imports: [ConfigModule],
  providers: [SwapService],
  exports: [SwapService],
})
export class SwapModule {}

