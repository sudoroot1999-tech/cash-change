import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class AddWhitelistAddressDto {
  @IsString()
  address: string;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  coolingPeriodHours?: number;
}

export class ConfirmWhitelistDto {
  @IsString()
  whitelistId: string;
}
