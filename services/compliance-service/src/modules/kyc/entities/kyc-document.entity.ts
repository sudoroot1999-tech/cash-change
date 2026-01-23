import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { KycVerificationRequest } from './kyc-verification-request.entity';
import { DOCUMENT_TYPE, DocumentType } from '@exchange/common';

@Entity('kyc_documents')
export class KycDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index(['user_id'])
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Index(['verification_request_id'])
  @Column({ type: 'uuid', name: 'verification_request_id' })
  verificationRequestId: string;

  @Column({
    type: 'enum',
    enum: DOCUMENT_TYPE,
    name: 'document_type'
  })
  documentType: DocumentType;

  @Column({ nullable: true, name: 'document_number' })
  documentNumber: string;

  // Plain URLs (for internal use)
  @Column({ name: 'document_front_url' })
  documentFrontUrl: string;

  @Column({ nullable: true, name: 'document_back_url' })
  documentBackUrl: string;

  // Encrypted URLs (actual storage)
  @Column({ name: 'document_front_url_encrypted' })
  documentFrontUrlEncrypted: string;

  @Column({ nullable: true, name: 'document_back_url_encrypted' })
  documentBackUrlEncrypted: string;

  @Column({ default: true, name: 'is_encrypted' })
  isEncrypted: boolean;

  @Column({ type: 'date', nullable: true, name: 'expiry_date' })
  expiryDate: Date;

  @Column({ type: 'date', nullable: true, name: 'issue_date' })
  issueDate: Date;

  @Column({ nullable: true, name: 'issuing_country' })
  issuingCountry: string;

  // OCR extracted data
  @Column({ type: 'jsonb', nullable: true, name: 'extracted_data' })
  extractedData: any;

  @CreateDateColumn({ name:'created_at'})
  createdAt: Date;

  @UpdateDateColumn({ name:'updated_at'})
  updatedAt: Date;

  @ManyToOne(() => KycVerificationRequest, (request) => request.documents)
  @JoinColumn({ name: 'verification_request_id' })
  verificationRequest: KycVerificationRequest;
}
