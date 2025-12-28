import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/user.dto';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;
  let mockClientProxy: { emit: jest.Mock };

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    referralCode: 'ABC12345',
    status: UserStatus.ACTIVE,
    emailVerified: false,
    twoFactorEnabled: false,
    kycLevel: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockClientProxy = {
      emit: jest.fn(),
    };

    const mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: 'USERS_PACKAGE',
          useValue: mockClientProxy,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
    };

    it('should create a new user successfully', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser as User);
      userRepository.save.mockResolvedValue(mockUser as User);

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
      expect(mockClientProxy.emit).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as User);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if phone number already exists', async () => {
      const dtoWithPhone: CreateUserDto = {
        ...createUserDto,
        phone: '+1234567890',
      };
      
      // First call for email - returns null
      // Second call for phone - returns existing user
      userRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser as User);

      await expect(service.create(dtoWithPhone)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should hash password before saving', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser as User);
      userRepository.save.mockResolvedValue(mockUser as User);

      await service.create(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 12);
    });

    it('should link referrer if valid referral code provided', async () => {
      const referrer = { ...mockUser, id: 'referrer-id', referralCode: 'REF123' };
      const dtoWithReferral: CreateUserDto = {
        ...createUserDto,
        referralCode: 'REF123',
      };

      userRepository.findOne
        .mockResolvedValueOnce(null) // Email check
        .mockResolvedValueOnce(referrer as User); // Referrer lookup
      userRepository.create.mockReturnValue(mockUser as User);
      userRepository.save.mockResolvedValue(mockUser as User);

      await service.create(dtoWithReferral);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referredBy: 'referrer-id',
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.findById('user-123');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('verifyEmail', () => {
    it('should set emailVerified to true', async () => {
      const pendingUser = { ...mockUser, status: UserStatus.PENDING };
      const verifiedUser = { ...pendingUser, emailVerified: true, status: UserStatus.ACTIVE };
      
      userRepository.findOne.mockResolvedValue(pendingUser as User);
      userRepository.save.mockResolvedValue(verifiedUser as User);

      const result = await service.verifyEmail('user-123');

      expect(result.emailVerified).toBe(true);
      expect(result.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyPassword(mockUser as User, 'correct_password');

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('correct_password', mockUser.passwordHash);
    });

    it('should return false for incorrect password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.verifyPassword(mockUser as User, 'wrong_password');

      expect(result).toBe(false);
    });
  });

  describe('enable2FA', () => {
    it('should enable 2FA with secret', async () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const userWith2FA = { ...mockUser, twoFactorEnabled: true, twoFactorSecret: secret };
      
      userRepository.findOne.mockResolvedValue(mockUser as User);
      userRepository.save.mockResolvedValue(userWith2FA as User);

      const result = await service.enable2FA('user-123', secret);

      expect(result.twoFactorEnabled).toBe(true);
      expect(result.twoFactorSecret).toBe(secret);
    });
  });

  describe('disable2FA', () => {
    it('should disable 2FA', async () => {
      const userWith2FA = { ...mockUser, twoFactorEnabled: true, twoFactorSecret: 'secret' };
      const userWithout2FA = { ...mockUser, twoFactorEnabled: false, twoFactorSecret: null };
      
      userRepository.findOne.mockResolvedValue(userWith2FA as User);
      userRepository.save.mockResolvedValue(userWithout2FA as User);

      const result = await service.disable2FA('user-123');

      expect(result.twoFactorEnabled).toBe(false);
      expect(result.twoFactorSecret).toBeNull();
    });
  });

  describe('updateKycLevel', () => {
    it('should update KYC level and emit event', async () => {
      const updatedUser = { ...mockUser, kycLevel: 2 };
      
      userRepository.findOne.mockResolvedValue(mockUser as User);
      userRepository.save.mockResolvedValue(updatedUser as User);

      const result = await service.updateKycLevel('user-123', 2);

      expect(result.kycLevel).toBe(2);
      expect(mockClientProxy.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ userId: 'user-123', level: 2 }),
      );
    });
  });

  describe('getReferrals', () => {
    it('should return paginated referrals', async () => {
      const referrals = [mockUser, { ...mockUser, id: 'user-456' }];
      userRepository.findAndCount.mockResolvedValue([referrals as User[], 2]);

      const result = await service.getReferrals('user-123', 1, 10);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('validate', () => {
    it('should return user for valid credentials', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validate('test@example.com', 'correct_password');

      expect(result).toEqual(mockUser);
    });

    it('should return null for invalid email', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.validate('notfound@example.com', 'any_password');

      expect(result).toBeNull();
    });

    it('should return null for invalid password', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validate('test@example.com', 'wrong_password');

      expect(result).toBeNull();
    });
  });
});
