import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum InsuranceFundTransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  CLAIM = 'CLAIM',
  INTEREST = 'INTEREST',
}

@Entity('insurance_fund_transactions')
@Index(['currency', 'createdAt'])
export class InsuranceFundTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  currency: string;

  @Column({
    type: 'enum',
    enum: InsuranceFundTransactionType,
  })
  type: InsuranceFundTransactionType;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  amount: string;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  balanceAfter: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'related_incident_id', nullable: true })
  relatedIncidentId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('insurance_fund_balances')
export class InsuranceFundBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  currency: string;

  @Column({ type: 'decimal', precision: 36, scale: 18, default: 0 })
  balance: string;

  @Column({ name: 'last_audit_at', type: 'timestamp', nullable: true })
  lastAuditAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
