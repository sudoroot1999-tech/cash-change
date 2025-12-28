import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRole } from '../auth/entities/admin.entity';

@ApiTags('Admin - Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_ADMIN, AdminRole.RISK_MANAGER)
  @ApiOperation({ summary: 'List all orders' })
  async findAll(@Query() query: any) {
    return this.ordersService.findAll(query);
  }

  @Get('stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.RISK_MANAGER)
  @ApiOperation({ summary: 'Get order statistics' })
  async getStats() {
    return this.ordersService.getOrderStats();
  }

  @Get(':id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_ADMIN, AdminRole.RISK_MANAGER)
  @ApiOperation({ summary: 'Get order by ID' })
  async findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Post(':id/cancel')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.RISK_MANAGER)
  @ApiOperation({ summary: 'Cancel order (admin override)' })
  async cancelOrder(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.ordersService.cancelOrder(id, body.reason);
  }
}

