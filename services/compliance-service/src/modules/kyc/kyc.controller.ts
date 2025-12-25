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
  async uploadDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    if (!files || files.length === 0) {
      return { message: 'No files uploaded', count: 0, files: [] };
    }

    const uploadedFiles: string[] = [];
    for (const file of files) {
      const objectName = await this.kycService.uploadDocument(user.userId, file);
      uploadedFiles.push(objectName);
    }

    return {
      message: 'Documents uploaded successfully',
      count: uploadedFiles.length,
      files: uploadedFiles,
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
