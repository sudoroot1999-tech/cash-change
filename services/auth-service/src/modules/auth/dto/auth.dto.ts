import { IsEmail, IsString, MinLength, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecureP@ss123' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ example: '123456', description: '2FA code if enabled' })
  @IsOptional()
  @IsString()
  @MaxLength(6)
  twoFactorCode?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class Enable2FADto {
  @ApiProperty({ example: '123456', description: 'TOTP code from authenticator app' })
  @IsString()
  @MaxLength(6)
  code: string;
}

export class Verify2FADto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @MaxLength(6)
  code: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class TokenResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresIn: number;

  @ApiProperty()
  tokenType: string;
}

export class TwoFactorSetupDto {
  @ApiProperty()
  secret: string;

  @ApiProperty()
  qrCode: string;
}
