import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AdminRole } from '../entities/admin.entity';

export class CreateAdminDto {
  @ApiProperty({ example: 'admin@exchange.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  fullName: string;

  @ApiProperty({ enum: AdminRole, example: AdminRole.SUPPORT_ADMIN })
  @IsEnum(AdminRole)
  role: AdminRole;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  isActive?: boolean;
}

