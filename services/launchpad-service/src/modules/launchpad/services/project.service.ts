import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LaunchpadProject, ProjectStatus, VettingStatus } from '../entities/launchpad-project.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto, UpdateProjectStatusDto } from '../dto/update-project.dto';
import { ProjectQueryDto } from '../dto/query.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(LaunchpadProject)
    private readonly projectRepository: Repository<LaunchpadProject>,
  ) {}

  async create(createProjectDto: CreateProjectDto, userId: string): Promise<LaunchpadProject> {
    // Validate tokenomics sum to 100
    const tokenomicsSum = Object.values(createProjectDto.tokenomics).reduce(
      (sum, val) => sum + val,
      0,
    );
    
    if (Math.abs(tokenomicsSum - 100) > 0.01) {
      throw new BadRequestException('Tokenomics must sum to 100%');
    }

    const project = this.projectRepository.create({
      ...createProjectDto,
      submittedBy: userId,
      status: ProjectStatus.DRAFT,
      vettingStatus: VettingStatus.PENDING,
    });

    return this.projectRepository.save(project);
  }

  async findAll(query: ProjectQueryDto): Promise<{ data: LaunchpadProject[]; total: number }> {
    const { page = 1, limit = 10, status, search, sortBy = 'createdAt', order = 'DESC', featured } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.projectRepository.createQueryBuilder('project');

    if (status) {
      queryBuilder.andWhere('project.status = :status', { status });
    }

    if (featured !== undefined) {
      queryBuilder.andWhere('project.featured = :featured', { featured });
    }

    if (search) {
      queryBuilder.andWhere(
        '(project.name ILIKE :search OR project.symbol ILIKE :search OR project.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy(`project.${sortBy}`, order)
      .skip(skip)
      .take(limit)
      .leftJoinAndSelect('project.saleRounds', 'saleRounds');

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<LaunchpadProject> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['saleRounds'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Increment view count
    await this.projectRepository.update(id, {
      viewCount: () => 'view_count + 1',
    });

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, userId: string): Promise<LaunchpadProject> {
    const project = await this.findOne(id);

    // Only owner can update draft projects
    if (project.submittedBy !== userId && project.status === ProjectStatus.DRAFT) {
      throw new BadRequestException('You can only update your own projects');
    }

    // Cannot update if project is live or completed
    if ([ProjectStatus.LIVE, ProjectStatus.COMPLETED].includes(project.status)) {
      throw new BadRequestException('Cannot update live or completed projects');
    }

    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateProjectStatusDto,
    reviewerId: string,
  ): Promise<LaunchpadProject> {
    const project = await this.findOne(id);

    if (updateStatusDto.status) {
      project.status = updateStatusDto.status;
    }

    if (updateStatusDto.vettingStatus) {
      project.vettingStatus = updateStatusDto.vettingStatus;
    }

    project.reviewedBy = reviewerId;
    project.reviewedAt = new Date();

    if (updateStatusDto.reviewNotes) {
      project.reviewNotes = updateStatusDto.reviewNotes;
    }

    if (updateStatusDto.rejectionReason) {
      project.rejectionReason = updateStatusDto.rejectionReason;
      project.status = ProjectStatus.REJECTED;
    }

    return this.projectRepository.save(project);
  }

  async submit(id: string, userId: string): Promise<LaunchpadProject> {
    const project = await this.findOne(id);

    if (project.submittedBy !== userId) {
      throw new BadRequestException('You can only submit your own projects');
    }

    if (project.status !== ProjectStatus.DRAFT) {
      throw new BadRequestException('Only draft projects can be submitted');
    }

    project.status = ProjectStatus.SUBMITTED;
    project.vettingStatus = VettingStatus.PENDING;

    return this.projectRepository.save(project);
  }

  async approve(id: string, adminId: string): Promise<LaunchpadProject> {
    const project = await this.findOne(id);

    if (project.status !== ProjectStatus.SUBMITTED && project.status !== ProjectStatus.UNDER_REVIEW) {
      throw new BadRequestException('Only submitted or under review projects can be approved');
    }

    project.status = ProjectStatus.APPROVED;
    project.vettingStatus = VettingStatus.FULLY_VETTED;
    project.reviewedBy = adminId;
    project.reviewedAt = new Date();

    return this.projectRepository.save(project);
  }

  async reject(id: string, adminId: string, reason: string): Promise<LaunchpadProject> {
    const project = await this.findOne(id);

    project.status = ProjectStatus.REJECTED;
    project.vettingStatus = VettingStatus.FAILED;
    project.reviewedBy = adminId;
    project.reviewedAt = new Date();
    project.rejectionReason = reason;

    return this.projectRepository.save(project);
  }

  async setFeatured(id: string, featured: boolean): Promise<LaunchpadProject> {
    const project = await this.findOne(id);
    project.featured = featured;
    return this.projectRepository.save(project);
  }

  async updateVettingDetails(
    id: string,
    field: keyof LaunchpadProject['vettingDetails'],
    value: any,
    adminId: string,
  ): Promise<LaunchpadProject> {
    const project = await this.findOne(id);

    if (!project.vettingDetails) {
      project.vettingDetails = {
        teamVerified: false,
        contractAudited: false,
        legalCompliant: false,
        tokenomicsApproved: false,
        communityVoted: false,
      };
    }

    (project.vettingDetails as any)[field] = value;

    // Add timestamp and admin info
    const timestampField = `${field}At` as any;
    const byField = `${field}By` as any;
    if (project.vettingDetails[timestampField] !== undefined) {
      project.vettingDetails[timestampField] = new Date();
    }
    if (project.vettingDetails[byField] !== undefined) {
      project.vettingDetails[byField] = adminId;
    }

    // Check if all vetting steps are complete
    const allVetted =
      project.vettingDetails.teamVerified &&
      project.vettingDetails.contractAudited &&
      project.vettingDetails.legalCompliant &&
      project.vettingDetails.tokenomicsApproved;

    if (allVetted) {
      project.vettingStatus = VettingStatus.FULLY_VETTED;
    }

    return this.projectRepository.save(project);
  }

  async delete(id: string, userId: string): Promise<void> {
    const project = await this.findOne(id);

    if (project.submittedBy !== userId) {
      throw new BadRequestException('You can only delete your own projects');
    }

    if (project.status !== ProjectStatus.DRAFT) {
      throw new BadRequestException('Only draft projects can be deleted');
    }

    await this.projectRepository.delete(id);
  }

  async getStats(): Promise<any> {
    const [total, draft, submitted, underReview, approved, live, completed] = await Promise.all([
      this.projectRepository.count(),
      this.projectRepository.count({ where: { status: ProjectStatus.DRAFT } }),
      this.projectRepository.count({ where: { status: ProjectStatus.SUBMITTED } }),
      this.projectRepository.count({ where: { status: ProjectStatus.UNDER_REVIEW } }),
      this.projectRepository.count({ where: { status: ProjectStatus.APPROVED } }),
      this.projectRepository.count({ where: { status: ProjectStatus.LIVE } }),
      this.projectRepository.count({ where: { status: ProjectStatus.COMPLETED } }),
    ]);

    return {
      total,
      byStatus: {
        draft,
        submitted,
        underReview,
        approved,
        live,
        completed,
      },
    };
  }
}
