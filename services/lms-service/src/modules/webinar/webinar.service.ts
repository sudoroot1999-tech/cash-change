import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Webinar, WebinarStatus, WebinarRegistration } from '../../database/entities';
import { createPaginatedResponse, IPaginatedResponse } from '../../common/dto/paginated-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class WebinarService {
  constructor(
    @InjectRepository(Webinar) private webinarRepository: Repository<Webinar>,
    @InjectRepository(WebinarRegistration) private registrationRepository: Repository<WebinarRegistration>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private generateSlug(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').concat('-', Date.now().toString(36));
  }

  async create(createDto: any): Promise<Webinar> {
    const slug = this.generateSlug(createDto.title);
    const webinar = this.webinarRepository.create({ ...createDto, slug });
    return this.webinarRepository.save(webinar);
  }

  async findAll(paginationDto: PaginationDto, status?: WebinarStatus): Promise<IPaginatedResponse<Webinar>> {
    const { page = 1, limit = 10 } = paginationDto;
    const queryBuilder = this.webinarRepository.createQueryBuilder('webinar');
    if (status) queryBuilder.where('webinar.status = :status', { status });
    queryBuilder.orderBy('webinar.scheduledAt', 'ASC');
    const total = await queryBuilder.getCount();
    const items = await queryBuilder.skip((page - 1) * limit).take(limit).getMany();
    return createPaginatedResponse(items, total, page, limit);
  }

  async findOne(id: string): Promise<Webinar> {
    const webinar = await this.webinarRepository.findOne({ where: { id } });
    if (!webinar) throw new NotFoundException(`Webinar with ID ${id} not found`);
    return webinar;
  }

  async findBySlug(slug: string): Promise<Webinar> {
    const webinar = await this.webinarRepository.findOne({ where: { slug } });
    if (!webinar) throw new NotFoundException(`Webinar not found`);
    return webinar;
  }

  async update(id: string, updateDto: any): Promise<Webinar> {
    const webinar = await this.findOne(id);
    Object.assign(webinar, updateDto);
    return this.webinarRepository.save(webinar);
  }

  async remove(id: string): Promise<void> {
    const webinar = await this.findOne(id);
    await this.webinarRepository.remove(webinar);
  }

  async register(userId: string, webinarId: string): Promise<WebinarRegistration> {
    const existing = await this.registrationRepository.findOne({ where: { userId, webinarId } });
    if (existing) throw new ConflictException('Already registered');
    const webinar = await this.findOne(webinarId);
    if (webinar.maxAttendees && webinar.registrations >= webinar.maxAttendees) {
      throw new ConflictException('Webinar is full');
    }
    const registration = this.registrationRepository.create({ userId, webinarId });
    await this.webinarRepository.increment({ id: webinarId }, 'registrations', 1);
    return this.registrationRepository.save(registration);
  }

  async getUpcoming(limit: number = 10): Promise<Webinar[]> {
    return this.webinarRepository.find({
      where: { status: WebinarStatus.SCHEDULED, scheduledAt: MoreThan(new Date()) },
      order: { scheduledAt: 'ASC' },
      take: limit,
    });
  }

  async getLive(): Promise<Webinar[]> {
    return this.webinarRepository.find({ where: { status: WebinarStatus.LIVE } });
  }

  async getUserRegistrations(userId: string): Promise<WebinarRegistration[]> {
    return this.registrationRepository.find({ where: { userId }, relations: ['webinar'] });
  }

  async updateStatus(id: string, status: WebinarStatus): Promise<Webinar> {
    const webinar = await this.findOne(id);
    webinar.status = status;
    return this.webinarRepository.save(webinar);
  }
}
