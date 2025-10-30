import {
  IsString,
  IsArray,
  IsObject,
  ValidateNested,
  IsNumber,
  IsOptional,
  isString,
} from 'class-validator';
import { Type } from 'class-transformer';

class RawContractDto {
  @IsString()
  rawValue: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsNumber()
  decimals: number;
}

class LogDto {
  @IsString()
  address: string;

  @IsArray()
  topics: string[];

  @IsString()
  data: string;

  @IsString()
  blockHash: string;

  @IsString()
  blockNumber: string;

  @IsString()
  blockTimestamp: string;

  @IsString()
  transactionHash: string;

  @IsString()
  transactionIndex: string;

  @IsString()
  logIndex: string;

  @IsOptional()
  removed?: boolean;
}

class ActivityDto {
  @IsString()
  fromAddress: string;

  @IsString()
  toAddress: string;

  @IsString()
  blockNum: string;

  @IsString()
  hash: string;

  @IsNumber()
  value: number;

  @IsString()
  asset: string;

  @IsString()
  category: string;

  @ValidateNested()
  @Type(() => RawContractDto)
  rawContract: RawContractDto;

  @IsString()
  blockTimestamp: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LogDto)
  log?: LogDto;
}

class EventDto {
  @IsString()
  network: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityDto)
  activity: ActivityDto[];

  @IsString()
  source: string;
}

export class WebhookEventDto {
  @IsString()
  webhookId: string;

  @IsString()
  id: string;

  @IsString()
  createdAt: string;

  @IsString()
  type: string;

  @ValidateNested()
  @Type(() => EventDto)
  event: EventDto;
}
