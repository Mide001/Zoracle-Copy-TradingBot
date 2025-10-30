import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class MonitoredAddress extends Document {
  @Prop({ required: true, unique: true, lowercase: true, index: true })
  address: string;

  @Prop({ required: true, default: 'BASE_MAINNET' })
  network: string;

  @Prop({ required: true, default: 'active', enum: ['active', 'paused'] })
  status: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const MonitoredAddressSchema =
  SchemaFactory.createForClass(MonitoredAddress);
