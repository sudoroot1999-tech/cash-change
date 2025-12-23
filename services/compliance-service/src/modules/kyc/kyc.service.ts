import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KycRequest, KycStatus, KycLevel } from './entities/kyc-request.entity';
import { SubmitKycDto, ReviewKycDto } from './dto/kyc.dto';
import { ClientProxy } from '@nestjs/microservices';
import { RABBITMQ } from '@exchange/common';

@Injectable()
export class KycService implements OnModuleInit {
  private readonly logger = new Logger(KycService.name);
  private userService: any;

  constructor(
    @InjectRepository(KycRequest)
    private readonly kycRepository: Repository<KycRequest>,
    @Inject('USER_PACKAGE') private readonly client: ClientGrpc,
    @Inject('COMPLIANCE_PACKAGE') private readonly rmqClient: ClientProxy,
  ) {}

  onModuleInit() {
    this.userService = this.client.getService<any>('UserService');
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
    request.rejectionReason = dto.reason || null;
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();

    const saved = await this.kycRepository.save(request);

    if (status === KycStatus.APPROVED) {
      await this.updateUserKycLevel(request.userId, request.level);
    }

    // Emit event to RabbitMQ
    this.rmqClient.emit(RABBITMQ.QUEUES.KYC_UPDATED, {
      userId: request.userId,
      level: request.level,
      status: request.status,
      timestamp: new Date().toISOString(),
    });

    return saved;
  }

  private async updateUserKycLevel(userId: string, level: KycLevel): Promise<void> {
    try {
      await this.userService.updateKycLevel({ user_id: userId, kyc_level: level }).toPromise();
      this.logger.log(`Successfully updated user ${userId} KYC level to ${level} via gRPC`);
    } catch (error) {
      this.logger.error(`Failed to update user KYC level: ${(error as any).message}`);
    }
  }
}
