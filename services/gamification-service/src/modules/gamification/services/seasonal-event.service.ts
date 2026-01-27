import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SeasonalEvent, EventSeason, EventStatus } from '../entities/seasonal-event.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SeasonalEventService {
  constructor(
    @InjectRepository(SeasonalEvent)
    private eventRepository: Repository<SeasonalEvent>,
  ) {}

  async getActiveEvents() {
    return await this.eventRepository.find({
      where: { status: EventStatus.ACTIVE },
      order: { startDate: 'ASC' },
    });
  }

  async getUpcomingEvents() {
    return await this.eventRepository.find({
      where: { status: EventStatus.UPCOMING },
      order: { startDate: 'ASC' },
    });
  }

  async getEvent(eventId: string): Promise<SeasonalEvent> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async getCurrentBonus(): Promise<number> {
    const activeEvents = await this.getActiveEvents();
    
    // Get highest bonus multiplier
    let maxBonus = 1;
    for (const event of activeEvents) {
      if (event.bonusMultiplier > maxBonus) {
        maxBonus = event.bonusMultiplier;
      }
    }
    
    return maxBonus;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateEventStatuses() {
    const now = new Date();

    // Start upcoming events
    const toStart = await this.eventRepository.find({
      where: {
        status: EventStatus.UPCOMING,
        startDate: Between(new Date(0), now),
      },
    });

    for (const event of toStart) {
      event.status = EventStatus.ACTIVE;
      await this.eventRepository.save(event);
    }

    // End active events
    const toEnd = await this.eventRepository.find({
      where: {
        status: EventStatus.ACTIVE,
        endDate: Between(new Date(0), now),
      },
    });

    for (const event of toEnd) {
      event.status = EventStatus.COMPLETED;
      await this.eventRepository.save(event);
    }
  }

  async createEvent(eventData: Partial<SeasonalEvent>): Promise<SeasonalEvent> {
    const event = this.eventRepository.create(eventData);
    return await this.eventRepository.save(event);
  }
}
