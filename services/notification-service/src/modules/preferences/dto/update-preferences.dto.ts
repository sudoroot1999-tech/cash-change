import { IsBoolean, IsEnum, IsOptional, IsString, IsArray, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES, NotificationChannel, NotificationType } from '@exchange/common';


export class UpdatePreferencesDto {
  @ApiPropertyOptional({ enum: NOTIFICATION_TYPES })
  @IsOptional()
  @IsEnum(NOTIFICATION_TYPES)
  notificationType?: NotificationType;

  @ApiPropertyOptional({ enum: NOTIFICATION_CHANNELS, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(NOTIFICATION_CHANNELS, { each: true })
  enabledChannels?: NotificationChannel[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telegramChatId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quietHoursEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customPreferences?: Record<string, any>;
}
