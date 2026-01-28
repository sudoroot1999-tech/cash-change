import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Discussion, DiscussionType, DiscussionStatus } from '../../entities';
import { createPaginatedResponse, IPaginatedResponse } from '../../dto/paginated-response.dto';
import { PaginationDto } from '../../dto/pagination.dto';

@Injectable()
export class DiscussionService {
  constructor(
    @InjectRepository(Discussion) private discussionRepository: Repository<Discussion>,
  ) {}

  async create(createDto: any): Promise<Discussion> {
    const discussion = this.discussionRepository.create(createDto);
    return this.discussionRepository.save(discussion);
  }

  async findByLesson(lessonId: string, paginationDto: PaginationDto): Promise<IPaginatedResponse<Discussion>> {
    const { page = 1, limit = 10 } = paginationDto;
    const [items, total] = await this.discussionRepository.findAndCount({
      where: { lessonId, status: DiscussionStatus.ACTIVE },
      order: { pinned: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return createPaginatedResponse(items, total, page, limit);
  }

  async findByCourse(courseId: string, paginationDto: PaginationDto, type?: DiscussionType): Promise<IPaginatedResponse<Discussion>> {
    const { page = 1, limit = 10 } = paginationDto;
    const where: any = { courseId, status: DiscussionStatus.ACTIVE };
    if (type) where.type = type;
    const [items, total] = await this.discussionRepository.findAndCount({
      where,
      order: { pinned: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return createPaginatedResponse(items, total, page, limit);
  }

  async findOne(id: string): Promise<Discussion> {
    const discussion = await this.discussionRepository.findOne({ where: { id } });
    if (!discussion) throw new NotFoundException(`Discussion with ID ${id} not found`);
    // Increment views
    discussion.views += 1;
    await this.discussionRepository.save(discussion);
    return discussion;
  }

  async update(id: string, updateDto: any): Promise<Discussion> {
    const discussion = await this.findOne(id);
    Object.assign(discussion, updateDto);
    return this.discussionRepository.save(discussion);
  }

  async remove(id: string): Promise<void> {
    const discussion = await this.findOne(id);
    await this.discussionRepository.remove(discussion);
  }

  async addReply(id: string, userId: string, userName: string, content: string, isInstructor: boolean = false): Promise<Discussion> {
    const discussion = await this.findOne(id);
    discussion.replies.push({
      id: uuidv4(),
      userId,
      userName,
      content,
      isInstructor,
      isSolution: false,
      likes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return this.discussionRepository.save(discussion);
  }

  async markAsSolution(discussionId: string, replyId: string): Promise<Discussion> {
    const discussion = await this.findOne(discussionId);
    discussion.replies = discussion.replies.map(r => ({ ...r, isSolution: r.id === replyId }));
    discussion.solved = true;
    return this.discussionRepository.save(discussion);
  }

  async togglePin(id: string): Promise<Discussion> {
    const discussion = await this.findOne(id);
    discussion.pinned = !discussion.pinned;
    return this.discussionRepository.save(discussion);
  }

  async toggleLock(id: string): Promise<Discussion> {
    const discussion = await this.findOne(id);
    discussion.locked = !discussion.locked;
    return this.discussionRepository.save(discussion);
  }

  async like(id: string): Promise<Discussion> {
    await this.discussionRepository.increment({ id }, 'likes', 1);
    return this.findOne(id);
  }
}
