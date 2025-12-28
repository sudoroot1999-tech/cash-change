import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRole } from '../auth/entities/admin.entity';

@ApiTags('Admin - Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_ADMIN, AdminRole.COMPLIANCE_ADMIN)
  @ApiOperation({ summary: 'List all users' })
  async findAll(@Query() query: any) {
    return this.usersService.findAll(query);
  }

  @Get('stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'Get user statistics' })
  async getStats() {
    return this.usersService.getUserStats();
  }

  @Get(':id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_ADMIN, AdminRole.COMPLIANCE_ADMIN)
  @ApiOperation({ summary: 'Get user by ID' })
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'Update user' })
  async updateUser(@Param('id') id: string, @Body() data: any) {
    return this.usersService.updateUser(id, data);
  }

  @Patch(':id/suspend')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'Suspend user account' })
  async suspendUser(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.usersService.suspendUser(id, body.reason);
  }

  @Patch(':id/activate')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'Activate user account' })
  async activateUser(@Param('id') id: string) {
    return this.usersService.activateUser(id);
  }
}

