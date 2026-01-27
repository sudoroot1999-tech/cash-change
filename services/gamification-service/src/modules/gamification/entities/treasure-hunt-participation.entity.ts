import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TreasureHunt } from './treasure-hunt.entity';

@Entity('treasure_hunt_participations')
@Index(['userId', 'huntId'])
@Index(['huntId', 'foundAt'])
export class TreasureHuntParticipation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'hunt_id', type: 'uuid' })
  @Index()
  huntId: string;

  @ManyToOne(() => TreasureHunt)
  @JoinColumn({ name: 'hunt_id' })
  hunt: TreasureHunt;

  @Column({ name: 'clues_unlocked', type: 'jsonb', default: [] })
  cluesUnlocked: string[];

  @Column({ name: 'locations_found', type: 'jsonb', default: [] })
  locationsFound: string[];

  @Column({ name: 'is_completed', type: 'boolean', default: false })
  isCompleted: boolean;

  @Column({ name: 'is_first_finder', type: 'boolean', default: false })
  isFirstFinder: boolean;

  @Column({ name: 'rewards_claimed', type: 'jsonb', nullable: true })
  rewardsClaimed: Record<string, any>;

  @Column({ name: 'found_at', type: 'timestamp', nullable: true })
  foundAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
