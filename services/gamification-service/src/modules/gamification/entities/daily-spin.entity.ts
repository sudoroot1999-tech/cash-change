import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('daily_spins')
@Index(['userId', 'spinDate'], { unique: true })
export class DailySpin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'spin_date', type: 'date' })
  spinDate: Date;

  @Column({ name: 'spins_used', type: 'int', default: 0 })
  spinsUsed: number;

  @Column({ name: 'spins_available', type: 'int', default: 1 })
  spinsAvailable: number;

  @Column({ name: 'extra_spins_purchased', type: 'int', default: 0 })
  extraSpinsPurchased: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
