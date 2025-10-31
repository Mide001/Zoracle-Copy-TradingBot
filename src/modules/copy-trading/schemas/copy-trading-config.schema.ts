import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'copy_trading_config' })
export class CopyTradingConfig extends Document {
  @Prop({ required: true })
  configId: string;

  @Prop({ required: true })
  accountName: string;

  @Prop({ required: true, lowercase: true, index: true })
  walletAddress: string;

  @Prop({ required: true })
  delegationAmount: string;

  @Prop({ required: true })
  maxSlippage: string;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ required: true, default: '0' })
  spentAmount: string;

  @Prop({ required: true, default: '0' })
  remainingAmount: string;

  @Prop({ required: true })
  telegramId: string;

  @Prop({ required: true })
  createdAt: number;

  @Prop()
  updatedAt: Date;
}

export const CopyTradingConfigSchema =
  SchemaFactory.createForClass(CopyTradingConfig);

