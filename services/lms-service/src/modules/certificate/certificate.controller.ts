import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CertificateService } from './certificate.service';
import { IssueCertificateDto } from './dto/issue-certificate.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('certificates')
@Controller('certificates')
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Issue a certificate' })
  @ApiResponse({ status: 201, description: 'Certificate issued successfully' })
  async issue(@Body() issueDto: IssueCertificateDto) {
    return this.certificateService.issue(issueDto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my certificates' })
  @ApiResponse({ status: 200, description: 'List of certificates' })
  async getMyCertificates(
    @Query() paginationDto: PaginationDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.certificateService.getUserCertificates(userId, paginationDto);
  }

  @Get('verify/:code')
  @ApiOperation({ summary: 'Verify a certificate' })
  @ApiParam({ name: 'code', description: 'Verification code' })
  @ApiResponse({ status: 200, description: 'Certificate details' })
  @ApiResponse({ status: 404, description: 'Invalid verification code' })
  async verify(@Param('code') code: string) {
    return this.certificateService.verify(code);
  }

  @Get('number/:certificateNumber')
  @ApiOperation({ summary: 'Get certificate by number' })
  @ApiParam({ name: 'certificateNumber', description: 'Certificate number' })
  @ApiResponse({ status: 200, description: 'Certificate details' })
  async findByNumber(@Param('certificateNumber') certificateNumber: string) {
    return this.certificateService.findByNumber(certificateNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get certificate by ID' })
  @ApiParam({ name: 'id', description: 'Certificate UUID' })
  @ApiResponse({ status: 200, description: 'Certificate details' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.certificateService.findOne(id);
  }

  @Patch(':id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a certificate' })
  @ApiParam({ name: 'id', description: 'Certificate UUID' })
  @ApiResponse({ status: 200, description: 'Certificate revoked' })
  async revoke(@Param('id', ParseUUIDPipe) id: string, @Body('reason') reason: string) {
    return this.certificateService.revoke(id, reason);
  }

  @Post(':id/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Track certificate download' })
  @ApiParam({ name: 'id', description: 'Certificate UUID' })
  @ApiResponse({ status: 200, description: 'Download tracked' })
  async trackDownload(@Param('id', ParseUUIDPipe) id: string) {
    await this.certificateService.incrementDownloads(id);
    return { success: true };
  }

  @Post(':id/share-linkedin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark certificate as shared on LinkedIn' })
  @ApiParam({ name: 'id', description: 'Certificate UUID' })
  @ApiResponse({ status: 200, description: 'Marked as shared' })
  async shareOnLinkedIn(@Param('id', ParseUUIDPipe) id: string) {
    return this.certificateService.shareOnLinkedIn(id);
  }
}
