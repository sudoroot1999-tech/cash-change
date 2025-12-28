import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin, AdminRole } from './entities/admin.entity';
import { AdminLoginDto, AdminLoginResponseDto } from './dto/login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: AdminLoginDto, ipAddress?: string): Promise<AdminLoginResponseDto> {
    const admin = await this.adminRepository.findOne({
      where: { email: dto.email },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await admin.validatePassword(dto.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    admin.lastLoginAt = new Date();
    admin.lastLoginIp = ipAddress;
    await this.adminRepository.save(admin);

    const payload = {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
      },
    };
  }

  async createAdmin(dto: CreateAdminDto): Promise<Admin> {
    const existing = await this.adminRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Admin with this email already exists');
    }

    const admin = this.adminRepository.create({
      email: dto.email,
      passwordHash: dto.password,
      fullName: dto.fullName,
      role: dto.role,
      isActive: dto.isActive ?? true,
    });

    return this.adminRepository.save(admin);
  }

  async findById(id: string): Promise<Admin> {
    const admin = await this.adminRepository.findOne({ where: { id } });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    return admin;
  }

  async findAll(): Promise<Admin[]> {
    return this.adminRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: string, isActive: boolean): Promise<Admin> {
    const admin = await this.findById(id);
    admin.isActive = isActive;
    return this.adminRepository.save(admin);
  }
}
