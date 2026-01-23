import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto, VerifyEmailDto } from './dto/user.dto';
import { UserProfile } from './entities/profile.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { UserLimits } from './entities/user-limits.entity';
import { BadRequestError, JWTAuthService, KYC_LEVELS, KycLevel, Logger, MultiLayerCacheService, NotFoundError, PasswordService, RateLimiterService, RequestContext, ServiceUnavailableError, StorageService, UnauthorizedError, USER_STATUS } from '@exchange/common';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/user-password.dto';
import { SecurityPort } from './ports/security.ports';
import { ReferralService } from '../referral/referral.service';
import { FraudDetectionService } from '../referral/services';
import { NotificationEventsService } from './services/notification-events.service';
import { UserEventsService } from './services/user-events.service'


@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private profileRepository: Repository<UserProfile>,
    @InjectRepository(UserPreferences)
    private preferencesRepository: Repository<UserPreferences>,
    @InjectRepository(UserLimits)
    private limitsRepository: Repository<UserLimits>,
    @Inject('SECURITY_PACKAGE') private readonly security: SecurityPort,
    private readonly notificationEvents: NotificationEventsService,
    private readonly referralService: ReferralService,
    private readonly fraudService: FraudDetectionService,
    private readonly storageService: StorageService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: JWTAuthService,
    private readonly rateLimitService: RateLimiterService,
    private readonly cacheService: MultiLayerCacheService,
    private readonly userEvents: UserEventsService
  ) { }


  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      // Check if email already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: createUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException('Email already registered');
      }

      // Check username uniqueness if provided
      if (createUserDto.username) {
        const usernameExists = await this.userRepository.findOne({
          where: { username: createUserDto.username },
        });
        if (usernameExists) {
          throw new ConflictException('Username already taken');
        }
      }

      // Check phone uniqueness if provided
      if (createUserDto.phone) {
        const phoneExists = await this.userRepository.findOne({
          where: { phone: createUserDto.phone },
        });
        if (phoneExists) {
          throw new ConflictException('Phone number already registered');
        }
      }

      // Hash password
      const passwordHash = await this.passwordService.hashPassword(createUserDto.password);

      // Generate verification token
      const emailVerificationToken = this.tokenService.generateRandomToken();

      // Create user
      const user = this.userRepository.create({
        email: createUserDto.email,
        username: createUserDto.username,
        phone: createUserDto.phone || null,
        passwordHash,
        emailVerificationToken
      });

      // Find referrer if referral code provided
      if (createUserDto.referralCode) {
        const referralCode = await this.referralService.findReferralByCode({ code: createUserDto.referralCode });

        if (referralCode) {
          const fraudCheck = await this.fraudService.checkNewReferral(
            referralCode.userId,
            user.id,
          );

          if (fraudCheck.isSuspicious && fraudCheck.riskScore >= 0.9) {
            throw new ServiceUnavailableError('Unable to process referral. Please contact support.')
          }

          await this.referralService.useReferralCode(user.id, {
            code: createUserDto.referralCode
          });
          user.referredBy = referralCode.userId;
        }
      }

      // Generate referral code
      const referralCode = await this.referralService.getUserReferralCode(user.id);

      // Generate or use provided anti-phishing code
      const phishingCode = await this.security.generateRandomCode();
      const antiPhishingCode = await this.security.setAntiPhishingCode({
        userId: user.id,
        phishingCode: phishingCode.code
      });

      user.antiPhishingCode = antiPhishingCode.phishingCode;
      user.referralCode = referralCode.code;

      const savedUser = await this.userRepository.save(user);
      this.logger.info(`User created: ${savedUser.id}`);

      // create Defaults
      await this.createUserProfile(savedUser.id)

      return savedUser;
    }
    catch (error: any) {
      throw new BadRequestError('failed to create user')
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User> {
    try {
      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    }
    catch (error: any) {
      throw new NotFoundError('user not found')
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({ where: { email } });
    }
    catch (error: any) {
      throw new NotFoundError('user not found')
    }
  }

  /**
   * Update user
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      const user = await this.findById(id);

      // Check username uniqueness if being updated
      if (updateUserDto.username && updateUserDto.username !== user.username) {
        const usernameExists = await this.userRepository.findOne({
          where: { username: updateUserDto.username },
        });
        if (usernameExists) {
          throw new ConflictException('Username already taken');
        }
      }

      // Check phone uniqueness if being updated
      if (updateUserDto.phone && updateUserDto.phone !== user.phone) {
        const phoneExists = await this.userRepository.findOne({
          where: { phone: updateUserDto.phone },
        });
        if (phoneExists) {
          throw new ConflictException('Phone number already registered');
        }
      }

      Object.assign(user, updateUserDto);
      return this.userRepository.save(user);
    }
    catch (error) {
      throw new BadRequestError('failed to update user')
    }
  }

  /**
   * Verify user email
   */
  async verifyEmail(dto: VerifyEmailDto) {
    try {
      const user = await this.userRepository.findOne({
        where: { emailVerificationToken: dto.token },
      });

      if (!user) {
        throw new BadRequestError('Invalid verification token');
      }

      user.emailVerified = true;
      user.emailVerificationToken = null;
      user.status = USER_STATUS.ACTIVE;

      await this.userEvents.publishUserActivated({
        eventId: this.tokenService.generateRandomToken(),
        timestamp: new Date(),
        userId: user.id,
        version: "1",
        activatedBy: "user"
      })

      await this.userRepository.save(user);

      return {
        success: true,
        message: 'Email verified successfully',
      };
    }
    catch (error: any) {
      return {
        success: true,
        error
      };
    }
  }

  /**
   * Verify user phone
   */
  async verifyPhone(id: string): Promise<User> {
    try {
      const user = await this.findById(id);
      user.phoneVerified = true;
      return this.userRepository.save(user);
    }
    catch (error) {
      throw new Error('failed to verify phone')
    }
  }

  /**
   * Update KYC level
   */
  async updateKycLevel(id: string, kycLevel: number): Promise<User> {
    try {
      const user = await this.findById(id);
      user.kycLevel = kycLevel;
      const saved = await this.userRepository.save(user);

      return saved;
    }
    catch (error) {
      throw new BadRequestError('failed to update kyc')
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } })
      if (!user) throw new NotFoundException('User not found')
      return await this.passwordService.verifyPassword(user.passwordHash, password);
    }
    catch (error) {
      throw new BadRequestError('failed to verify password')
    }
  }

  /**
   * Change password
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify current password
      const isPasswordValid = await this.passwordService.verifyPassword(
        user.passwordHash,
        dto.currentPassword,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid current password');
      }

      // Hash new password
      const newPasswordHash = await this.passwordService.hashPassword(dto.newPassword);
      user.passwordHash = newPasswordHash;
      await this.userRepository.save(user);

      // Invalidate all sessions
      await this.security.killAllSessions(userId);

      // this.logger.logAuthEvent({
      //   type: 'PASSWORD_CHANGED',
      //   userId,
      //   email: user.email,
      //   ip: '',
      //   success: true,
      // });

      return {
        success: true,
        message: 'Password changed successfully',
      };
    }
    catch (error) {
      throw new ServiceUnavailableError("an error happend");
    }
  }

  /**
   * Forgot password
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    try {
      const user = await this.userRepository.findOne({
        where: { email: dto.email },
      });

      // Don't reveal if user exists
      if (!user) {
        return {
          success: true,
          message: 'If email exists, password reset link has been sent',
        };
      }

      // Generate reset token
      const resetToken = this.tokenService.generateRandomToken();
      await this.cacheService.set(`password_reset:${resetToken}`, { userId: user.id }, { ttl: 60 * 60 }); // 1 hour

      await this.notificationEvents.publishEmailNotification({
        eventId: this.tokenService.generateRandomToken(),
        timestamp: new Date(),
        data: {
          antiphishingCode: user.antiPhishingCode,
          resetUrl: `${resetToken}`,
          expiresInMinutes: 60
        },
        subject: 'Email Verification',
        userId: user.id,
        template: "1",
        to: user.email,
        version: "1",
      });

      this.logger.logAuth('PASSWORD_RESET_REQUESTED successfully', user.id, true);

      return {
        success: true,
        message: 'If email exists, password reset link has been sent',
      };
    }
    catch (error) {
      throw new BadRequestError('process failed')
    }
  }

  /**
  * Reset password
  */
  async resetPassword(dto: ResetPasswordDto) {
    try {
      // Get user from reset token
      const tokenData = await this.cacheService.get<{ userId: string }>(
        `password_reset:${dto.token}`,
      );

      if (!tokenData) {
        throw new BadRequestError('Invalid or expired reset token');
      }

      const user = await this.userRepository.findOne({
        where: { id: tokenData.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Hash new password
      const newPasswordHash = await this.passwordService.hashPassword(dto.newPassword);
      user.passwordHash = newPasswordHash;
      await this.userRepository.save(user);

      // Delete reset token
      await this.cacheService.delete(`password_reset:${dto.token}`);

      // Invalidate all sessions
      await this.security.killAllSessions(user.id);

      // this.logger.logAuthEvent({
      //   type: 'PASSWORD_RESET',
      //   userId: user.id,
      //   email: user.email,
      //   ip: '',
      //   success: true,
      // });

      return {
        success: true,
        message: 'Password reset successfully',
      };
    }
    catch (error) {
      throw new ServiceUnavailableError("an error happend");
    }
  }


  /**
   * Validate user credentials
   */
  async validate(email: string, password: string, ctx?: RequestContext): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { email },
        select: ['id', 'email', 'passwordHash', 'status', 'tier', 'kycLevel', 'twoFactorEnabled', 'twoFactorSecret'],
      });

      if (!user) {

        await this.rateLimitService.checkRateLimit(user.id, {
          windowMs: 5 * 60 * 1000,
          maxRequests: 10,
          blockDurationMs: 15 * 60 * 1000,
          keyPrefix: 'user'
        });

        throw new UnauthorizedError('Invalid credentials')
      };

      const isPasswordValid = await this.passwordService.verifyPassword(user.passwordHash, password);
      if (!isPasswordValid) {

        await this.rateLimitService.checkRateLimit(user.id, {
          windowMs: 5 * 60 * 1000,
          maxRequests: 10,
          blockDurationMs: 15 * 60 * 1000,
          keyPrefix: 'user'
        });

        await this.security.logLoginAttempt({
          userId: user.id,
          success: false,
          failureReason: 'Invalid credentials',
          ipAddress: ctx?.ipAddress || ''
        });

        throw new UnauthorizedError('Invalid credentials');
      };
      return user;
    }
    catch (error) {
      throw new ServiceUnavailableError("an error happend");
    }
  }

  /**
 * Gets complete user profile (profile + preferences + limits)
 */
  async getUserProfile(userId: string): Promise<{
    profile: UserProfile;
    preferences: UserPreferences;
    limits: UserLimits;
  }> {
    try {
      const profile = await this.profileRepository.findOne({
        where: { userId },
      });

      if (profile.avatarUrl) {
        profile.avatarUrl = await this.storageService.getFileUrl("user-profiles", profile.avatarUrl);
      }

      const preferences = await this.preferencesRepository.findOne({
        where: { userId },
      });

      const limits = await this.limitsRepository.findOne({
        where: { userId },
      });

      if (!profile) {
        throw new NotFoundException('User profile not found');
      }

      // Create preferences and limits if they don't exist
      const userPreferences = preferences || await this.createDefaultPreferences(userId);
      const userLimits = limits || await this.createDefaultLimits(userId);

      return {
        profile,
        preferences: userPreferences,
        limits: userLimits,
      };
    }
    catch (error) {
      throw new ServiceUnavailableError('failed to get user profile')
    }
  }

  /**
   * Updates user profile
   */
  async updateUserProfile(
    userId: string,
    updateDto: UpdateUserProfileDto,
  ): Promise<UserProfile> {
    try {
      let profile = await this.profileRepository.findOne({
        where: { userId },
      });

      const updatedFields = {};

      if (!profile) {
        // Create new profile if it doesn't exist
        profile = this.profileRepository.create({
          userId,
          firstName: updateDto.firstName || '',
          lastName: updateDto.lastName || '',
        });
      }

      // Update fields
      if (updateDto.firstName) {
        profile.firstName = updateDto.firstName;
        Object.assign(updatedFields, { firstName: updateDto.firstName });
      };
      if (updateDto.lastName) {
        profile.lastName = updateDto.lastName;
        Object.assign(updatedFields, { lastName: updateDto.lastName });
      };
      if (updateDto.dateOfBirth) {
        profile.dateOfBirth = new Date(updateDto.dateOfBirth);
        Object.assign(updatedFields, { dateOfBirth: updateDto.dateOfBirth });
      };
      if (updateDto.country) {
        profile.country = updateDto.country;
        Object.assign(updatedFields, { country: updateDto.country });
      };
      if (updateDto.city) {
        profile.city = updateDto.city;
        Object.assign(updatedFields, { city: updateDto.city });
      };
      if (updateDto.address) {
        profile.address = updateDto.address;
        Object.assign(updatedFields, { address: updateDto.address });
      };
      if (updateDto.postalCode) {
        profile.postalCode = updateDto.postalCode;
        Object.assign(updatedFields, { postalCode: updateDto.postalCode });
      }
      if (updateDto.bio !== undefined) {
        profile.bio = updateDto.bio;
        Object.assign(updatedFields, { bio: updateDto.bio });
      };

      const updatedProfile = await this.profileRepository.save(profile);

      await this.userEvents.publishProfileUpdated({
        version: "1",
        eventId: this.tokenService.generateRandomToken(),
        timestamp: new Date(),
        userId: userId,
        updatedFields: Object.keys(updatedFields),
        changes: updatedFields
      });

      return updatedProfile;
    }
    catch (error) {
      throw new ServiceUnavailableError('failed to update profile')
    }
  }

  /**
   * Uploads and updates user avatar
   */
  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
    mimeType: string
  ): Promise<{ avatarUrl: string }> {
    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(mimeType)) {
        throw new BadRequestError('Invalid file type. Only images are allowed.');
      }

      // Validate file size (max 5MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new BadRequestError('File size exceeds 5MB limit');
      }

      // Generate unique object name
      const ext = file.originalname.split('.').pop();
      const objectName = `avatars/${userId}_${Date.now()}.${ext}`;

      // Upload to storage
      await this.storageService.uploadFile('user-profiles', objectName, file.buffer, file.size, {
        'Content-Type': file.mimetype,
      });

      // Update profile with new avatar URL
      let profile = await this.profileRepository.findOne({
        where: { userId },
      });

      if (!profile) {
        throw new NotFoundException('User profile not found');
      }

      // Delete old avatar if exists
      if (profile.avatarUrl) {
        try {
          await this.storageService.deleteFile("user-profiles", profile.avatarUrl);
        } catch (error) {
          // Log error but don't fail the upload
          console.error('Failed to delete old avatar:', error);
        }
      }

      await this.userEvents.publishAvatarUploaded({
        avatarUrl: objectName,
        previousAvatarUrl: profile.avatarUrl,
        eventId: this.tokenService.generateRandomToken(),
        timestamp: new Date(),
        userId,
        version: "1"
      });

      profile.avatarUrl = objectName;
      await this.profileRepository.save(profile);

      return { avatarUrl: objectName };
    }
    catch (error) {
      throw new ServiceUnavailableError('failed to upload avatar')
    }
  }

  /**
   * Updates user preferences
   */
  async updateUserPreferences(
    userId: string,
    updateDto: UpdateUserPreferencesDto,
  ): Promise<UserPreferences> {
    try {
      let preferences = await this.preferencesRepository.findOne({
        where: { userId },
      });

      if (!preferences) {
        preferences = await this.createDefaultPreferences(userId);
      }

      // Update fields
      if (updateDto.language !== undefined) preferences.language = updateDto.language;
      if (updateDto.currency !== undefined) preferences.currency = updateDto.currency;
      if (updateDto.timezone !== undefined) preferences.timezone = updateDto.timezone;
      if (updateDto.notificationEmail !== undefined)
        preferences.notificationEmail = updateDto.notificationEmail;
      if (updateDto.notificationSms !== undefined)
        preferences.notificationSms = updateDto.notificationSms;
      if (updateDto.notificationPush !== undefined)
        preferences.notificationPush = updateDto.notificationPush;
      if (updateDto.notificationTradingAlerts !== undefined)
        preferences.notificationTradingAlerts = updateDto.notificationTradingAlerts;
      if (updateDto.notificationPriceAlerts !== undefined)
        preferences.notificationPriceAlerts = updateDto.notificationPriceAlerts;
      if (updateDto.notificationNewsletters !== undefined)
        preferences.notificationNewsletters = updateDto.notificationNewsletters;
      if (updateDto.tradingConfirmations !== undefined)
        preferences.tradingConfirmations = updateDto.tradingConfirmations;
      if (updateDto.tradingAutoCompound !== undefined)
        preferences.tradingAutoCompound = updateDto.tradingAutoCompound;
      if (updateDto.tradingDefaultOrderType !== undefined)
        preferences.tradingDefaultOrderType = updateDto.tradingDefaultOrderType;

      await this.userEvents.publishPreferencesUpdated({
        eventId: this.tokenService.generateRandomToken(),
        timestamp: new Date(),
        userId,
        version: "1",
        preferences: { ...preferences }
      })

      return await this.preferencesRepository.save(preferences);
    }
    catch (error) {
      throw new ServiceUnavailableError('failed to update preferences')
    }
  }

  /**
   * Gets user limits
   */
  async getUserLimits(userId: string): Promise<UserLimits> {
    try {
      let limits = await this.limitsRepository.findOne({
        where: { userId },
      });

      if (!limits) {
        limits = await this.createDefaultLimits(userId);
      }

      // Reset daily limits if needed
      const now = new Date();
      const lastResetDaily = new Date(limits.lastResetDaily);
      if (now.getDate() !== lastResetDaily.getDate()) {
        limits.currentDailyWithdrawal = 0;
        limits.currentDailyDeposit = 0;
        limits.currentDailyTrade = 0;
        limits.lastResetDaily = now;
        await this.limitsRepository.save(limits);
      }

      // Reset monthly limits if needed
      const lastResetMonthly = new Date(limits.lastResetMonthly);
      if (now.getMonth() !== lastResetMonthly.getMonth()) {
        limits.currentMonthlyWithdrawal = 0;
        limits.currentMonthlyDeposit = 0;
        limits.currentMonthlyTrade = 0;
        limits.lastResetMonthly = now;
        await this.limitsRepository.save(limits);
      }

      return limits;
    }
    catch (error) {
      throw new ServiceUnavailableError('failed to update limit')
    }
  }

  /**
   * Updates user KYC level and limits
   */
  async updateUserKycLevel(
    userId: string,
    kycLevel: KycLevel,
  ): Promise<UserLimits> {
    try {
      let limits = await this.limitsRepository.findOne({
        where: { userId },
      });

      if (!limits) {
        limits = await this.createDefaultLimits(userId);
      }

      limits.kycLevel = kycLevel;

      // Set limits based on KYC level
      switch (kycLevel) {
        case KYC_LEVELS.NONE:
          // Email verified only - very limited
          limits.dailyWithdrawalLimit = 0;
          limits.monthlyWithdrawalLimit = 0;
          limits.dailyDepositLimit = 100;
          limits.monthlyDepositLimit = 1000;
          limits.dailyTradeLimit = 100;
          limits.monthlyTradeLimit = 1000;
          break;

        case KYC_LEVELS.BASIC:
          // Basic KYC - $1000/day withdrawal
          limits.dailyWithdrawalLimit = 1000;
          limits.monthlyWithdrawalLimit = 10000;
          limits.dailyDepositLimit = 10000;
          limits.monthlyDepositLimit = 100000;
          limits.dailyTradeLimit = 10000;
          limits.monthlyTradeLimit = 100000;
          break;

        case KYC_LEVELS.INTERMEDIATE:
          // Advanced KYC - $50,000/day withdrawal
          limits.dailyWithdrawalLimit = 50000;
          limits.monthlyWithdrawalLimit = 500000;
          limits.dailyDepositLimit = 100000;
          limits.monthlyDepositLimit = 1000000;
          limits.dailyTradeLimit = 100000;
          limits.monthlyTradeLimit = 1000000;
          break;

        case KYC_LEVELS.ADVANCED:
          // Enhanced KYC - Unlimited
          limits.dailyWithdrawalLimit = 999999999;
          limits.monthlyWithdrawalLimit = 999999999;
          limits.dailyDepositLimit = 999999999;
          limits.monthlyDepositLimit = 999999999;
          limits.dailyTradeLimit = 999999999;
          limits.monthlyTradeLimit = 999999999;
          break;
      }

      return await this.limitsRepository.save(limits);
    }
    catch (error) {
      throw new ServiceUnavailableError('failed to update')
    }
  }

  /**
   * Checks if user can perform an action based on limits
   */
  async checkLimit(
    userId: string,
    limitType: 'withdrawal' | 'deposit' | 'trade',
    amount: number,
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const limits = await this.getUserLimits(userId);

      let dailyLimit: number;
      let monthlyLimit: number;
      let currentDaily: number;
      let currentMonthly: number;

      switch (limitType) {
        case 'withdrawal':
          dailyLimit = limits.dailyWithdrawalLimit;
          monthlyLimit = limits.monthlyWithdrawalLimit;
          currentDaily = limits.currentDailyWithdrawal;
          currentMonthly = limits.currentMonthlyWithdrawal;
          break;
        case 'deposit':
          dailyLimit = limits.dailyDepositLimit;
          monthlyLimit = limits.monthlyDepositLimit;
          currentDaily = limits.currentDailyDeposit;
          currentMonthly = limits.currentMonthlyDeposit;
          break;
        case 'trade':
          dailyLimit = limits.dailyTradeLimit;
          monthlyLimit = limits.monthlyTradeLimit;
          currentDaily = limits.currentDailyTrade;
          currentMonthly = limits.currentMonthlyTrade;
          break;
      }

      if (currentDaily + amount > dailyLimit) {
        return {
          allowed: false,
          reason: `Daily ${limitType} limit exceeded. Limit: $${dailyLimit}, Current: $${currentDaily}`,
        };
      }

      if (currentMonthly + amount > monthlyLimit) {
        return {
          allowed: false,
          reason: `Monthly ${limitType} limit exceeded. Limit: $${monthlyLimit}, Current: $${currentMonthly}`,
        };
      }

      return { allowed: true };
    }
    catch (error) {
      throw new ServiceUnavailableError('failed to check limit')
    }
  }

  /**
   * Records a transaction against user limits
   */
  async recordTransaction(
    userId: string,
    limitType: 'withdrawal' | 'deposit' | 'trade',
    amount: number,
  ): Promise<void> {
    try {
      const limits = await this.getUserLimits(userId);

      switch (limitType) {
        case 'withdrawal':
          limits.currentDailyWithdrawal += amount;
          limits.currentMonthlyWithdrawal += amount;
          break;
        case 'deposit':
          limits.currentDailyDeposit += amount;
          limits.currentMonthlyDeposit += amount;
          break;
        case 'trade':
          limits.currentDailyTrade += amount;
          limits.currentMonthlyTrade += amount;
          break;
      }

      await this.limitsRepository.save(limits);
    }
    catch (error) {
      throw new ServiceUnavailableError('failed to recored transaction')
    }
  }

  /**
   * Creates initial user profile (called by auth service after registration)
   */
  async createUserProfile(userId: string): Promise<{
    profile: UserProfile;
    preferences: UserPreferences;
    limits: UserLimits;
  }> {
    try {
      // Check if profile already exists
      const existingProfile = await this.profileRepository.findOne({
        where: { userId },
      });

      if (existingProfile) {
        // Profile already exists, return it with preferences and limits
        const preferences = await this.preferencesRepository.findOne({
          where: { userId },
        }) || await this.createDefaultPreferences(userId);

        const limits = await this.limitsRepository.findOne({
          where: { userId },
        }) || await this.createDefaultLimits(userId);

        return {
          profile: existingProfile,
          preferences,
          limits,
        };
      }

      // Create new profile
      const profile = this.profileRepository.create({
        userId,
        firstName: '',
        lastName: '',
        country: '',
        city: '',
        address: '',
        postalCode: '',
        avatarUrl: '',
        bio: '',
      });

      await this.profileRepository.save(profile);

      // Create default preferences and limits
      const preferences = await this.createDefaultPreferences(userId);
      const limits = await this.createDefaultLimits(userId);

      return {
        profile,
        preferences,
        limits,
      };
    }
    catch (error) {
      throw new ServiceUnavailableError('failed to create profile')
    }
  }

  /**
   * Creates default preferences for a user
   */
  private async createDefaultPreferences(userId: string): Promise<UserPreferences> {
    try {
      const preferences = this.preferencesRepository.create({
        userId,
        language: 'en',
        currency: 'USD',
        timezone: 'UTC',
        notificationEmail: true,
        notificationSms: false,
        notificationPush: true,
        notificationTradingAlerts: true,
        notificationPriceAlerts: true,
        notificationNewsletters: false,
        tradingConfirmations: true,
        tradingAutoCompound: false,
        tradingDefaultOrderType: 'LIMIT',
      });

      return await this.preferencesRepository.save(preferences);
    }
    catch (error) {
      throw new ServiceUnavailableError('failed to create preferences')
    }
  }

  /**
   * Creates default limits for a user (Level 0)
   */
  private async createDefaultLimits(userId: string): Promise<UserLimits> {
    try {
      const limits = this.limitsRepository.create({
        userId,
        kycLevel: KYC_LEVELS.NONE,
        dailyWithdrawalLimit: 0,
        monthlyWithdrawalLimit: 0,
        dailyDepositLimit: 100,
        monthlyDepositLimit: 1000,
        dailyTradeLimit: 100,
        monthlyTradeLimit: 1000,
        currentDailyWithdrawal: 0,
        currentMonthlyWithdrawal: 0,
        currentDailyDeposit: 0,
        currentMonthlyDeposit: 0,
        currentDailyTrade: 0,
        currentMonthlyTrade: 0,
        lastResetDaily: new Date(),
        lastResetMonthly: new Date(),
      });

      return await this.limitsRepository.save(limits);
    }
    catch (error) {
      throw new ServiceUnavailableError('failed to create default limits')
    }
  }
}
