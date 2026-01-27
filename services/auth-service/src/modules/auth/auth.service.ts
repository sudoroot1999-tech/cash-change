import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { AuthEventsService } from './services/auth-events.service';
import { BadRequestError, CacheLayer, createServiceLogger, JWTAuthService, Logger, MultiLayerCacheService, NotFoundError, QUEUES, RateLimit, RateLimiterService, RequestContext, ServiceUnavailableError, User, USER_STATUS, UserProfile } from '@exchange/common';
import { ChangePasswordDto, ForgotPasswordDto, RefreshTokenDto, RegisterDto, ResetPasswordDto, Verify2FADto } from './dto/auth.dto';
import { LoginDto } from './dto/auth.dto';
import { SECURITY_PORT, USER_PORT } from './tokens/auth.tokens';
import { UserPort } from './ports/user.port';
import { SecurityPort } from './ports/security.port';
import { NotificationEventsService } from './services/notification-events.service';

@Injectable()
export class AuthService {

  constructor(
    private readonly logger: Logger = createServiceLogger(AuthService.name),
    private readonly rateLimitService: RateLimiterService,
    @Inject(USER_PORT) private readonly users: UserPort,
    @Inject(SECURITY_PORT) private readonly security: SecurityPort,
    private readonly authEvents: AuthEventsService,
    private readonly notificationEvents: NotificationEventsService,
    private readonly tokenService: JWTAuthService,
    private readonly cacheService: MultiLayerCacheService
  ) { }


  /**
   * Register a new user
   */
  async register(dto: RegisterDto): Promise<User> {
    try {
      // Create user via User Service gRPC
      const user = await this.users
        .create({
          email: dto.email,
          password: dto.password,
          username: dto.username,
          referralCode: dto.referralCode,
        })

      await this.authEvents.publishUserRegistered({
        name: QUEUES.USER_REGISTERED,
        eventId: this.tokenService.generateRandomToken(),
        timestamp: new Date(),
        email: user.email,
        userId: user.id,
        username: user.username,
        version: "1",
        registeredAt: user.createdAt,
        referralCode: user.referralCode
      });

      await this.notificationEvents.publishEmailNotification({
        eventId: this.tokenService.generateRandomToken(),
        timestamp: new Date(),
        data: {
          antiphishingCode: user.antiPhishingCode,
          verificationUrl: `${user.emailVerificationToken}`,
          expiresInMinutes: 20
        },
        subject: 'Email Verification',
        userId: user.id,
        template: "1",
        to: user.email,
        version: "1",
      });

      await this.authEvents.publishEmailVerificationRequested({
        version: "1",
        eventId: this.tokenService.generateRandomToken(),
        timestamp: new Date(),
        email: user.email,
        userId: user.id,
        requestedAt: new Date()
      });

      this.logger.logAuth('User registered successfully,Activate your account', user.id, true);

      return user;
    } catch (error: any) {
      if (error?.details?.includes('already registered')) {
        // Check specifically for conflict
        throw new BadRequestError('Email already registered');
      }
      throw error;
    }
  }

  /**
 * Login user
 */
  async login(dto: LoginDto, ctx: Partial<RequestContext>): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
    sessionId: string;
  } | {
    requires2FA: boolean,
    tempToken: string,
  }> {
    // Check rate limiting
    const isBlocked = await this.rateLimitService.isBlocked(ctx.ipAddress);
    if (isBlocked) {
      throw new UnauthorizedException('Too many failed login attempts. Please try again later.');
    }

    try {
      // Find user and validate
      const user = await this.validateUser(dto.email, dto.password);

      // Check user status
      if (user.status !== USER_STATUS.ACTIVE) {
        throw new UnauthorizedException('Account is not active. Please verify your email.');
      }

      // Check 2FA if enabled
      if (user.twoFactorEnabled) {
        // Generate temp token for 2FA verification
        const tempToken = this.tokenService.generateRandomToken();

        await this.cacheService.set(
          `2fa:${tempToken}`,
          { userId: user.id, ipAddress: ctx.ipAddress },
          {
            ttl: 5 * 60,
            layer: CacheLayer.L3_SESSION,
            compress: false,
          }
        );

        return {
          requires2FA: true,
          tempToken,
        };
      }

      return this.completeLogin(user, ctx);

    }
    catch (error: any) {
      if (error?.details?.includes('already registered')) {
        // Check specifically for conflict
        throw new BadRequestException('Email already registered');
      }
      throw error;
    }
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    // Call user-service via gRPC for secure validation
    try {
      const user = await this.users.validate(email, password);
      if (!user) throw new UnauthorizedException('Invalid email or password');

      if (user.status !== 'active' && user.status !== 'pending') {
        throw new UnauthorizedException('Account is suspended or banned');
      }
      return user;
    } catch (error) {
      // If RPC returns null or error, return null
      throw new UnauthorizedException('An error happened');;
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async completeLogin(
    user: User,
    ctx: Partial<RequestContext>
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
    sessionId: string;
  }> {

    // create session
    const session = await this.security.createSession({
      userId: user.id,
      ipAddress: ctx.ipAddress,
      deviceFingerprint: ctx.fingerprint,
      userAgent: ctx.userAgent,
    });

    // generate tokens
    const tokens = await this.tokenService.generateTokenPair({
      email: user.email,
      sub: user.id,
      sessionId: session.id,
      username: user.username,
      status: user.status,
      kycLevel: user.kycLevel,
      kycStatus: user.kycStatus,
      tier: user.tier,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
    });

    // update session with refresh token
    const updateSession = await this.security.updateSession(
      session.id,
      tokens.refreshToken
    );

    await this.cacheService.set(`refresh_token:${user.id}:${session.id}`, {
      refreshToken: tokens.refreshToken,
      sessionId: session.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // optional, match TTL
    }, {
      layer: CacheLayer.L3_SESSION,
      ttl: 7 * 24 * 60 * 60, // 7 Days
    });

    // publish user login event
    await this.authEvents.publishUserLogin({
      userId: user.id,
      email: user.email,
      version: "1",
      eventId: this.tokenService.generateRandomToken(),
      timestamp: new Date(),
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
      success: true,
      loginAt: new Date(),
      country: ctx.locationCountry,
      deviceId: ctx.device
    });

    await this.security.logLoginAttempt({
      userId: user.id,
      ipAddress: ctx.ipAddress,
      success: true,
      userAgent: ctx.userAgent,
      deviceFingerprint: ctx.fingerprint
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: this.parseExpiresIn(String(tokens.expiresIn)),
      tokenType: 'Bearer',
      sessionId: updateSession.id,
    };
  }

  /**
   * Verify 2FA and complete login
   */
  @RateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    blockDurationMs: 60 * 60 * 1000,
    keyPrefix: '2fa',
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
  })
  async verify2FA(tempToken: string, dto: Verify2FADto, ctx: Partial<RequestContext>): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
    sessionId: string;
  }> {
    try {
      // Get user from temp token
      const tempData = await this.cacheService.get<{ userId: string }>(
        `2fa:${tempToken}`,
        { layer: CacheLayer.L3_SESSION }
      );

      if (!tempData) {
        throw new UnauthorizedException('Invalid or expired 2FA token');
      }

      const user = await this.users.findById(tempData.userId)

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const twoFactorAuth = await this.security.findTwoFactorByUserId(user.id);

      if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
        throw new BadRequestException('2FA is not enabled');
      }

      let isValid = false;

      if (dto.token) {
        // Verify TOTP token
        isValid = (await this.security.verifyToken(user.id, dto.token))?.isValid;
      } else if (dto.backupCode) {
        // Verify backup code
        isValid = (await this.security.verifyBackupCode(user.id, dto.backupCode))?.isValid;
      }

      if (!isValid) {
        await this.security.logLoginAttempt({
          userId: user.id,
          ipAddress: ctx.ipAddress,
          success: false,
          failureReason: `invalid 2fa code`
        });
        throw new UnauthorizedException('Invalid 2FA code');
      }

      // Delete temp token
      await this.cacheService.delete(`2fa:${tempToken}`, { layer: CacheLayer.L3_SESSION });

      // Create session
      return this.completeLogin(user, ctx);
    }
    catch (error) {
      throw new ServiceUnavailableError('failed to verify 2FA')
    }
  }

  /**
   * Enable 2FA
   */
  async setup2FA(userId: string): Promise<{
    qrCode: string,
    backupCodes: string[];
    secret: any;
  }> {
    try {
      // Check if 2FA already enabled
      const existing = await this.security.findTwoFactorByUserId(userId);

      if (existing?.isEnabled) {
        throw new BadRequestException('2FA already enabled');
      }

      const user = await this.users.findById(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Generate secret and QR code
      const { secret, otpauthUrl, backupCodes } = await this.security.generateSecret(userId, user.email);

      const qrCode = (await this.security.generateQRCode(otpauthUrl))?.qrCodeDataUrl;

      return {
        secret,
        qrCode,
        backupCodes, // Only show once
      };
    }
    catch (error) {
      throw new ServiceUnavailableError('failed to setup 2FA')
    }
  }

  /**
   * Confirm 2FA setup
   */
  async confirm2FA(user: User, token: string): Promise<{ success: boolean, message: string }> {
    try {
      const twoFactorAuth = await this.security.findTwoFactorByUserId(user.id);

      if (!twoFactorAuth) {
        throw new BadRequestException('2FA setup not initiated');
      }

      if (twoFactorAuth.isEnabled) {
        throw new BadRequestException('2FA already enabled');
      }

      // Verify token
      const isValid = (await this.security.verifyToken(
        user.id,
        token,
      ))?.isValid;

      if (!isValid) {
        throw new UnauthorizedException('Invalid 2FA code');
      }

      // Enable 2FA
      twoFactorAuth.isEnabled = true;
      await this.security.updateTwoFactor(
        user.id,
        twoFactorAuth.isEnabled,
        new Date()
      );

      await this.authEvents.publishTwoFactorEnabled({
        version: "1",
        eventId: this.tokenService.generateRandomToken(),
        timestamp: new Date(),
        userId: user.id,
        method: "totp",
        enabledAt: new Date(),
        email: user.email
      });

      // await this.emailService.send2FAEnabledNotification(user.email, user.anti_phishing_code);

      return {
        success: true,
        message: '2FA enabled successfully',
      };
    }
    catch (error) {
      throw new ServiceUnavailableError('failed to confirm 2FA')
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(userId: string, dto: RefreshTokenDto, ctx: RequestContext): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
    sessionId: string;
  }> {
    try {
      // Verify refresh token
      const payload = await this.tokenService.verifyRefreshToken(dto.refreshToken);

      // Find session
      const sessions = await this.security.getActiveSessions(userId);

      if (!sessions) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      let currentSession = null;
      for (const session of sessions) {
        if (session.refreshToken === dto.refreshToken) {
          currentSession = session;
          break;
        }
      }

      if (!currentSession) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify in Redis
      const isValid = await this.cacheService.get(`refresh_token:${userId}:${currentSession.id}`, {
        layer: CacheLayer.L3_SESSION
      });

      if (!isValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new access token
      const pairTokens = await this.tokenService.refreshAccessToken(
        dto.refreshToken,
        {
          email: payload.email,
          sub: payload.sub,
          username: payload.username,
          status: payload.status,
          kycLevel: payload.kycLevel,
          kycStatus: payload.kycStatus,
          tier: payload.tier,
          isTwoFactorEnabled: payload.isTwoFactorEnabled,
          emailVerified: payload.emailVerified,
          phoneVerified: payload.phoneVerified,
          lastLoginAt: new Date(),
          lastLoginIp: ctx.ipAddress
        }
      );

      // update session with refresh token
      await this.security.updateSession(
        currentSession.id,
        pairTokens.refreshToken
      )

      return {
        accessToken: pairTokens.accessToken,
        refreshToken: pairTokens.refreshToken,
        expiresIn: this.parseExpiresIn(String(pairTokens.expiresIn)),
        tokenType: pairTokens.tokenType,
        sessionId: currentSession.id
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Change password
   */
  async changePassword(user: User, dto: ChangePasswordDto): Promise<string> {
    try {
      const response = await this.users.changePassword({
        userId: user.id,
        currentPassword: dto.currentPassword,
        newPassword: dto.newPassword,
      });
      await this.authEvents.publishPasswordChanged({
        version: "1",
        eventId: this.tokenService.generateRandomToken(),
        timestamp: new Date(),
        changedAt: new Date(),
        changedBy: 'user',
        userId: user.id,
        email: user.email
      });
      return response;
    }
    catch (error) {
      throw new ServiceUnavailableError('failed to change password')
    }
  }

  /**
   * Forgot password
   */
  async forgotPassword(dto: ForgotPasswordDto, ip: string): Promise<string> {
    try {
      return await this.users.forgotPassword(dto.email);
    }
    catch (error) {
      throw new ServiceUnavailableError('failed to forget password')
    }
  }

  /**
   * Reset password
   */
  async resetPassword(dto: ResetPasswordDto, user: User): Promise<string> {
    try {
      const response = await this.users.resetPassword({
        token: dto.token,
        newPassword: dto.newPassword,
      });
      await this.authEvents.publishPasswordResetRequested({
        version: "1",
        eventId: this.tokenService.generateRandomToken(),
        timestamp: new Date(),
        userId: user.id,
        email: user.email
      });
      return response;
    }
    catch (error) {
      throw new ServiceUnavailableError('failed to reset password')
    }
  }

  /**
   * Logout
   */
  async logout(user: User, sessionId: string): Promise<{
    success: boolean, message?: string, error?: any
  }> {
    try {
      // Mark session as inactive
      await this.security.killSession(user.id, sessionId);

      // Delete from Redis
      await this.cacheService.delete(`refresh_token:${user.id}:${sessionId}`, {
        layer: CacheLayer.L3_SESSION
      });

      await this.authEvents.publishUserLogout({
        version: "1",
        eventId: this.tokenService.generateRandomToken(),
        timestamp: new Date(),
        userId: user.id,
        email: user.email
      })

      return {
        success: true,
        message: 'Logged out successfully',
      };
    }
    catch (error: any) {
      return {
        success: false,
        error
      };
    }
  }

  /**
  * Logout all sessions for a user
  */
  // async logoutAll(userId: string): Promise<void> {
  //   await this.sessionRepository.delete({ userId });
  // }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15m

    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * multipliers[unit];
  }

}
