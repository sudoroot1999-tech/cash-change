import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumberString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderSide, OrderType, TimeInForce } from '../entities/order.entity';

export class CreateOrderDto {
  @ApiProperty({ example: 'BTC/USDT' })
  @IsString()
  symbol: string;

  @ApiProperty({ enum: OrderSide, example: 'buy' })
  @IsEnum(OrderSide)
  side: OrderSide;

  @ApiProperty({ enum: OrderType, example: 'limit' })
  @IsEnum(OrderType)
  type: OrderType;

  @ApiPropertyOptional({ example: '45000.00' })
  @IsOptional()
  @IsNumberString()
  price?: string;

  @ApiProperty({ example: '0.5' })
  @IsNumberString()
  quantity: string;

  @ApiPropertyOptional({ example: '44000.00' })
  @IsOptional()
  @IsNumberString()
  stopPrice?: string;

  @ApiPropertyOptional({ enum: TimeInForce, default: 'GTC' })
  @IsOptional()
  @IsEnum(TimeInForce)
  timeInForce?: TimeInForce;

  @ApiPropertyOptional({ example: 'my-order-123' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientOrderId?: string;
}

export class OrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  symbol: string;

  @ApiProperty()
  side: OrderSide;

  @ApiProperty()
  type: OrderType;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  price?: string;

  @ApiProperty()
  quantity: string;

  @ApiProperty()
  filledQuantity: string;

  @ApiProperty()
  remainingQuantity: string;

  @ApiProperty()
  createdAt: Date;
}

export class CancelOrderDto {
  @ApiPropertyOptional({ description: 'Client order ID (alternative to path param)' })
  @IsOptional()
  @IsString()
  clientOrderId?: string;
}
