import { Controller, Get, Put, Body, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequireAuth} from '@exchange/common';
import { PreferenceService } from './preferences.service';
import { NotificationChannel, NotificationType } from '@exchange/common';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@ApiTags('Preferences')
@Controller('preferences')
@RequireAuth()
@RequireAuth()
export class PreferencesController {
  constructor(private readonly preferenceService: PreferenceService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({ status: 200, description: 'User preferences retrieved' })
  async getPreferences(@Query('userId') userId: string) {
    const preferences = await this.preferenceService.getUserPreferences(userId);
    return { success: true, data: preferences };
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updatePreferences(
    @Query('userId') userId: string,
    @Body() dto: UpdatePreferencesDto & { notificationType: NotificationType },
  ) {
    const preference = await this.preferenceService.updatePreference(
      userId,
      dto.notificationType,
      dto,
    );

    return {
      success: true,
      data: preference,
      message: 'Preferences updated successfully',
    };
  }

  @Post('preferences/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from notification type' })
  @HttpCode(HttpStatus.OK)
  async unsubscribe(
    @Body() body: { userId: string; notificationType: NotificationType; channel?: NotificationChannel },
  ) {
    if (body.channel) {
      await this.preferenceService.unsubscribeFromChannel(
        body.userId,
        body.notificationType,
        body.channel,
      );
    } else {
      await this.preferenceService.unsubscribeFromType(body.userId, body.notificationType);
    }

    return {
      success: true,
      message: 'Unsubscribed successfully',
    };
  }
}
