import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { NftAchievement } from './nft-achievement.entity';
import { Nft } from './nft.entity';

@Entity('user_achievements')
@Index(['achievementId', 'userAddress'], { unique: true })
export class UserAchievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'achievement_id', type: 'uuid' })
  achievementId: string;

  @ManyToOne(() => NftAchievement, (achievement) => achievement.userAchievements)
  @JoinColumn({ name: 'achievement_id' })
  achievement: NftAchievement;

  @Column({ name: 'user_address', length: 42 })
  userAddress: string;

  @Column({ name: 'nft_id', type: 'uuid', nullable: true })
  nftId: string;

  @ManyToOne(() => Nft)
  @JoinColumn({ name: 'nft_id' })
  nft: Nft;

  @CreateDateColumn({ name: 'awarded_at' })
  awardedAt: Date;
}
