import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsISO8601,
  MinLength,
  MaxLength,
  IsArray,
  IsUUID,
} from 'class-validator';
import { DOCUMENT_TYPE, KYC_LEVELS, KYC_STATUS, KycLevel, KycStatus } from '@exchange/common';


export class SubmitKycDocumentsDto {
  @ApiProperty({ description: 'Requested KYC level', enum: KYC_LEVELS })
  @IsEnum(KYC_LEVELS)
  requestedLevel: KycLevel;

  @ApiProperty({ description: 'Document type', enum: DOCUMENT_TYPE })
  @IsEnum(DOCUMENT_TYPE)
  documentType: DocumentType;

  @ApiPropertyOptional({ description: 'Document number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentNumber?: string;

  @ApiProperty({ description: 'First name' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ description: 'Date of birth', type: String, format: 'date' })
  @IsISO8601()
  dateOfBirth: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  @MaxLength(100)
  country: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Document expiry date', type: String, format: 'date' })
  @IsOptional()
  @IsISO8601()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Document issue date', type: String, format: 'date' })
  @IsOptional()
  @IsISO8601()
  issueDate?: string;

  @ApiPropertyOptional({ description: 'Issuing country' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  issuingCountry?: string;
}

export class ReviewKycDto {
  @ApiProperty({ description: 'Verification request ID' })
  @IsUUID()
  verificationRequestId: string;

  @ApiProperty({ description: 'New KYC status', enum: KYC_STATUS })
  @IsEnum(KYC_STATUS)
  status: KycStatus;

  @ApiPropertyOptional({ description: 'Rejection reason' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Reviewer notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UploadDocumentResponseDto {
  @ApiProperty({ description: 'Document ID' })
  documentId: string;

  @ApiProperty({ description: 'Upload URL or confirmation' })
  uploadUrl: string;

  @ApiProperty({ description: 'Success message' })
  message: string;
}

export class KycStatusResponseDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Current KYC level', enum: KYC_LEVELS })
  currentLevel: KycLevel;

  @ApiProperty({ description: 'Current KYC status', enum: KYC_STATUS })
  currentStatus: KycStatus;

  @ApiProperty({ description: 'Can upgrade to next level' })
  canUpgrade: boolean;

  @ApiPropertyOptional({ description: 'Next available level', enum: KYC_LEVELS })
  nextLevel?: KycLevel;

  @ApiPropertyOptional({ description: 'Required documents for next level', type: [String] })
  requiredDocuments?: string[];

  @ApiPropertyOptional({ description: 'Pending verification requests', type: 'array' })
  pendingRequests?: any[];

  @ApiPropertyOptional({ description: 'Completed verification requests', type: 'array' })
  completedRequests?: any[];
}

export class SubmitLivenessDto {
  @ApiProperty({ description: 'Verification request ID' })
  @IsUUID()
  verificationRequestId: string;
}

export class SubmitVideoVerificationDto {
  @ApiProperty({ description: 'Verification request ID' })
  @IsUUID()
  verificationRequestId: string;
}
