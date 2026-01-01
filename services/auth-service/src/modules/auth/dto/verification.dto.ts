import { IsEmail, IsString, Length, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VerificationCodeType } from '../entities/verification-code.entity';

export class SendVerificationCodeDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: VerificationCodeType })
  @IsEnum(VerificationCodeType)
  type!: VerificationCodeType;
}

export class VerifyCodeDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: '6-digit verification code' })
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ enum: VerificationCodeType })
  @IsEnum(VerificationCodeType)
  type!: VerificationCodeType;
}

export class LoginWithEmailCodeDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecureP@ss123' })
  @IsString()
  password!: string;

  @ApiProperty({ example: '123456', description: '6-digit email verification code' })
  @IsString()
  @Length(6, 6)
  emailCode!: string;
}

export class VerificationCodeResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ description: 'Code expiration time in minutes' })
  expiresInMinutes!: number;
}