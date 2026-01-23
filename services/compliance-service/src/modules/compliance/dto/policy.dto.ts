import { IsEnum, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PolicyType } from '../entities/policy-acceptance.entity';

export class AcceptPolicyDto {
  @ApiProperty({ description: 'Policy type', enum: PolicyType })
  @IsEnum(PolicyType)
  policyType!: PolicyType;

  @ApiProperty({ description: 'Policy version' })
  @IsString()
  policyVersion!: string;

  @ApiProperty({ description: 'Acceptance confirmation' })
  @IsBoolean()
  accepted!: boolean;
}

export class PolicyAcceptanceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: PolicyType })
  policyType!: PolicyType;

  @ApiProperty()
  policyVersion!: string;

  @ApiProperty()
  accepted!: boolean;

  @ApiProperty()
  createdAt!: Date;
}

export class GetPolicyDto {
  @ApiProperty({ description: 'Policy type', enum: PolicyType })
  @IsEnum(PolicyType)
  policyType!: PolicyType;
}

export class PolicyResponseDto {
  @ApiProperty({ enum: PolicyType })
  type!: PolicyType;

  @ApiProperty()
  version!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  effectiveDate!: Date;

  @ApiProperty()
  lastUpdated!: Date;
}
