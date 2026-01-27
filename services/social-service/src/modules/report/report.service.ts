import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportReason, ReportStatus, ReportTargetType } from '../../database/entities';
import { PaginationDto, createPaginationMeta } from '../../common/dto';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report)
    private reportRepo: Repository<Report>,
  ) {}

  async create(reporterId: string, data: { targetType: ReportTargetType; targetId: string; reason: ReportReason; description?: string; evidenceUrls?: string[] }): Promise<Report> {
    const report = this.reportRepo.create({ reporterId, ...data });
    return this.reportRepo.save(report);
  }

  async findById(id: string): Promise<Report> {
    const report = await this.reportRepo.findOne({ where: { id }, relations: ['reporter'] });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async getMyReports(reporterId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const [reports, total] = await this.reportRepo.findAndCount({
      where: { reporterId },
      take: limit,
      skip: (page - 1) * limit,
      order: { createdAt: 'DESC' },
    });
    return { items: reports, meta: createPaginationMeta(page, limit, total) };
  }

  async getPendingReports(pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const [reports, total] = await this.reportRepo.findAndCount({
      where: { status: ReportStatus.PENDING },
      relations: ['reporter'],
      take: limit,
      skip: (page - 1) * limit,
      order: { createdAt: 'ASC' },
    });
    return { items: reports, meta: createPaginationMeta(page, limit, total) };
  }

  async updateStatus(id: string, reviewerId: string, status: ReportStatus, resolution?: string): Promise<Report> {
    const report = await this.findById(id);
    report.status = status;
    report.reviewerId = reviewerId;
    report.resolution = resolution;
    if ([ReportStatus.RESOLVED, ReportStatus.DISMISSED].includes(status)) {
      report.resolvedAt = new Date();
    }
    return this.reportRepo.save(report);
  }

  async getReportsByTarget(targetType: ReportTargetType, targetId: string) {
    return this.reportRepo.find({
      where: { targetType, targetId },
      relations: ['reporter'],
      order: { createdAt: 'DESC' },
    });
  }
}
