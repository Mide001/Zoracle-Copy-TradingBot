import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MonitoredAddress,
  MonitoredAddressSchema,
} from './schemas/monitored-address.schema';
import { MonitoringService } from './services/monitoring.service';
import { MonitoringRepository } from './repositories/monitoring.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MonitoredAddress.name, schema: MonitoredAddressSchema },
    ]),
  ],
  providers: [MonitoringService, MonitoringRepository],
  exports: [MonitoringService],
})
export class MonitoringModule {}
