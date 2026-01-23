import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { KycService } from './kyc.service';
import {
  SubmitKycDocumentsDto,
  ReviewKycDto,
  KycStatusResponseDto,
  UploadDocumentResponseDto,
  SubmitLivenessDto,
  SubmitVideoVerificationDto,
} from './dto/kyc.dto';
import { CurrentUser, DOCUMENT_TYPE, DocumentType, ReqContext, RequestContext, RequireAuth } from '@exchange/common';

@ApiTags('kyc')
@ApiBearerAuth()
@RequireAuth()
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) { }

  @Get('status')
  @ApiOperation({ summary: 'Get KYC status for current user' })
  @ApiResponse({
    status: 200,
    description: 'KYC status retrieved successfully',
    type: KycStatusResponseDto,
  })
  async getKycStatus(@CurrentUser() user) {
    const userId = user.id;

    const status = await this.kycService.getKycStatus(userId);
    return {
      success: true,
      data: status,
    };
  }

  @Post('submit-documents')
  @ApiOperation({ summary: 'Submit KYC documents for verification' })
  @ApiResponse({
    status: 201,
    description: 'KYC submission created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Already has pending or approved KYC' })
  async submitKycDocuments(
    @CurrentUser() user,
    @ReqContext() ctx: RequestContext,
    @Body() submitDto: SubmitKycDocumentsDto,
  ) {
    const userId = user.id;
    const ipAddress = ctx.ipAddress;
    const userAgent = ctx.userAgent;

    const verification = await this.kycService.submitKycDocuments(
      userId,
      submitDto,
      ipAddress,
      userAgent,
    );

    return {
      success: true,
      message: 'KYC submission created successfully',
      data: {
        verificationRequestId: verification.id,
        status: verification.status,
        requestedLevel: verification.requestedLevel,
      },
    };
  }

  @Post('upload-document/:verificationRequestId')
  @ApiOperation({ summary: 'Upload a document for KYC verification' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        documentType: {
          type: 'string',
          enum: Object.values(DOCUMENT_TYPE),
        },
        side: {
          type: 'string',
          enum: ['front', 'back'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Document uploaded successfully',
    type: UploadDocumentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file or parameters' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @CurrentUser() user,
    @ReqContext() ctx: RequestContext,
    @Param('verificationRequestId') verificationRequestId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('documentType') documentType: DocumentType,
    @Body('side') side: 'front' | 'back',
  ) {
    const userId = user.id;
    const ipAddress = ctx.ipAddress;
    const userAgent = ctx.userAgent;

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!documentType) {
      throw new BadRequestException('Document type is required');
    }

    if (!side || !['front', 'back'].includes(side)) {
      throw new BadRequestException('Side must be either "front" or "back"');
    }

    const document = await this.kycService.uploadDocument(
      userId,
      verificationRequestId,
      file,
      file.mimetype,
      documentType,
      side,
      ipAddress,
      userAgent,
    );

    return {
      success: true,
      message: 'Document uploaded successfully',
      data: {
        documentId: document.id,
        documentType: document.documentType,
      },
    };
  }

  @Post('upload-selfie/:verificationRequestId')
  @ApiOperation({ summary: 'Upload a selfie for KYC verification' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Selfie uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadSelfie(
    @CurrentUser() user,
    @ReqContext() ctx: RequestContext,
    @Param('verificationRequestId') verificationRequestId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = user.id;
    const ipAddress = ctx.ipAddress;
    const userAgent = ctx.userAgent;

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    await this.kycService.uploadSelfie(
      userId,
      verificationRequestId,
      file,
      file.mimetype,
      ipAddress,
      userAgent,
    );

    return {
      success: true,
      message: 'Selfie uploaded successfully',
    };
  }

  @Post('upload-video/:verificationRequestId')
  @ApiOperation({
    summary: 'Upload a video for Level 3 KYC verification',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Video uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @Param('verificationRequestId') verificationRequestId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user,
    @ReqContext() ctx: RequestContext
  ) {

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    await this.kycService.uploadVideo(
      user.id,
      verificationRequestId,
      file,
      file.mimetype,
      ctx.ipAddress,
      ctx.userAgent,
    );

    return {
      success: true,
      message: 'Video uploaded successfully',
    };
  }

  @Get('verification/:verificationRequestId')
  @ApiOperation({ summary: 'Get verification request details' })
  @ApiResponse({
    status: 200,
    description: 'Verification request retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Verification request not found' })
  async getVerificationRequest(
    @Req() req: any,
    @Param('verificationRequestId') verificationRequestId: string,
  ) {
    const userId = req.user.userId;

    const result = await this.kycService.getVerificationRequest(
      verificationRequestId,
      userId,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Get('verification-status/:verificationRequestId')
  @ApiOperation({ summary: 'Get verification status' })
  @ApiResponse({
    status: 200,
    description: 'Verification status retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Verification request not found' })
  async getVerificationStatus(
    @Req() req: any,
    @Param('verificationRequestId') verificationRequestId: string,
  ) {
    const userId = req.user.userId;

    const result = await this.kycService.getVerificationRequest(
      verificationRequestId,
      userId,
    );

    return {
      success: true,
      data: {
        status: result.verification.status,
        requestedLevel: result.verification.requestedLevel,
        submittedAt: result.verification.submittedAt,
        reviewedAt: result.verification.reviewedAt,
        rejectionReason: result.verification.rejectionReason,
      },
    };
  }

  // Admin endpoints
  @Put('review')
  @ApiOperation({ summary: 'Review KYC verification (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'KYC verification reviewed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Verification request not found' })
  async reviewKyc(
    @CurrentUser() user,
    @ReqContext() ctx: RequestContext,
    @Body() reviewDto: ReviewKycDto) {
    const reviewerId = user.id;
    const ipAddress = ctx.ipAddress;
    const userAgent = ctx.userAgent;

    const verification = await this.kycService.reviewKyc(
      reviewDto,
      reviewerId,
      ipAddress,
      userAgent,
    );

    return {
      success: true,
      message: 'KYC verification reviewed successfully',
      data: {
        verificationRequestId: verification.id,
        status: verification.status,
        reviewedBy: verification.reviewedBy,
        reviewedAt: verification.reviewedAt,
      },
    };
  }

  @Get('admin/pending')
  @ApiOperation({ summary: 'Get all pending KYC verifications (Admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Pending verifications retrieved successfully',
  })
  async getPendingVerifications(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const result = await this.kycService.getPendingVerifications(
      limit || 50,
      offset || 0,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Get('admin/user/:userId')
  @ApiOperation({
    summary: 'Get KYC status for specific user (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'User KYC status retrieved successfully',
  })
  async getUserKycStatusAdmin(@Param('userId') userId: string) {
    const status = await this.kycService.getKycStatus(userId);
    return {
      success: true,
      data: status,
    };
  }

  @Get('admin/verification/:verificationRequestId')
  @ApiOperation({
    summary: 'Get verification request details (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification request retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Verification request not found' })
  async getVerificationRequestAdmin(
    @Param('verificationRequestId') verificationRequestId: string,
  ) {
    const result = await this.kycService.getVerificationRequest(
      verificationRequestId,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('screen/pep')
  @ApiOperation({ summary: 'Screen for Politically Exposed Persons' })
  async screenPEP(
    @Body() body: { fullName: string; dateOfBirth: string; nationality: string },
    @CurrentUser() user
  ) {
    const userId = user?.id || 'test-user-id';
    const result = await this.kycService.screenPEP(
      userId,
      body.fullName,
      body.dateOfBirth,
      body.nationality,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('screen/sanctions')
  @ApiOperation({ summary: 'Check sanctions lists (OFAC, UN, EU)' })
  async checkSanctions(
    @Body() body: { fullName: string; nationality: string },
    @CurrentUser() user
  ) {
    const userId = user?.id || 'test-user-id';
    const result = await this.kycService.checkSanctionsList(
      userId,
      body.fullName,
      body.nationality,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('screen/adverse-media')
  @ApiOperation({ summary: 'Screen adverse media' })
  async screenAdverseMedia(@Body() body: { fullName: string }, @CurrentUser() user) {
    const userId = user?.id || 'test-user-id';
    const result = await this.kycService.screenAdverseMedia(userId, body.fullName);

    return {
      success: true,
      data: result,
    };
  }

  @Get('compliance-checks')
  @ApiOperation({ summary: 'Get all compliance checks for user' })
  async getComplianceChecks(@CurrentUser() user) {
    const userId = user?.id || 'test-user-id';
    const checks = await this.kycService.getUserComplianceChecks(userId);

    return {
      success: true,
      data: checks,
    };
  }
}
