import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradeMessage, MessageType } from '../entities/trade-message.entity';
import { P2pTrade } from '../entities/p2p-trade.entity';
import { SendMessageDto } from '../dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(TradeMessage)
    private messageRepository: Repository<TradeMessage>,
    @InjectRepository(P2pTrade)
    private tradeRepository: Repository<P2pTrade>,
  ) {}

  async sendMessage(
    tradeId: string,
    userId: string,
    dto: SendMessageDto,
  ): Promise<TradeMessage> {
    const trade = await this.tradeRepository.findOne({ where: { id: tradeId } });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    if (trade.buyerId !== userId && trade.sellerId !== userId) {
      throw new ForbiddenException('You are not part of this trade');
    }

    const message = this.messageRepository.create({
      tradeId,
      senderId: userId,
      type: dto.type,
      content: dto.content,
      fileUrl: dto.fileUrl,
    });

    return this.messageRepository.save(message);
  }

  async getTradeMessages(tradeId: string, userId: string): Promise<TradeMessage[]> {
    const trade = await this.tradeRepository.findOne({ where: { id: tradeId } });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    if (trade.buyerId !== userId && trade.sellerId !== userId) {
      throw new ForbiddenException('You are not part of this trade');
    }

    return this.messageRepository.find({
      where: { tradeId },
      order: { createdAt: 'ASC' },
    });
  }

  async markMessagesAsRead(tradeId: string, userId: string): Promise<void> {
    const trade = await this.tradeRepository.findOne({ where: { id: tradeId } });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    if (trade.buyerId !== userId && trade.sellerId !== userId) {
      throw new ForbiddenException('You are not part of this trade');
    }

    // Mark all messages not sent by this user as read
    await this.messageRepository
      .createQueryBuilder()
      .update(TradeMessage)
      .set({ isRead: true })
      .where('tradeId = :tradeId', { tradeId })
      .andWhere('senderId != :userId', { userId })
      .andWhere('isRead = :isRead', { isRead: false })
      .execute();
  }

  async getUnreadCount(tradeId: string, _userId: string): Promise<number> {
    return this.messageRepository.count({
      where: {
        tradeId,
        isRead: false,
      },
    });
  }

  async sendSystemMessage(tradeId: string, content: string): Promise<TradeMessage> {
    const message = this.messageRepository.create({
      tradeId,
      senderId: 'system',
      type: MessageType.SYSTEM,
      content,
      isRead: false,
    });

    return this.messageRepository.save(message);
  }
}
