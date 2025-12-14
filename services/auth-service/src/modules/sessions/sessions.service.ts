import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Session } from './entities/session.entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.find({
      where: {
        userId,
        expiresAt: LessThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Delete a specific session
   */
  async deleteSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await this.sessionRepository.delete({
      id: sessionId,
      userId,
    });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Delete all sessions except current
   */
  async deleteOtherSessions(userId: string, currentSessionId: string): Promise<number> {
    const result = await this.sessionRepository
      .createQueryBuilder()
      .delete()
      .where('user_id = :userId', { userId })
      .andWhere('id != :currentSessionId', { currentSessionId })
      .execute();

    return result.affected ?? 0;
  }

  /**
   * Cleanup expired sessions (run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessionRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected ?? 0;
  }
}
