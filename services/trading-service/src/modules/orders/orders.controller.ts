import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RequireAuth, CurrentUser, AuthenticatedUser } from '@exchange/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, OrderResponseDto } from './dto/order.dto';
import { OrderStatus } from './entities/order.entity';

@ApiTags('Orders')
@Controller('orders')
@RequireAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, type: OrderResponseDto })
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.createOrder(user.userId, createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  @ApiQuery({ name: 'symbol', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: OrderStatus,
    @Query('symbol') _symbol?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.ordersService.getUserOrders(user.userId, {
      status,
      page: page || 1,
      limit: limit || 20,
    });

    return {
      data: result.items,
      meta: {
        page: page || 1,
        limit: limit || 20,
        total: result.total,
      },
    };
  }

  @Get('open')
  @ApiOperation({ summary: 'Get open orders' })
  @ApiQuery({ name: 'symbol', required: false })
  async getOpenOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query('symbol') _symbol?: string,
  ) {
    const orders = await this.ordersService.getOpenOrders(user.userId, _symbol);
    return { data: orders };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  async getOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.getOrder(user.userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiQuery({ name: 'symbol', required: true })
  async cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('symbol') symbol: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.cancelOrder(user.userId, id, symbol);
  }

  @Get('history/trades')
  @ApiOperation({ summary: 'Get trade history' })
  @ApiQuery({ name: 'symbol', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTradeHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('symbol') _symbol?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.ordersService.getUserTrades(user.userId, {
      page: page || 1,
      limit: limit || 50,
    });

    return {
      data: result.items,
      meta: {
        page: page || 1,
        limit: limit || 50,
        total: result.total,
      },
    };
  }
}
