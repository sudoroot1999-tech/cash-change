import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Session } from '../sessions/entities/session.entity';
import { authenticator } from '@otplib/preset-default';

describe('AuthService', () => {
  let service: AuthService;
  let sessionRepository: jest.Mocked<Repository<Session>>;
  let jwtService: jest.Mocked<JwtService>;
  let mockClientGrpc: any;
  let mockUserGrpcService: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    status: 'active',
    tier: 'basic',
    kycLevel: 0,
    twoFactorEnabled: false,
    two_factor_enabled: false,
    twoFactorSecret: null,
  };

  const mockSession: Partial<Session> = {
    id: 'session-123',
    userId: 'user-123',
    refreshTokenHash: 'hashed_refresh_token',
    deviceInfo: { browser: 'Chrome' },
    ipAddress: '127.0.0.1',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockUserGrpcService = {
      findById: jest.fn().mockReturnValue({
        toPromise: jest.fn().mockResolvedValue({
          id: mockUser.id,
          email: mockUser.email,
          password_hash: mockUser.passwordHash,
          status: mockUser.status,
          tier: mockUser.tier,
          kyc_level: mockUser.kycLevel,
          two_factor_enabled: mockUser.twoFactorEnabled,
        }),
      }),
      findByEmail: jest.fn().mockReturnValue({
        toPromise: jest.fn().mockResolvedValue({
          id: mockUser.id,
          email: mockUser.email,
          password_hash: mockUser.passwordHash,
          status: mockUser.status,
          tier: mockUser.tier,
          kyc_level: mockUser.kycLevel,
          two_factor_enabled: mockUser.twoFactorEnabled,
        }),
      }),
      validate: jest.fn().mockReturnValue({
        toPromise: jest.fn().mockResolvedValue({
          id: mockUser.id,
          email: mockUser.email,
          password_hash: mockUser.passwordHash,
          status: mockUser.status,
          tier: mockUser.tier,
          kyc_level: mockUser.kycLevel,
          two_factor_enabled: mockUser.twoFactorEnabled,
        }),
      }),
      create: jest.fn().mockReturnValue({
        toPromise: jest.fn().mockResolvedValue({
          id: 'new-user-123',
          email: 'new@example.com',
          password_hash: 'hashed',
          status: 'pending',
          tier: 'basic',
          kyc_level: 0,
          two_factor_enabled: false,
        }),
      }),
    };

    mockClientGrpc = {
      getService: jest.fn().mockReturnValue(mockUserGrpcService),
    };

    const mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-access-token'),
      verify: jest.fn().mockReturnValue({ sub: 'user-123', email: 'test@example.com' }),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue: string) => {
        const config: Record<string, string> = {
          JWT_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_DAYS: '7',
          JWT_SECRET: 'test-secret',
        };
        return config[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(Session),
          useValue: mockRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'USER_PACKAGE',
          useValue: mockClientGrpc,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    sessionRepository = module.get(getRepositoryToken(Session));
    jwtService = module.get(JwtService);

    // Initialize the gRPC service
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      sessionRepository.create.mockReturnValue(mockSession as Session);
      sessionRepository.save.mockResolvedValue(mockSession as Session);

      const result = await service.register({
        email: 'new@example.com',
        password: 'SecurePass123!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.tokenType).toBe('Bearer');
    });

    it('should throw BadRequestException if email already exists', async () => {
      mockUserGrpcService.create.mockReturnValue({
        toPromise: jest.fn().mockRejectedValue({
          details: 'Email already registered',
        }),
      });

      await expect(
        service.register({ email: 'existing@example.com', password: 'pass123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateUser', () => {
    it('should return user for valid credentials', async () => {
      const result = await service.validateUser('test@example.com', 'correct_password');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null for invalid credentials', async () => {
      mockUserGrpcService.validate.mockReturnValue({
        toPromise: jest.fn().mockRejectedValue(new Error('Invalid')),
      });

      const result = await service.validateUser('test@example.com', 'wrong_password');

      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException for suspended account', async () => {
      mockUserGrpcService.validate.mockReturnValue({
        toPromise: jest.fn().mockResolvedValue({
          ...mockUser,
          status: 'suspended',
        }),
      });

      await expect(
        service.validateUser('test@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      sessionRepository.create.mockReturnValue(mockSession as Session);
      sessionRepository.save.mockResolvedValue(mockSession as Session);

      const result = await service.generateTokens(mockUser as any);

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.tokenType).toBe('Bearer');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
        }),
      );
    });

    it('should create a session for the refresh token', async () => {
      sessionRepository.create.mockReturnValue(mockSession as Session);
      sessionRepository.save.mockResolvedValue(mockSession as Session);

      await service.generateTokens(mockUser as any, { browser: 'Chrome' }, '192.168.1.1');

      expect(sessionRepository.create).toHaveBeenCalled();
      expect(sessionRepository.save).toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens with valid refresh token', async () => {
      sessionRepository.findOne.mockResolvedValue(mockSession as Session);
      sessionRepository.create.mockReturnValue(mockSession as Session);
      sessionRepository.save.mockResolvedValue(mockSession as Session);
      sessionRepository.delete.mockResolvedValue({ affected: 1 } as any);

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      sessionRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000), // Already expired
      };
      sessionRepository.findOne.mockResolvedValue(expiredSession as Session);

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should delete session on logout', async () => {
      sessionRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.logout('refresh-token');

      expect(sessionRepository.delete).toHaveBeenCalled();
    });
  });

  describe('logoutAll', () => {
    it('should delete all sessions for user', async () => {
      sessionRepository.delete.mockResolvedValue({ affected: 3 } as any);

      await service.logoutAll('user-123');

      expect(sessionRepository.delete).toHaveBeenCalledWith({ userId: 'user-123' });
    });
  });

  describe('setup2FA', () => {
    it('should generate secret and QR code', async () => {
      const result = await service.setup2FA('user-123');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result.qrCode).toContain('data:image/png;base64');
    });

    it('should throw BadRequestException if 2FA already enabled', async () => {
      mockUserGrpcService.findById.mockReturnValue({
        toPromise: jest.fn().mockResolvedValue({
          ...mockUser,
          two_factor_enabled: true,
        }),
      });

      await expect(service.setup2FA('user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verify2FACode', () => {
    it('should return true for valid code', () => {
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      const result = service.verify2FACode('TESTSECRET', '123456');

      expect(result).toBe(true);
      expect(authenticator.verify).toHaveBeenCalledWith({
        token: '123456',
        secret: 'TESTSECRET',
      });
    });

    it('should return false for invalid code', () => {
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      const result = service.verify2FACode('TESTSECRET', '000000');

      expect(result).toBe(false);
    });
  });

  describe('validateToken', () => {
    it('should return payload for valid token', async () => {
      const result = await service.validateToken('valid-token');

      expect(result).toEqual({ sub: 'user-123', email: 'test@example.com' });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.validateToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
