import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { MonitoringRepository } from '../repositories/monitoring.repository';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(private monitoringRepository: MonitoringRepository) {}

  async addAddress(
    address: string,
    network: string = 'BASE_MAINNET',
  ): Promise<void> {
    const existing = await this.monitoringRepository.findByAddress(address);
    if (existing) {
      throw new ConflictException(
        `Address ${address} is already being monitored`,
      );
    }

    await this.monitoringRepository.create(address, network);
    this.logger.log(`Added address to monitoring: ${address}`);
  }

  async removeAddress(address: string): Promise<void> {
    const deleted = await this.monitoringRepository.delete(address);
    if (!deleted) {
      throw new NotFoundException(
        `Address ${address} not found in monitoring list`,
      );
    }

    this.logger.log(`Removed address from monitoring: ${address}`);
  }

  async getAllAddresses(): Promise<string[]> {
    return this.monitoringRepository.getAllAddresses();
  }

  async isAddressMonitored(address: string): Promise<boolean> {
    const doc = await this.monitoringRepository.findByAddress(address);
    return !!doc;
  }
}
