import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SaleRound } from './sale-round.entity';

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum VettingStatus {
  PENDING = 'PENDING',
  TEAM_VERIFIED = 'TEAM_VERIFIED',
  CONTRACT_AUDITED = 'CONTRACT_AUDITED',
  LEGAL_COMPLIANT = 'LEGAL_COMPLIANT',
  TOKENOMICS_APPROVED = 'TOKENOMICS_APPROVED',
  COMMUNITY_VOTED = 'COMMUNITY_VOTED',
  FULLY_VETTED = 'FULLY_VETTED',
  FAILED = 'FAILED',
}

@Entity('launchpad_projects')
export class LaunchpadProject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  symbol!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', nullable: true })
  longDescription?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  whitepaper?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  twitter?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  telegram?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  discord?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  medium?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  banner?: string;

  @Column({ type: 'varchar', length: 100 })
  tokenAddress!: string;

  @Column({ type: 'int', default: 18 })
  tokenDecimals!: number;

  @Column({ type: 'decimal', precision: 30, scale: 0 })
  totalSupply!: string;

  @Column({ type: 'jsonb', nullable: true })
  tokenomics?: {
    publicSale: number;
    privateSale: number;
    team: number;
    advisors: number;
    liquidity: number;
    ecosystem: number;
    marketing: number;
    reserve: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  teamMembers?: Array<{
    name: string;
    role: string;
    bio: string;
    linkedin?: string;
    twitter?: string;
    photo?: string;
  }>;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.DRAFT,
  })
  status!: ProjectStatus;

  @Column({
    type: 'enum',
    enum: VettingStatus,
    default: VettingStatus.PENDING,
  })
  vettingStatus!: VettingStatus;

  @Column({ type: 'jsonb', nullable: true })
  vettingDetails?: {
    teamVerified: boolean;
    teamVerifiedAt?: Date;
    teamVerifiedBy?: string;
    contractAudited: boolean;
    contractAuditedAt?: Date;
    contractAuditedBy?: string;
    auditReport?: string;
    legalCompliant: boolean;
    legalCompliantAt?: Date;
    legalCompliantBy?: string;
    tokenomicsApproved: boolean;
    tokenomicsApprovedAt?: Date;
    tokenomicsApprovedBy?: string;
    communityVoted: boolean;
    communityVotedAt?: Date;
    communityVotes?: {
      yes: number;
      no: number;
    };
  };

  @Column({ type: 'uuid' })
  submittedBy!: string;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @Column({ type: 'text', nullable: true })
  reviewNotes?: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contractAddress?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  vestingContractAddress?: string;

  @Column({ type: 'boolean', default: false })
  featured!: boolean;

  @Column({ type: 'int', default: 0 })
  viewCount!: number;

  @Column({ type: 'int', default: 0 })
  participantCount!: number;

  @Column({ type: 'decimal', precision: 30, scale: 0, default: 0 })
  totalRaised!: string;

  @OneToMany(() => SaleRound, (saleRound) => saleRound.project)
  saleRounds!: SaleRound[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
