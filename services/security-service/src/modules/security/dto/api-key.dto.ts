import { IsString, IsArray, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiKeyPermission } from '../entities/api-key.entity';

export class CreateApiKeyDto {
  @IsString()
  keyName: string;

  @IsArray()
  @IsEnum(ApiKeyPermission, { each: true })
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
  @IsEnum(ApiKeyPermission, { each: true })
  permissions: ApiKeyPermission[];
}

export class UpdateIpWhitelistDto {
  @IsArray()
  @IsString({ each: true })
  ipWhitelist: string[];
}
