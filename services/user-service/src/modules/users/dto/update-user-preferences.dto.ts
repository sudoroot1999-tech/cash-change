import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({ description: 'Language preference', example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @ApiPropertyOptional({ description: 'Currency preference', example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ description: 'Timezone', example: 'UTC' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ description: 'Email notifications enabled' })
  @IsOptional()
  @IsBoolean()
  notificationEmail?: boolean;

  @ApiPropertyOptional({ description: 'SMS notifications enabled' })
  @IsOptional()
  @IsBoolean()
  notificationSms?: boolean;

  @ApiPropertyOptional({ description: 'Push notifications enabled' })
  @IsOptional()
  @IsBoolean()
  notificationPush?: boolean;

  @ApiPropertyOptional({ description: 'Trading alerts enabled' })
  @IsOptional()
  @IsBoolean()
  notificationTradingAlerts?: boolean;

  @ApiPropertyOptional({ description: 'Price alerts enabled' })
  @IsOptional()
  @IsBoolean()
  notificationPriceAlerts?: boolean;

  @ApiPropertyOptional({ description: 'Newsletter subscription enabled' })
  @IsOptional()
  @IsBoolean()
  notificationNewsletters?: boolean;

  @ApiPropertyOptional({ description: 'Trading confirmations enabled' })
  @IsOptional()
  @IsBoolean()
  tradingConfirmations?: boolean;

  @ApiPropertyOptional({ description: 'Auto-compound enabled' })
  @IsOptional()
  @IsBoolean()
  tradingAutoCompound?: boolean;

  @ApiPropertyOptional({ description: 'Default order type', example: 'LIMIT' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  tradingDefaultOrderType?: string;
}