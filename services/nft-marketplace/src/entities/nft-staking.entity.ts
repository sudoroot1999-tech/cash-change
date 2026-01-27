import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Nft } from './nft.entity';

export enum StakingStatus {
  ACTIVE = 'ACTIVE',
  UNSTAKED = 'UNSTAKED',
}

@Entity('nft_staking')
export class NftStaking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'nft_id', type: 'uuid' })
  nftId: string;

  @ManyToOne(() => Nft)
  @JoinColumn({ name: 'nft_id' })
  nft: Nft;

  @Column({ name: 'staker_address', length: 42 })
  stakerAddress: string;

  @Column({ name: 'staking_pool_id', type: 'uuid', nullable: true })
  stakingPoolId: string;

  @Column({ name: 'staked_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  stakedAt: Date;

  @Column({ name: 'unstaked_at', type: 'timestamp', nullable: true })
  unstakedAt: Date;

  @Column({ name: 'reward_token_address', length: 42, nullable: true })
  rewardTokenAddress: string;

  @Column({ name: 'rewards_earned', type: 'decimal', precision: 36, scale: 18, default: 0 })
  rewardsEarned: string;

  @Column({ name: 'rewards_claimed', type: 'decimal', precision: 36, scale: 18, default: 0 })
  rewardsClaimed: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  apy: number;

  @Column({ type: 'varchar', length: 20, default: StakingStatus.ACTIVE })
  status: StakingStatus;

  @Column({ name: 'chain_id', type: 'integer' })
  chainId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
