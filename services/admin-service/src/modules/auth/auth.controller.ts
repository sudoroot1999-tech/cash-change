import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AdminAuthService } from './auth.service';
import { AdminLoginDto, AdminLoginResponseDto } from './dto/login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { AdminRole } from './entities/admin.entity';

@ApiTags('Admin Auth')
@Controller('auth')
export class AdminAuthController {
  constructor(private readonly authService: AdminAuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 200, type: AdminLoginResponseDto })
  async login(
    @Body() dto: AdminLoginDto,
    @Req() req: any,
  ): Promise<AdminLoginResponseDto> {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.authService.login(dto, ipAddress);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current admin profile' })
  async getProfile(@CurrentAdmin() admin: any) {
    return {
      id: admin.adminId,
      email: admin.email,
      role: admin.role,
      admin: admin.admin,
    };
  }

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new admin (Super Admin only)' })
  async createAdmin(@Body() dto: CreateAdminDto) {
    return this.authService.createAdmin(dto);
  }

  @Get('admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all admins (Super Admin only)' })
  async listAdmins() {
    return this.authService.findAll();
  }

  @Patch('admins/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update admin status (Super Admin only)' })
  async updateAdminStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.authService.updateStatus(id, body.isActive);
  }
}

