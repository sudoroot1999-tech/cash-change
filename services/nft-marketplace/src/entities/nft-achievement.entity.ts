import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserAchievement } from './user-achievement.entity';

export enum AchievementRarity {
  COMMON = 'COMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

@Entity('nft_achievements')
export class NftAchievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'badge_image_url', type: 'text', nullable: true })
  badgeImageUrl: string;

  @Column({ name: 'achievement_type', length: 50 })
  achievementType: string;

  @Column({ type: 'jsonb' })
  criteria: any;

  @Column({ name: 'is_transferable', default: false })
  isTransferable: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  rarity: AchievementRarity;

  @OneToMany(() => UserAchievement, (userAchievement) => userAchievement.achievement)
  userAchievements: UserAchievement[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
