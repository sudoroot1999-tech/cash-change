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
import { Tournament } from './tournament.entity';

@Entity('tournament_participants')
@Index(['tournamentId', 'userId'], { unique: true })
@Index(['tournamentId', 'rank'])
export class TournamentParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tournament_id', type: 'uuid' })
  tournamentId: string;

  @ManyToOne(() => Tournament)
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'int', nullable: true })
  rank: number;

  @Column({ name: 'games_played', type: 'int', default: 0 })
  gamesPlayed: number;

  @Column({ name: 'games_won', type: 'int', default: 0 })
  gamesWon: number;

  @Column({ name: 'prize_won', type: 'jsonb', nullable: true })
  prizeWon: Record<string, any>;

  @Column({ name: 'is_qualified', type: 'boolean', default: true })
  isQualified: boolean;

  @Column({ name: 'joined_at', type: 'timestamp' })
  joinedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
