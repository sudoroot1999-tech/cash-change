import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RequireAuth, CurrentUser, AuthenticatedUser } from '@exchange/common';
import { PreferencesService } from './preferences.service';
import { NotificationPreference } from './entities/preference.entity';

@ApiTags('Preferences')
@Controller('preferences')
@RequireAuth()
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get notification preferences' })
  async get(@CurrentUser() user: AuthenticatedUser) {
    return this.preferencesService.getOrCreate(user.userId);
  }

  @Put()
  @ApiOperation({ summary: 'Update notification preferences' })
  async update(@CurrentUser() user: AuthenticatedUser, @Body() data: Partial<NotificationPreference>) {
    return this.preferencesService.update(user.userId, data);
  }
}
