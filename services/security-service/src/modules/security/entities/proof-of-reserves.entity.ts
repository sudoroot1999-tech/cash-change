import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('proof_of_reserves')
export class ProofOfReserves {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index(['currency'])
  @Column()
  currency: string;

  @Column({ type: 'decimal', precision: 36, scale: 18, name: 'total_reserves' })
  totalReserves: string;

  @Column({ type: 'decimal', precision: 36, scale: 18, name:'total_liabilities' })
  totalLiabilities: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name:'reserve_ratio'})
  reserveRatio: number;

  @Column({ name: 'merkle_root' })
  merkleRoot: string;

  @Column({ name: 'audit_file_url', nullable: true })
  auditFileUrl: string;

  @Column({ name: 'auditor_name', nullable: true })
  auditorName: string;

  @Column({ name: 'block_height', nullable: true })
  blockHeight: string;

  @Column({ type: 'jsonb', nullable: true, name:'wallet_addresses'})
  walletAddresses: string[];

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Index(['created_at'])
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
