import { Controller, Post, Get, Body, Param, Patch, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { RequireAuth, CurrentUser, AuthenticatedUser } from '@exchange/common';
import { KycService } from './kyc.service';
import { SubmitKycDto, ReviewKycDto } from './dto/kyc.dto';

@ApiTags('KYC')
@Controller('kyc')
@RequireAuth()
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('submit')
  @ApiOperation({ summary: 'Submit KYC request' })
  async submit(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitKycDto) {
    return this.kycService.submit(user.userId, dto);
  }

  @Post('documents')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload KYC documents' })
  async uploadDocuments(@CurrentUser() _user: AuthenticatedUser, @UploadedFiles() files: Array<Express.Multer.File>) {
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
  async getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.kycService.getStatus(user.userId);
  }

  @Patch(':id/review')
  @ApiOperation({ summary: 'Review KYC request (Admin)' })
  async review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewKycDto,
  ) {
    return this.kycService.review(user.userId, id, dto);
  }
}
