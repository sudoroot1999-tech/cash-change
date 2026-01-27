import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';
import { Certificate, CertificateType } from '../../database/entities/certificate.entity';
import { IssueCertificateDto } from './dto/issue-certificate.dto';
import { createPaginatedResponse, IPaginatedResponse } from '../../common/dto/paginated-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class CertificateService {
  constructor(
    @InjectRepository(Certificate)
    private certificateRepository: Repository<Certificate>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async issue(issueDto: IssueCertificateDto): Promise<Certificate> {
    const certificateNumber = this.generateCertificateNumber();
    const verificationCode = this.generateVerificationCode();

    const certificate = this.certificateRepository.create({
      ...issueDto,
      certificateNumber,
      verification: {
        verificationCode,
        verificationUrl: `${process.env.APP_URL || 'http://localhost:3000'}/certificates/verify/${verificationCode}`,
      },
    });

    return this.certificateRepository.save(certificate);
  }

  async findOne(id: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!certificate) {
      throw new NotFoundException(`Certificate with ID ${id} not found`);
    }

    return certificate;
  }

  async findByNumber(certificateNumber: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { certificateNumber },
      relations: ['course'],
    });

    if (!certificate) {
      throw new NotFoundException(`Certificate not found`);
    }

    return certificate;
  }

  async verify(verificationCode: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { verification: { verificationCode } },
      relations: ['course'],
    });

    if (!certificate) {
      throw new NotFoundException('Invalid verification code');
    }

    if (certificate.revoked) {
      throw new NotFoundException('This certificate has been revoked');
    }

    // Increment views
    certificate.views += 1;
    await this.certificateRepository.save(certificate);

    return certificate;
  }

  async getUserCertificates(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<IPaginatedResponse<Certificate>> {
    const { page = 1, limit = 10 } = paginationDto;

    const [items, total] = await this.certificateRepository.findAndCount({
      where: { userId, revoked: false },
      relations: ['course'],
      order: { issuedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return createPaginatedResponse(items, total, page, limit);
  }

  async revoke(id: string, reason: string): Promise<Certificate> {
    const certificate = await this.findOne(id);

    certificate.revoked = true;
    certificate.revokedAt = new Date();
    certificate.revokedReason = reason;

    return this.certificateRepository.save(certificate);
  }

  async incrementDownloads(id: string): Promise<void> {
    await this.certificateRepository.increment({ id }, 'downloads', 1);
  }

  async shareOnLinkedIn(id: string): Promise<Certificate> {
    const certificate = await this.findOne(id);
    certificate.linkedInShared = true;
    return this.certificateRepository.save(certificate);
  }

  private generateCertificateNumber(): string {
    const prefix = 'CERT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  private generateVerificationCode(): string {
    return uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
  }
}
