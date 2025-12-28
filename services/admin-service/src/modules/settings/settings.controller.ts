import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRole } from '../auth/entities/admin.entity';

@ApiTags('Admin - Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all settings' })
  async findAll() {
    return this.settingsService.findAll();
  }

  @Get(':key')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get setting by key' })
  async findByKey(@Param('key') key: string) {
    return this.settingsService.findByKey(key);
  }

  @Post()
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create or update setting' })
  async setValue(
    @Body() body: { key: string; value: any; description?: string; type?: string },
  ) {
    return this.settingsService.setValue(body.key, body.value, body.description, body.type);
  }

  @Patch(':key')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update setting' })
  async updateValue(
    @Param('key') key: string,
    @Body() body: { value: any; description?: string },
  ) {
    return this.settingsService.setValue(key, body.value, body.description);
  }

  @Delete(':key')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete setting' })
  async delete(@Param('key') key: string) {
    await this.settingsService.delete(key);
    return { message: 'Setting deleted' };
  }
}

