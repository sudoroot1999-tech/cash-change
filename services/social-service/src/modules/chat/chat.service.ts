import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Conversation,
  ConversationType,
  ConversationParticipant,
  ParticipantRole,
  Message,
  MessageStatus,
} from '../../database/entities';
import { CreateConversationDto, SendMessageDto } from './dto';
import { PaginationDto, createPaginationMeta } from '../../common/dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private participantRepo: Repository<ConversationParticipant>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    private eventEmitter: EventEmitter2,
  ) {}

  async createConversation(creatorId: string, dto: CreateConversationDto): Promise<Conversation> {
    // For private chats, check if conversation already exists
    if (dto.type === ConversationType.PRIVATE) {
      if (dto.participantIds.length !== 1) {
        throw new BadRequestException('Private conversation must have exactly one other participant');
      }

      const existingConversation = await this.findPrivateConversation(
        creatorId,
        dto.participantIds[0],
      );

      if (existingConversation) {
        return existingConversation;
      }
    }

    const conversation = this.conversationRepo.create({
      type: dto.type,
      name: dto.name,
      description: dto.description,
      avatarUrl: dto.avatarUrl,
      creatorId,
      participantsCount: dto.participantIds.length + 1,
    });

    const savedConversation = await this.conversationRepo.save(conversation);

    // Add creator as owner
    await this.participantRepo.save({
      userId: creatorId,
      conversationId: savedConversation.id,
      role: ParticipantRole.OWNER,
    });

    // Add other participants
    for (const participantId of dto.participantIds) {
      await this.participantRepo.save({
        userId: participantId,
        conversationId: savedConversation.id,
        role: ParticipantRole.MEMBER,
      });
    }

    return this.getConversation(savedConversation.id, creatorId);
  }

  async getConversation(id: string, userId: string): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({
      where: { id },
      relations: ['participants', 'participants.user'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant
    const isParticipant = conversation.participants?.some(
      (p) => p.userId === userId && !p.leftAt,
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    // Get unread count
    const participant = conversation.participants?.find((p) => p.userId === userId);
    if (participant) {
      const unreadCount = await this.messageRepo.count({
        where: {
          conversationId: id,
          createdAt: participant.lastReadAt
            ? { $gt: participant.lastReadAt } as any
            : undefined,
          senderId: { $ne: userId } as any,
        },
      });
      conversation.unreadCount = unreadCount;
    }

    return conversation;
  }

  async getUserConversations(userId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const participations = await this.participantRepo.find({
      where: { userId, leftAt: IsNull() },
      select: ['conversationId'],
    });

    const conversationIds = participations.map((p) => p.conversationId);

    if (conversationIds.length === 0) {
      return { items: [], meta: createPaginationMeta(page, limit, 0) };
    }

    const [conversations, total] = await this.conversationRepo.findAndCount({
      where: { id: In(conversationIds), isActive: true },
      relations: ['participants', 'participants.user'],
      take: limit,
      skip,
      order: { lastMessageAt: 'DESC' },
    });

    // Add unread counts
    for (const conv of conversations) {
      const participant = conv.participants?.find((p) => p.userId === userId);
      if (participant) {
        conv.unreadCount = await this.getUnreadCount(conv.id, userId, participant.lastReadAt);
      }
    }

    return {
      items: conversations,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    dto: SendMessageDto,
  ): Promise<Message> {
    // Verify sender is a participant
    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId: senderId, leftAt: IsNull() },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    const message = this.messageRepo.create({
      conversationId,
      senderId,
      ...dto,
    });

    const savedMessage = await this.messageRepo.save(message);

    // Update conversation
    await this.conversationRepo.update(conversationId, {
      lastMessageId: savedMessage.id,
      lastMessagePreview: dto.content?.substring(0, 100) || '[Media]',
      lastMessageAt: new Date(),
    });

    // Emit event for real-time delivery
    this.eventEmitter.emit('message.sent', {
      conversationId,
      message: savedMessage,
    });

    return this.getMessage(savedMessage.id, senderId);
  }

  async getMessages(conversationId: string, userId: string, pagination: PaginationDto) {
    // Verify user is a participant
    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId, leftAt: IsNull() },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    const [messages, total] = await this.messageRepo.findAndCount({
      where: { conversationId, deletedAt: IsNull() },
      relations: ['sender', 'replyTo', 'replyTo.sender'],
      take: limit,
      skip,
      order: { createdAt: 'DESC' },
    });

    // Mark messages as own
    for (const msg of messages) {
      msg.isOwn = msg.senderId === userId;
    }

    return {
      items: messages.reverse(),
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async getMessage(id: string, userId: string): Promise<Message> {
    const message = await this.messageRepo.findOne({
      where: { id },
      relations: ['sender', 'replyTo', 'replyTo.sender'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    message.isOwn = message.senderId === userId;
    return message;
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await this.participantRepo.update(
      { conversationId, userId },
      { lastReadAt: new Date() },
    );

    this.eventEmitter.emit('messages.read', { conversationId, userId });
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepo.findOne({ where: { id: messageId } });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.messageRepo.update(messageId, { deletedAt: new Date() });
  }

  async editMessage(messageId: string, userId: string, content: string): Promise<Message> {
    const message = await this.messageRepo.findOne({ where: { id: messageId } });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    message.content = content;
    message.isEdited = true;
    return this.messageRepo.save(message);
  }

  async addParticipants(
    conversationId: string,
    userId: string,
    participantIds: string[],
  ): Promise<Conversation> {
    const conversation = await this.getConversation(conversationId, userId);

    if (conversation.type === ConversationType.PRIVATE) {
      throw new BadRequestException('Cannot add participants to private conversation');
    }

    // Check if user has permission
    const userParticipant = await this.participantRepo.findOne({
      where: { conversationId, userId },
    });

    if (
      !userParticipant ||
      ![ParticipantRole.ADMIN, ParticipantRole.OWNER].includes(userParticipant.role)
    ) {
      throw new ForbiddenException('You do not have permission to add participants');
    }

    for (const participantId of participantIds) {
      const existing = await this.participantRepo.findOne({
        where: { conversationId, userId: participantId },
      });

      if (!existing) {
        await this.participantRepo.save({
          userId: participantId,
          conversationId,
          role: ParticipantRole.MEMBER,
        });
      } else if (existing.leftAt) {
        existing.leftAt = null;
        await this.participantRepo.save(existing);
      }
    }

    await this.conversationRepo.increment({ id: conversationId }, 'participantsCount', participantIds.length);

    return this.getConversation(conversationId, userId);
  }

  async removeParticipant(
    conversationId: string,
    userId: string,
    participantId: string,
  ): Promise<void> {
    const conversation = await this.getConversation(conversationId, userId);

    if (conversation.type === ConversationType.PRIVATE) {
      throw new BadRequestException('Cannot remove participants from private conversation');
    }

    const userParticipant = await this.participantRepo.findOne({
      where: { conversationId, userId },
    });

    // Can remove self or if admin/owner
    if (
      userId !== participantId &&
      (!userParticipant ||
        ![ParticipantRole.ADMIN, ParticipantRole.OWNER].includes(userParticipant.role))
    ) {
      throw new ForbiddenException('You do not have permission to remove participants');
    }

    await this.participantRepo.update(
      { conversationId, userId: participantId },
      { leftAt: new Date() },
    );

    await this.conversationRepo.decrement({ id: conversationId }, 'participantsCount', 1);
  }

  async updateConversation(
    conversationId: string,
    userId: string,
    updates: Partial<Conversation>,
  ): Promise<Conversation> {
    const conversation = await this.getConversation(conversationId, userId);

    if (conversation.type === ConversationType.PRIVATE) {
      throw new BadRequestException('Cannot update private conversation');
    }

    const userParticipant = await this.participantRepo.findOne({
      where: { conversationId, userId },
    });

    if (
      !userParticipant ||
      ![ParticipantRole.ADMIN, ParticipantRole.OWNER].includes(userParticipant.role)
    ) {
      throw new ForbiddenException('You do not have permission to update this conversation');
    }

    await this.conversationRepo.update(conversationId, updates);
    return this.getConversation(conversationId, userId);
  }

  private async findPrivateConversation(
    userId1: string,
    userId2: string,
  ): Promise<Conversation | null> {
    const result = await this.conversationRepo
      .createQueryBuilder('c')
      .innerJoin('conversation_participants', 'p1', 'p1.conversationId = c.id')
      .innerJoin('conversation_participants', 'p2', 'p2.conversationId = c.id')
      .where('c.type = :type', { type: ConversationType.PRIVATE })
      .andWhere('p1.userId = :userId1', { userId1 })
      .andWhere('p2.userId = :userId2', { userId2 })
      .andWhere('p1.leftAt IS NULL')
      .andWhere('p2.leftAt IS NULL')
      .getOne();

    return result;
  }

  private async getUnreadCount(
    conversationId: string,
    userId: string,
    lastReadAt?: Date,
  ): Promise<number> {
    const query = this.messageRepo
      .createQueryBuilder('m')
      .where('m.conversationId = :conversationId', { conversationId })
      .andWhere('m.senderId != :userId', { userId })
      .andWhere('m.deletedAt IS NULL');

    if (lastReadAt) {
      query.andWhere('m.createdAt > :lastReadAt', { lastReadAt });
    }

    return query.getCount();
  }
}
