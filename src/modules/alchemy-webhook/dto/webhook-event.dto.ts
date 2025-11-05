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
  @IsOptional()
  @IsString()
  rawValue?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  decimals?: number;
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

  @IsOptional()
  @ValidateNested()
  @Type(() => RawContractDto)
  rawContract?: RawContractDto;

  @IsOptional()
  @IsString()
  blockTimestamp?: string;

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

  @IsOptional()
  @IsString()
  source?: string;
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
