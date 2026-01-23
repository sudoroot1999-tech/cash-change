import { IsEmail, IsString, MinLength, IsOptional, Matches, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecureP@ssw0rd' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  })
  password: string;

  @ApiProperty({ example: 'dsrgt@as' })
  @IsString()
  @MinLength(4)
  username: string;

  @ApiProperty({ example: 'SECURE123', required: false })
  @IsOptional()
  @IsString()
  @MinLength(6)
  antiPhishingCode?: string;

  @ApiProperty({ example: '123456', required: false })
  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecureP@ssw0rd' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'device-fingerprint-hash', required: false })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  trustDevice?: boolean;
}

export class LogoutDto {
  @ApiProperty({ example: 'SecureP@ssw0rd' })
  @IsString()
  sessionId: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  token: string;
}

export class Enable2FADto {
  @ApiProperty()
  @IsString()
  password: string;
}

export class Verify2FADto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  token: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  backupCode?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  })
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  })
  newPassword: string;
}

export class VerifySMSDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  phoneNumber: string;
}

export class WebAuthnRegistrationDto {
  @ApiProperty()
  @IsString()
  deviceName: string;

  @ApiProperty()
  credential: any;
}

export class WebAuthnVerificationDto {
  @ApiProperty()
  credential: any;
}

export class OAuthCallbackDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  state: string;
}
