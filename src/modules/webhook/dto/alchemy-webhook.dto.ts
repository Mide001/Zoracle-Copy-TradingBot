import {
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RawContractDto {
  @IsString()
  rawValue: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsNumber()
  decimals: number;
}

export class LogDto {
  @IsString()
  address: string;

  @IsArray()
  @IsString({ each: true })
  topics: string[];

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

export class ActivityDto {
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

  @IsEnum(['external', 'internal', 'token', 'erc721', 'erc1155'])
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

export class EventDto {
  @IsEnum(['BASE_MAINNET'])
  network: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityDto)
  activity: ActivityDto[];

  @IsString()
  source: string;
}

export class AlchemyWebhookDto {
  @IsString()
  webhookId: string;

  @IsString()
  id: string;

  @IsString()
  createdAt: string;

  @IsEnum(['ADDRESS_ACTIVITY', 'MINED_TRANSACTION', 'DROPPED_TRANSACTION'])
  type: string;

  @ValidateNested()
  @Type(() => EventDto)
  event: EventDto;
}
