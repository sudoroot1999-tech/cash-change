import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum KeyStatus {
  GENERATING = 'generating',
  ACTIVE = 'active',
  ROTATING = 'rotating',
  REVOKED = 'revoked',
}

@Entity('mpc_keys')
export class MpcKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  algorithm: string; // e.g., 'ECDSA-secp256k1'

  @Column({ name: 'public_key', type: 'text' })
  publicKey: string;

  @Column({ name: 'threshold', type: 'int', default: 2 })
  threshold: number;

  @Column({ name: 'parties', type: 'int', default: 3 })
  parties: number;

  @Column({ type: 'enum', enum: KeyStatus, default: KeyStatus.GENERATING })
  status: KeyStatus;

  @Column({ name: 'key_id', length: 100, unique: true })
  keyId: string; // External reference ID

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
