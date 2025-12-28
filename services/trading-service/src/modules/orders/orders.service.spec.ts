import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order, OrderStatus, OrderType, OrderSide, TimeInForce } from './entities/order.entity';
import { Trade } from './entities/trade.entity';
import { CreateOrderDto } from './dto/order.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let tradeRepository: jest.Mocked<Repository<Trade>>;
  let mockWalletService: any;
  let mockMatchingService: any;
  let mockMarketService: any;
  let mockRmqClient: { emit: jest.Mock };

  const mockOrder: Partial<Order> = {
    id: 'order-123',
    userId: 'user-123',
    pairId: 'BTCUSDT',
    side: OrderSide.BUY,
    type: OrderType.LIMIT,
    status: OrderStatus.OPEN,
    price: '45000.00',
    quantity: '0.5',
    filledQuantity: '0',
    timeInForce: TimeInForce.GTC,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTrade: Partial<Trade> = {
    id: 'trade-123',
    orderId: 'order-123',
    pairId: 'BTCUSDT',
    price: '45000.00',
    quantity: '0.5',
    fee: '0.0005',
    feeCurrency: 'BTC',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockWalletService = {
      lockBalance: jest.fn().mockReturnValue({ toPromise: jest.fn().mockResolvedValue({ success: true }) }),
      unlockBalance: jest.fn().mockReturnValue({ toPromise: jest.fn().mockResolvedValue({ success: true }) }),
      transfer: jest.fn().mockReturnValue({ toPromise: jest.fn().mockResolvedValue({ success: true }) }),
    };

    mockMatchingService = {
      submitOrder: jest.fn().mockReturnValue({
        toPromise: jest.fn().mockResolvedValue({
          order_id: 'order-123',
          status: 'open',
          filled_quantity: '0',
          trades: [],
        }),
      }),
      cancelOrder: jest.fn().mockReturnValue({
        toPromise: jest.fn().mockResolvedValue({
          success: true,
        }),
      }),
    };

    mockMarketService = {
      getMarkets: jest.fn().mockReturnValue({
        toPromise: jest.fn().mockResolvedValue({
          markets: [{ id: 'BTCUSDT', base: 'BTC', quote: 'USDT' }],
        }),
      }),
    };

    mockRmqClient = {
      emit: jest.fn(),
    };

    const mockOrderRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockTradeRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: getRepositoryToken(Trade), useValue: mockTradeRepo },
        {
          provide: 'WALLET_PACKAGE',
          useValue: { getService: () => mockWalletService },
        },
        {
          provide: 'MATCHING_PACKAGE',
          useValue: { getService: () => mockMatchingService },
        },
        {
          provide: 'MARKET_PACKAGE',
          useValue: { getService: () => mockMarketService },
        },
        {
          provide: 'TRADING_PACKAGE',
          useValue: mockRmqClient,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get(getRepositoryToken(Order));
    tradeRepository = module.get(getRepositoryToken(Trade));

    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    const createOrderDto: CreateOrderDto = {
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'limit',
      quantity: '0.5',
      price: '45000',
    };

    it('should create a limit order successfully', async () => {
      orderRepository.create.mockReturnValue(mockOrder as Order);
      orderRepository.save.mockResolvedValue(mockOrder as Order);

      const result = await service.createOrder('user-123', createOrderDto);

      expect(result).toEqual(mockOrder);
      expect(orderRepository.create).toHaveBeenCalled();
      expect(orderRepository.save).toHaveBeenCalled();
      expect(mockRmqClient.emit).toHaveBeenCalled();
    });

    it('should throw BadRequestException for limit order without price', async () => {
      const invalidDto = { ...createOrderDto, price: undefined };

      await expect(service.createOrder('user-123', invalidDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create a market order without price', async () => {
      const marketOrderDto = { ...createOrderDto, type: 'market', price: undefined };
      orderRepository.create.mockReturnValue({ ...mockOrder, type: OrderType.MARKET } as Order);
      orderRepository.save.mockResolvedValue({ ...mockOrder, type: OrderType.MARKET } as Order);

      const result = await service.createOrder('user-123', marketOrderDto as any);

      expect(result.type).toBe(OrderType.MARKET);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an open order', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder as Order);
      orderRepository.save.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      } as Order);

      const result = await service.cancelOrder('user-123', 'order-123', 'BTCUSDT');

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw NotFoundException if order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.cancelOrder('user-123', 'nonexistent', 'BTCUSDT'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if order already filled', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.FILLED,
      } as Order);

      await expect(
        service.cancelOrder('user-123', 'order-123', 'BTCUSDT'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if cancelling another user order', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        userId: 'other-user',
      } as Order);

      await expect(
        service.cancelOrder('user-123', 'order-123', 'BTCUSDT'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOrder', () => {
    it('should return order for owner', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder as Order);

      const result = await service.getOrder('user-123', 'order-123');

      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException if order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.getOrder('user-123', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserOrders', () => {
    it('should return paginated orders for user', async () => {
      const orders = [mockOrder, { ...mockOrder, id: 'order-456' }];
      orderRepository.findAndCount.mockResolvedValue([orders as Order[], 2]);

      const result = await service.getUserOrders('user-123', { page: 1, limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      orderRepository.findAndCount.mockResolvedValue([[mockOrder] as Order[], 1]);

      const result = await service.getUserOrders('user-123', {
        status: OrderStatus.OPEN,
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
    });
  });

  describe('getOpenOrders', () => {
    it('should return open orders for user', async () => {
      orderRepository.find.mockResolvedValue([mockOrder] as Order[]);

      const result = await service.getOpenOrders('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(OrderStatus.OPEN);
    });
  });

  describe('getUserTrades', () => {
    it('should return paginated trades for user', async () => {
      tradeRepository.findAndCount.mockResolvedValue([[mockTrade] as Trade[], 1]);

      const result = await service.getUserTrades('user-123', { page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
