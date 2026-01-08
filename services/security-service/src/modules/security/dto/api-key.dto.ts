import { IsString, IsArray, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { API_KEY_PERMISSIONS, ApiKeyPermission } from '@exchange/common';

export class CreateApiKeyDto {
  @IsString()
  keyName: string;

  @IsArray()
  @IsEnum(API_KEY_PERMISSIONS, { each: true })
  permissions: ApiKeyPermission[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipWhitelist?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  expiresInDays?: number;
}

export class UpdateApiKeyPermissionsDto {
  @IsArray()
  @IsEnum(API_KEY_PERMISSIONS, { each: true })
  permissions: ApiKeyPermission[];
}

export class UpdateIpWhitelistDto {
  @IsArray()
  @IsString({ each: true })
  ipWhitelist: string[];
}
