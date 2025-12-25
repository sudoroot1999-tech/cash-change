import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ProfilesService, UpdateProfileDto } from './profiles.service';

@ApiTags('Profiles')
@Controller('users/:userId/profile')
@ApiBearerAuth()
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  async getProfile(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.profilesService.getOrCreate(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  async updateProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.profilesService.update(userId, updateDto);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  async updatePreferences(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() preferences: Record<string, unknown>,
  ) {
    return this.profilesService.updatePreferences(userId, preferences);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
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
  @ApiOperation({ summary: 'Upload avatar' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  async uploadAvatar(
    @Param('userId', ParseUUIDPipe) userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profilesService.uploadAvatar(userId, file);
  }
}
