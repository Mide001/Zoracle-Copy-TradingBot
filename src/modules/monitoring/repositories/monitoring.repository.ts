import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { MonitoredAddress } from '../schemas/monitored-address.schema';

@Injectable()
export class MonitoringRepository {
  constructor(
    @InjectModel(MonitoredAddress.name)
    private monitoredAddressModel: Model<MonitoredAddress>,
  ) {}

  async create(
    address: string,
    network: string,
    metadata?: any,
  ): Promise<MonitoredAddress> {
    const doc = new this.monitoredAddressModel({
      address: address.toLowerCase(),
      network,
      metadata: metadata || {},
    });
    return doc.save();
  }

  async findByAddress(address: string): Promise<MonitoredAddress | null> {
    return this.monitoredAddressModel
      .findOne({ address: address.toLowerCase() })
      .exec();
  }

  async findAll(): Promise<MonitoredAddress[]> {
    return this.monitoredAddressModel.find({ status: 'active' }).exec();
  }

  async delete(address: string): Promise<boolean> {
    const result = await this.monitoredAddressModel
      .deleteOne({ address: address.toLowerCase() })
      .exec();
    return result.deletedCount > 0;
  }

  async getAllAddresses(): Promise<string[]> {
    const docs = await this.monitoredAddressModel
      .find({ status: 'active' })
      .select('address')
      .exec();
    return docs.map((doc) => doc.address);
  }
}
