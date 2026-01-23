import { IsEmail, IsString, MinLength, IsOptional, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecureP@ss123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password!: string;

  @ApiPropertyOptional({ example: 'johndoe', description: 'Unique username' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  phone?: string;

  @ApiPropertyOptional({ example: 'ABCD1234', description: 'Referral code of existing user' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  referralCode?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'johndoe', description: 'Unique username' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  phone?: string;
}

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  username?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  tier!: string;

  @ApiProperty()
  kycLevel!: number;

  @ApiProperty()
  referralCode!: string;

  @ApiProperty()
  twoFactorEnabled!: boolean;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty()
  phoneVerified!: boolean;

  @ApiProperty()
  emailVerificationToken: string;

  @ApiProperty()
  antiPhishingCode: string;

  @ApiProperty()
  lastLoginAt?: Date;

  @ApiProperty()
  lastLoginIp?: string;

  @ApiProperty()
  createdAt!: Date;
}

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  limit?: number;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  token: string;
}