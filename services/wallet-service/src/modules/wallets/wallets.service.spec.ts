import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, EntityManager } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { Wallet } from './entities/wallet.entity';

describe('WalletsService', () => {
  let service: WalletsService;
  let walletRepository: jest.Mocked<Repository<Wallet>>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;
  let mockClientGrpc: any;
  let mockMarketService: any;

  const mockWallet: Partial<Wallet> = {
    id: 'wallet-123',
    userId: 'user-123',
    assetId: 'BTC',
    availableBalance: '1.5',
    lockedBalance: '0.5',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockMarketService = {
      getAllTickers: jest.fn().mockReturnValue({
        toPromise: jest.fn().mockResolvedValue({ tickers: [] }),
      }),
    };

    mockClientGrpc = {
      getService: jest.fn().mockReturnValue(mockMarketService),
    };

    const mockManager: Partial<EntityManager> = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: mockManager as EntityManager,
    } as unknown as jest.Mocked<QueryRunner>;

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    } as unknown as jest.Mocked<DataSource>;

    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        { provide: getRepositoryToken(Wallet), useValue: mockRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: 'MARKET_PACKAGE', useValue: mockClientGrpc },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
    walletRepository = module.get(getRepositoryToken(Wallet));

    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserWallets', () => {
    it('should return all wallets for a user', async () => {
      const wallets = [mockWallet, { ...mockWallet, id: 'wallet-456', assetId: 'ETH' }];
      walletRepository.find.mockResolvedValue(wallets as Wallet[]);

      const result = await service.getUserWallets('user-123');

      expect(result).toHaveLength(2);
      expect(walletRepository.find).toHaveBeenCalledWith({ where: { userId: 'user-123' } });
    });

    it('should return empty array if no wallets', async () => {
      walletRepository.find.mockResolvedValue([]);

      const result = await service.getUserWallets('user-new');

      expect(result).toHaveLength(0);
    });
  });

  describe('getOrCreateWallet', () => {
    it('should return existing wallet', async () => {
      walletRepository.findOne.mockResolvedValue(mockWallet as Wallet);

      const result = await service.getOrCreateWallet('user-123', 'BTC');

      expect(result).toEqual(mockWallet);
      expect(walletRepository.create).not.toHaveBeenCalled();
    });

    it('should create new wallet if not exists', async () => {
      const newWallet = { ...mockWallet, availableBalance: '0', lockedBalance: '0' };
      walletRepository.findOne.mockResolvedValue(null);
      walletRepository.create.mockReturnValue(newWallet as Wallet);
      walletRepository.save.mockResolvedValue(newWallet as Wallet);

      const result = await service.getOrCreateWallet('user-123', 'ETH');

      expect(result).toEqual(newWallet);
      expect(walletRepository.create).toHaveBeenCalled();
      expect(walletRepository.save).toHaveBeenCalled();
    });
  });

  describe('getBalance', () => {
    it('should return available and locked balance', async () => {
      walletRepository.findOne.mockResolvedValue(mockWallet as Wallet);

      const result = await service.getBalance('user-123', 'BTC');

      expect(result).toEqual({
        available: '1.5',
        locked: '0.5',
      });
    });
  });

  describe('lockBalance', () => {
    it('should lock available balance', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue({
        ...mockWallet,
        availableBalance: '1.5',
        lockedBalance: '0.5',
      });

      await service.lockBalance('user-123', 'BTC', '0.5');

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          availableBalance: '1.000000000000000000',
          lockedBalance: '1.000000000000000000',
        }),
      );
    });

    it('should throw NotFoundException if wallet not found', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.lockBalance('user-123', 'BTC', '0.5')).rejects.toThrow(
        NotFoundException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if insufficient balance', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue({
        ...mockWallet,
        availableBalance: '0.1',
      });

      await expect(service.lockBalance('user-123', 'BTC', '1.0')).rejects.toThrow(
        BadRequestException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('unlockBalance', () => {
    it('should unlock locked balance', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue({
        ...mockWallet,
        availableBalance: '1.0',
        lockedBalance: '0.5',
      });

      await service.unlockBalance('user-123', 'BTC', '0.5');

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          availableBalance: '1.500000000000000000',
          lockedBalance: '0.000000000000000000',
        }),
      );
    });

    it('should throw BadRequestException if insufficient locked balance', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue({
        ...mockWallet,
        lockedBalance: '0.1',
      });

      await expect(service.unlockBalance('user-123', 'BTC', '1.0')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('credit', () => {
    it('should increase available balance', async () => {
      walletRepository.findOne.mockResolvedValue(mockWallet as Wallet);
      walletRepository.save.mockImplementation(async (wallet) => wallet as Wallet);

      const result = await service.credit('user-123', 'BTC', '0.5');

      expect(result.availableBalance).toBe('2.000000000000000000');
    });
  });

  describe('debit', () => {
    it('should decrease available balance', async () => {
      walletRepository.findOne.mockResolvedValue(mockWallet as Wallet);
      walletRepository.save.mockImplementation(async (wallet) => wallet as Wallet);

      const result = await service.debit('user-123', 'BTC', '0.5');

      expect(result.availableBalance).toBe('1.000000000000000000');
    });

    it('should throw BadRequestException if insufficient balance', async () => {
      walletRepository.findOne.mockResolvedValue({
        ...mockWallet,
        availableBalance: '0.1',
      } as Wallet);

      await expect(service.debit('user-123', 'BTC', '1.0')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('settleTrade', () => {
    it('should transfer assets between buyer and seller', async () => {
      const buyerQuoteWallet = { userId: 'buyer', assetId: 'USDT', availableBalance: '0', lockedBalance: '500' };
      const buyerBaseWallet = { userId: 'buyer', assetId: 'BTC', availableBalance: '0', lockedBalance: '0' };
      const sellerBaseWallet = { userId: 'seller', assetId: 'BTC', availableBalance: '0', lockedBalance: '0.01' };
      const sellerQuoteWallet = { userId: 'seller', assetId: 'USDT', availableBalance: '0', lockedBalance: '0' };

      (queryRunner.manager.findOne as jest.Mock).mockImplementation((_entity: any, options: any) => {
        if (options.where.userId === 'buyer' && options.where.assetId === 'USDT') return buyerQuoteWallet;
        if (options.where.userId === 'buyer' && options.where.assetId === 'BTC') return buyerBaseWallet;
        if (options.where.userId === 'seller' && options.where.assetId === 'BTC') return sellerBaseWallet;
        if (options.where.userId === 'seller' && options.where.assetId === 'USDT') return sellerQuoteWallet;
        return null;
      });

      (queryRunner.manager.create as jest.Mock).mockImplementation((_entity: any, data: any) => data);
      (queryRunner.manager.save as jest.Mock).mockImplementation(async (wallet: any) => wallet);

      await service.settleTrade('buyer', 'seller', 'BTC', 'USDT', '0.01', '450');

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.save).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(
        service.settleTrade('buyer', 'seller', 'BTC', 'USDT', '0.01', '450'),
      ).rejects.toThrow();

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
