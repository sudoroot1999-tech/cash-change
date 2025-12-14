import { Controller, Get, Put, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PreferencesService } from './preferences.service';
import { NotificationPreference } from './entities/preference.entity';

@ApiTags('Preferences')
@Controller('preferences')
@ApiBearerAuth()
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get notification preferences' })
  async get(@Req() req: Request) {
    const userId = (req as any).user?.userId || 'test-user-id';
    return this.preferencesService.getOrCreate(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Update notification preferences' })
  async update(@Req() req: Request, @Body() data: Partial<NotificationPreference>) {
    const userId = (req as any).user?.userId || 'test-user-id';
    return this.preferencesService.update(userId, data);
  }
}
