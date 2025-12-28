import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { RABBITMQ } from '@exchange/common';
import { User, UserStatus } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject('USERS_PACKAGE') private readonly client: ClientProxy,
  ) {}

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
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
    const passwordHash = await bcrypt.hash(createUserDto.password, 12);

    // Generate referral code
    const referralCode = this.generateReferralCode();

    // Find referrer if referral code provided
    let referredBy: string | null = null;
    if (createUserDto.referralCode) {
      const referrer = await this.userRepository.findOne({
        where: { referralCode: createUserDto.referralCode },
      });
      if (referrer) {
        referredBy = referrer.id;
      }
    }

    // Create user
    const user = this.userRepository.create({
      email: createUserDto.email,
      username: createUserDto.username || null,
      phone: createUserDto.phone || null,
      passwordHash,
      referralCode,
      referredBy,
      status: UserStatus.PENDING,
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`User created: ${savedUser.id}`);

    // Emit event to RabbitMQ
    this.client.emit(RABBITMQ.QUEUES.USER_CREATED, {
      id: savedUser.id,
      email: savedUser.email,
      timestamp: new Date().toISOString(),
    });

    return savedUser;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * Find user by referral code
   */
  async findByReferralCode(referralCode: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { referralCode } });
  }

  /**
   * Update user
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
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

  /**
   * Verify user email
   */
  async verifyEmail(id: string): Promise<User> {
    const user = await this.findById(id);
    user.emailVerified = true;
    if (user.status === UserStatus.PENDING) {
      user.status = UserStatus.ACTIVE;
    }
    return this.userRepository.save(user);
  }

  /**
   * Verify user phone
   */
  async verifyPhone(id: string): Promise<User> {
    const user = await this.findById(id);
    user.phoneVerified = true;
    return this.userRepository.save(user);
  }

  /**
   * Enable 2FA
   */
  async enable2FA(id: string, secret: string): Promise<User> {
    const user = await this.findById(id);
    user.twoFactorSecret = secret;
    user.twoFactorEnabled = true;
    return this.userRepository.save(user);
  }

  /**
   * Disable 2FA
   */
  async disable2FA(id: string): Promise<User> {
    const user = await this.findById(id);
    user.twoFactorSecret = null;
    user.twoFactorEnabled = false;
    return this.userRepository.save(user);
  }

  /**
   * Update KYC level
   */
  async updateKycLevel(id: string, kycLevel: number): Promise<User> {
    const user = await this.findById(id);
    user.kycLevel = kycLevel;
    const saved = await this.userRepository.save(user);

    // Emit event to RabbitMQ
    this.client.emit(RABBITMQ.QUEUES.KYC_UPDATED, {
      userId: saved.id,
      level: saved.kycLevel,
      status: 'active', // If updated via this method, we assume it's part of an approval flow
      timestamp: new Date().toISOString(),
    });

    return saved;
  }

  /**
   * Get referrals for a user
   */
  async getReferrals(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: User[]; total: number }> {
    const [items, total] = await this.userRepository.findAndCount({
      where: { referredBy: userId },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { items, total };
  }

  /**
   * Generate a unique referral code
   */
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Verify password
   */
  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  /**
   * Update password
   */
  async updatePassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepository.update(id, { passwordHash });
  }

  /**
   * Validate user credentials
   */
  async validate(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'passwordHash', 'status', 'tier', 'kycLevel', 'twoFactorEnabled', 'twoFactorSecret'],
    });

    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) return null;

    return user;
  }
}
