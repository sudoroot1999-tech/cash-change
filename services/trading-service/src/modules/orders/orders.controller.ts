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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto, OrderResponseDto } from './dto/order.dto';
import { OrderStatus } from './entities/order.entity';

@ApiTags('Orders')
@Controller('orders')
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, type: OrderResponseDto })
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Req() req: Request) {
    const userId = (req as any).user?.userId || 'test-user-id';
    return this.ordersService.createOrder(userId, createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  @ApiQuery({ name: 'symbol', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserOrders(
    @Req() req: Request,
    @Query('status') status?: OrderStatus,
    @Query('symbol') _symbol?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = (req as any).user?.userId || 'test-user-id';
    const result = await this.ordersService.getUserOrders(userId, {
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
  async getOpenOrders(@Req() req: Request, @Query('symbol') _symbol?: string) {
    const userId = (req as any).user?.userId || 'test-user-id';
    const orders = await this.ordersService.getOpenOrders(userId, _symbol);
    return { data: orders };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  async getOrder(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const userId = (req as any).user?.userId || 'test-user-id';
    return this.ordersService.getOrder(userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiQuery({ name: 'symbol', required: true })
  async cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('symbol') symbol: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.userId || 'test-user-id';
    return this.ordersService.cancelOrder(userId, id, symbol);
  }

  @Get('history/trades')
  @ApiOperation({ summary: 'Get trade history' })
  @ApiQuery({ name: 'symbol', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTradeHistory(
    @Req() req: Request,
    @Query('symbol') _symbol?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = (req as any).user?.userId || 'test-user-id';
    const result = await this.ordersService.getUserTrades(userId, {
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
