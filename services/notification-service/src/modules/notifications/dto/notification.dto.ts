import {
  IsString, IsEnum, IsOptional, IsUUID, IsObject, IsNumber, Max, Min,
  IsDateString,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DEVICE_PLATFORM, DevicePlatform, NOTIFICATION_CHANNELS, NOTIFICATION_TYPES, NotificationChannel, NotificationPriority, NotificationType } from '@exchange/common';

export class SendNotificationDto {
  @ApiProperty({ description: 'User ID to send notification to' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: NOTIFICATION_TYPES })
  @IsEnum(NOTIFICATION_TYPES)
  type: NotificationType;

  @ApiPropertyOptional({ enum: NOTIFICATION_CHANNELS, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(NOTIFICATION_CHANNELS, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class BulkNotificationDto {
  @ApiProperty({ type: [String] })
  @IsUUID(undefined, { each: true })
  userIds!: string[];

  @ApiProperty({ enum: NOTIFICATION_CHANNELS })
  @IsEnum(NOTIFICATION_CHANNELS)
  channel!: NotificationChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty()
  @IsString()
  content!: string;

  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3)
  priority?: NotificationPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}

export class NotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: NOTIFICATION_CHANNELS })
  channel!: NotificationChannel;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  subject?: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  priority!: number;

  @ApiPropertyOptional()
  readAt?: Date;

  @ApiPropertyOptional()
  sentAt?: Date;

  @ApiProperty()
  createdAt!: Date;
}

export class RegisterPushTokenDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ enum: DEVICE_PLATFORM })
  @IsEnum(DEVICE_PLATFORM)
  platform: DevicePlatform;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

