import { Controller, Post, Get, Body, Param, Patch, Req, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { KycService } from './kyc.service';
import { SubmitKycDto, ReviewKycDto } from './dto/kyc.dto';

@ApiTags('KYC')
@Controller('kyc')
@ApiBearerAuth()
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('submit')
  @ApiOperation({ summary: 'Submit KYC request' })
  async submit(@Req() req: Request, @Body() dto: SubmitKycDto) {
    const userId = (req as any).user?.userId || 'test-user-id';
    return this.kycService.submit(userId, dto);
  }

  @Post('documents')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload KYC documents' })
  async uploadDocuments(@Req() req: Request, @UploadedFiles() files: Array<Express.Multer.File>) {
    // In a real implementation this would upload to S3/Azure Blob
    // For MVP we just return success
    return { 
      message: 'Documents uploaded successfully', 
      count: files?.length || 0,
      files: files?.map(f => f.originalname) 
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get my KYC status' })
  async getStatus(@Req() req: Request) {
    const userId = (req as any).user?.userId || 'test-user-id';
    return this.kycService.getStatus(userId);
  }

  @Patch(':id/review')
  @ApiOperation({ summary: 'Review KYC request (Admin)' })
  async review(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ReviewKycDto,
  ) {
    const adminId = (req as any).user?.userId || 'admin-user-id';
    return this.kycService.review(adminId, id, dto);
  }
}
