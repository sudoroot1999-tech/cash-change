import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
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
}
