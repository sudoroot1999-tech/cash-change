import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int, Float, registerEnumType } from '@nestjs/graphql';
import { Course } from './course.entity';

export enum CertificateType {
  COURSE = 'course',
  PROGRAM = 'program',
  WEBINAR = 'webinar',
  ASSESSMENT = 'assessment',
}

registerEnumType(CertificateType, { name: 'CertificateType' });

@ObjectType()
export class CertificateIssuer {
  @Field()
  name: string;

  @Field({ nullable: true })
  logo?: string;
}

@ObjectType()
export class CertificateRecipient {
  @Field()
  userId: string;

  @Field()
  name: string;

  @Field()
  email: string;
}

@ObjectType()
export class CertificateMetadata {
  @Field()
  courseTitle: string;

  @Field(() => Int)
  duration: number;

  @Field()
  completionDate: Date;

  @Field()
  instructorName: string;
}

@ObjectType()
export class CertificateVerification {
  @Field()
  verificationCode: string;

  @Field()
  verificationUrl: string;

  @Field({ nullable: true })
  qrCode?: string;
}

@ObjectType()
export class BlockchainVerification {
  @Field()
  network: string;

  @Field()
  contractAddress: string;

  @Field()
  tokenId: string;

  @Field()
  transactionHash: string;

  @Field()
  verified: boolean;
}

@ObjectType()
export class CertificatePdf {
  @Field()
  url: string;

  @Field()
  generatedAt: Date;
}

@ObjectType()
@Entity('certificates')
@Index(['userId', 'courseId'])
@Index(['certificateNumber'])
@Index(['issuedAt'])
export class Certificate {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  userId: string;

  @Field()
  @Column('uuid')
  courseId: string;

  @Field()
  @Column({ unique: true })
  certificateNumber: string;

  @Field(() => CertificateType)
  @Column({ type: 'enum', enum: CertificateType })
  type: CertificateType;

  @Field()
  @Column()
  title: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  description?: string;

  @Field(() => CertificateIssuer)
  @Column('jsonb')
  issuer: CertificateIssuer;

  @Field(() => CertificateRecipient)
  @Column('jsonb')
  recipient: CertificateRecipient;

  @Field()
  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  issuedAt: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  validUntil?: Date;

  @Field(() => Float, { nullable: true })
  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  score?: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  grade?: string;

  @Field(() => [String])
  @Column('simple-array', { default: '' })
  skills: string[];

  @Field(() => CertificateMetadata)
  @Column('jsonb')
  metadata: CertificateMetadata;

  @Field(() => CertificateVerification)
  @Column('jsonb')
  verification: CertificateVerification;

  @Field(() => BlockchainVerification, { nullable: true })
  @Column('jsonb', { nullable: true })
  blockchain?: BlockchainVerification;

  @Field(() => CertificatePdf, { nullable: true })
  @Column('jsonb', { nullable: true })
  pdf?: CertificatePdf;

  @Field()
  @Column({ default: false })
  linkedInShared: boolean;

  @Field(() => Int)
  @Column({ default: 0 })
  views: number;

  @Field(() => Int)
  @Column({ default: 0 })
  downloads: number;

  @Field()
  @Column({ default: false })
  revoked: boolean;

  @Field({ nullable: true })
  @Column({ nullable: true })
  revokedAt?: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  revokedReason?: string;

  @Field(() => Course)
  @ManyToOne(() => Course, (course) => course.certificates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
