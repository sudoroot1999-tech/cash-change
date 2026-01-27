import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  ValidateNested,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CertificateType } from '../../../database/entities/certificate.entity';

@InputType('CertificateIssuerInput')
class CertificateIssuerDto {
  @ApiProperty()
  @Field()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  logo?: string;
}

@InputType('CertificateRecipientInput')
class CertificateRecipientDto {
  @ApiProperty()
  @Field()
  @IsString()
  userId: string;

  @ApiProperty()
  @Field()
  @IsString()
  name: string;

  @ApiProperty()
  @Field()
  @IsEmail()
  email: string;
}

@InputType('CertificateMetadataInput')
class CertificateMetadataDto {
  @ApiProperty()
  @Field()
  @IsString()
  courseTitle: string;

  @ApiProperty()
  @Field(() => Int)
  @IsNumber()
  duration: number;

  @ApiProperty()
  @Field()
  @Type(() => Date)
  completionDate: Date;

  @ApiProperty()
  @Field()
  @IsString()
  instructorName: string;
}

@InputType('IssueCertificateInput')
export class IssueCertificateDto {
  @ApiProperty()
  @Field()
  @IsString()
  userId: string;

  @ApiProperty()
  @Field()
  @IsUUID()
  courseId: string;

  @ApiProperty({ enum: CertificateType })
  @Field(() => String)
  @IsEnum(CertificateType)
  type: CertificateType;

  @ApiProperty()
  @Field()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: CertificateIssuerDto })
  @Field(() => CertificateIssuerDto)
  @ValidateNested()
  @Type(() => CertificateIssuerDto)
  issuer: CertificateIssuerDto;

  @ApiProperty({ type: CertificateRecipientDto })
  @Field(() => CertificateRecipientDto)
  @ValidateNested()
  @Type(() => CertificateRecipientDto)
  recipient: CertificateRecipientDto;

  @ApiPropertyOptional()
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  score?: number;

  @ApiPropertyOptional()
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional({ type: [String] })
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  skills?: string[];

  @ApiProperty({ type: CertificateMetadataDto })
  @Field(() => CertificateMetadataDto)
  @ValidateNested()
  @Type(() => CertificateMetadataDto)
  metadata: CertificateMetadataDto;
}
