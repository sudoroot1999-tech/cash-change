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
import { Guild } from './guild.entity';

export enum GuildRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  OFFICER = 'officer',
  MEMBER = 'member',
}

export enum MembershipStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  KICKED = 'kicked',
  LEFT = 'left',
}

@Entity('guild_members')
@Index(['guildId', 'userId'], { unique: true })
@Index(['userId', 'status'])
export class GuildMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @ManyToOne(() => Guild)
  @JoinColumn({ name: 'guild_id' })
  guild: Guild;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: GuildRole,
    default: GuildRole.MEMBER,
  })
  role: GuildRole;

  @Column({
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.ACTIVE,
  })
  status: MembershipStatus;

  @Column({ name: 'contribution_xp', type: 'int', default: 0 })
  contributionXp: number;

  @Column({ name: 'contribution_volume', type: 'decimal', precision: 18, scale: 8, default: 0 })
  contributionVolume: number;

  @Column({ name: 'challenges_completed', type: 'int', default: 0 })
  challengesCompleted: number;

  @Column({ name: 'last_active', type: 'timestamp', nullable: true })
  lastActive: Date;

  @Column({ name: 'joined_at', type: 'timestamp' })
  joinedAt: Date;

  @Column({ name: 'left_at', type: 'timestamp', nullable: true })
  leftAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
