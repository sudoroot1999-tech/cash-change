import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  Min,
  IsUUID,
  IsNotEmpty,
  IsPositive,
} from 'class-validator';
import { WalletType } from '../entities/wallet.entity';

export class CreateWalletDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ enum: WalletType, required: false })
  @IsEnum(WalletType)
  @IsOptional()
  type?: WalletType;
}

export class GetBalanceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  currency?: string;
}

export class GenerateAddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  label?: string;
}

export class WithdrawDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  toAddress: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  twoFactorCode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class InternalTransferDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fromUserId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  toUserId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class ApproveWithdrawalDto {
  @ApiProperty()
  @IsUUID()
  withdrawalRequestId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  approverId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class RejectWithdrawalDto {
  @ApiProperty()
  @IsUUID()
  withdrawalRequestId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  rejectedBy: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class AddToWhitelistDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  label?: string;
}

export class GetTransactionsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ required: false })
  @IsEnum(['DEPOSIT', 'WITHDRAWAL', 'INTERNAL_TRANSFER', 'TRADE', 'FEE'])
  @IsOptional()
  type?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;
}
