import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { KycRequest, KycStatus, KycLevel } from './entities/kyc-request.entity';
import { SubmitKycDto, ReviewKycDto } from './dto/kyc.dto';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  private readonly userServiceUrl: string;

  constructor(
    @InjectRepository(KycRequest)
    private readonly kycRepository: Repository<KycRequest>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.userServiceUrl = this.configService.get('USER_SERVICE_URL', 'http://user-service:3001');
  }

  async submit(userId: string, dto: SubmitKycDto): Promise<KycRequest> {
    // Check for existing pending request
    const existing = await this.kycRepository.findOne({
      where: { userId, status: KycStatus.PENDING },
    });

    if (existing) {
      throw new BadRequestException('You already have a pending KYC request');
    }

    const request = this.kycRepository.create({
      userId,
      level: dto.level,
      status: KycStatus.PENDING,
      firstName: dto.firstName,
      lastName: dto.lastName,
      dob: dto.dob,
      country: dto.country,
      documents: {}, // Documents would be uploaded separately
    });

    return this.kycRepository.save(request);
  }

  async getStatus(userId: string): Promise<KycRequest | null> {
    return this.kycRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async review(adminId: string, requestId: string, dto: ReviewKycDto): Promise<KycRequest> {
    const request = await this.kycRepository.findOne({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('KYC request not found');
    }

    if (request.status !== KycStatus.PENDING) {
      throw new BadRequestException('Request is not pending');
    }

    let status: KycStatus;
    switch (dto.decision) {
      case 'approved': status = KycStatus.APPROVED; break;
      case 'rejected': status = KycStatus.REJECTED; break;
      case 'more_info_required': status = KycStatus.MORE_INFO_REQUIRED; break;
    }

    request.status = status;
    request.rejectionReason = dto.reason;
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();

    const saved = await this.kycRepository.save(request);

    if (status === KycStatus.APPROVED) {
      await this.updateUserKycLevel(request.userId, request.level);
    }

    return saved;
  }

  private async updateUserKycLevel(userId: string, level: KycLevel): Promise<void> {
    try {
      // Internal call to user service to update level
      // In a real system, you might use a secure system token or similar mechanism
      // For MVP we might skip auth or use a shared secret header
      await lastValueFrom(
        this.httpService.patch(`${this.userServiceUrl}/api/v1/users/${userId}/kyc-level`, {
          level: level,
        })
      );
    } catch (error) {
      this.logger.error(`Failed to update user KYC level: ${error.message}`);
      // Typically we might want to transactions or retries here
    }
  }
}
