import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import * as bcrypt from 'bcrypt';

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  FINANCE_ADMIN = 'finance_admin',
  SUPPORT_ADMIN = 'support_admin',
  COMPLIANCE_ADMIN = 'compliance_admin',
  MARKETING_ADMIN = 'marketing_admin',
  RISK_MANAGER = 'risk_manager',
  OTC_DESK_MANAGER = 'otc_desk_manager',
}

@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  fullName: string;

  @Column({
    type: 'enum',
    enum: AdminRole,
    default: AdminRole.SUPPORT_ADMIN,
  })
  role: AdminRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  lastLoginIp: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  async hashPassword() {
    if (this.passwordHash && !this.passwordHash.startsWith('$2')) {
      this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }
}

