import { Controller, Get, Post, Delete, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { MediaService } from './media.service';
import { MediaType } from '../../database/entities';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  async upload(@CurrentUser('userId') userId: string, @Req() req: FastifyRequest) {
    const data = await req.file();
    if (!data) throw new Error('No file uploaded');

    const buffer = await data.toBuffer();
    return this.mediaService.upload(userId, {
      filename: data.filename,
      mimetype: data.mimetype,
      data: buffer,
    });
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my uploaded media' })
  getMyMedia(@CurrentUser('userId') userId: string, @Query('type') type?: MediaType) {
    return this.mediaService.getUserMedia(userId, type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media by ID' })
  @ApiParam({ name: 'id' })
  findById(@Param('id') id: string) {
    return this.mediaService.findById(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete media' })
  @ApiParam({ name: 'id' })
  delete(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.mediaService.delete(id, userId);
  }
}
