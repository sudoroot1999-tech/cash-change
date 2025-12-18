import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('merkle_snapshots')
export class MerkleSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'root_hash', length: 66 })
  rootHash: string;

  @Column({ name: 'block_height', type: 'bigint' })
  blockHeight: number;

  @Column({ name: 'total_liabilities', type: 'decimal', precision: 30, scale: 10, default: 0 })
  totalLiabilities: string;

  @Column({ type: 'jsonb' })
  metadata: Record<string, any>; // Stores tree height, leaves count, etc but NOT user data

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
