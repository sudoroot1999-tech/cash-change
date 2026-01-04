import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('proof_of_reserves')
@Index(['currency', 'createdAt'])
export class ProofOfReserves {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  currency: string;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  totalReserves: string;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  totalLiabilities: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  reserveRatio: number;

  @Column({ name: 'merkle_root' })
  merkleRoot: string;

  @Column({ name: 'audit_file_url', nullable: true })
  auditFileUrl: string;

  @Column({ name: 'auditor_name', nullable: true })
  auditorName: string;

  @Column({ name: 'block_height', nullable: true })
  blockHeight: string;

  @Column({ type: 'jsonb', nullable: true })
  walletAddresses: string[];

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
