import { RewardType } from 'libs/common/src/types';
import { BaseEvent } from './base.event';



/**
 * XP earned event
 */
export interface XpEarnedEvent extends BaseEvent {
  userId: string;
  amount: number;
  reason: string;
  source: string;
  multiplier?: number;
}

/**
 * Level up event
 */
export interface LevelUpEvent extends BaseEvent {
  userId: string;
  previousLevel: number;
  newLevel: number;
  rewards: Array<{
    type: RewardType;
    amount: string;
    description?: string;
  }>;
}

/**
 * Badge earned event
 */
export interface BadgeEarnedEvent extends BaseEvent {
  userId: string;
  badgeId: string;
  badgeName: string;
  badgeDescription?: string;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  earnedAt: Date;
}

/**
 * Mission completed event
 */
export interface MissionCompletedEvent extends BaseEvent {
  userId: string;
  missionId: string;
  missionName: string;
  progress: number;
  rewards: Array<{
    type: RewardType;
    amount: string;
    description?: string;
  }>;
  completedAt: Date;
}

/**
 * Mission progress updated event
 */
export interface MissionProgressUpdatedEvent extends BaseEvent {
  userId: string;
  missionId: string;
  currentProgress: number;
  targetProgress: number;
  progressPercentage: number;
}

/**
 * Achievement unlocked event
 */
export interface AchievementUnlockedEvent extends BaseEvent {
  userId: string;
  achievementId: string;
  achievementName: string;
  achievementDescription?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  rewards?: Array<{
    type: RewardType;
    amount: string;
  }>;
}

/**
 * Streak updated event
 */
export interface StreakUpdatedEvent extends BaseEvent {
  userId: string;
  streakType: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
  rewards?: Array<{
    type: RewardType;
    amount: string;
  }>;
}

/**
 * Leaderboard position changed event
 */
export interface LeaderboardPositionChangedEvent extends BaseEvent {
  userId: string;
  leaderboardType: string;
  previousPosition: number;
  newPosition: number;
  score: number;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'alltime';
}

/**
 * Reward claimed event
 */
export interface RewardClaimedEvent extends BaseEvent {
  userId: string;
  rewardId: string;
  rewardType: RewardType;
  amount: string;
  claimedAt: Date;
}
