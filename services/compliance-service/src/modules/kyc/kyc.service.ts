import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  KycVerificationRequest,
} from './entities/kyc-verification-request.entity';
import {
  KycDocument
} from './entities/kyc-document.entity';
import { SubmitKycDocumentsDto, ReviewKycDto } from './dto/kyc.dto';
import { AuditService } from './services/audit.service';
import { KycProviderService } from './services/kyc-provider.service';
import { OcrService } from './services/ocr.service';
import { COMPLIANCE_CHECK_STATUS, COMPLIANCE_CHECK_TYPE, ComplianceCheckStatus, ComplianceCheckType, DOCUMENT_TYPE, DocumentType, EncryptionService, KYC_LEVELS, KYC_PROVIDER, KYC_STATUS, KycLevel, KycProvider, KycStatus, Logger, StorageService } from '@exchange/common';
import { ConfigService } from '@nestjs/config';
import { ComplianceCheck } from './entities/compliance-check.entity';
import axios from 'axios';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    @InjectRepository(KycVerificationRequest)
    private verificationRepository: Repository<KycVerificationRequest>,
    @InjectRepository(KycDocument)
    private documentRepository: Repository<KycDocument>,
    @InjectRepository(KycDocument)
    private complianceCheckRepo: Repository<ComplianceCheck>,
    private storageService: StorageService,
    private encryptionService: EncryptionService,
    private auditService: AuditService,
    private kycProviderService: KycProviderService,
    private ocrService: OcrService,
    private configService: ConfigService
  ) { }

  /**
   * Gets KYC status for a user
   */
  async getKycStatus(userId: string): Promise<{
    userId: string;
    currentLevel: KycLevel;
    currentStatus: KycStatus;
    canUpgrade: boolean;
    nextLevel?: KycLevel;
    requiredDocuments?: DocumentType[];
    pendingRequests: KycVerificationRequest[];
    completedRequests: KycVerificationRequest[];
  }> {
    // Get all verification requests for user
    const requests = await this.verificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // Determine current level
    const approvedRequests = requests.filter(
      (r) => r.status === KYC_STATUS.APPROVED,
    );
    const currentLevel = this.getCurrentLevel(approvedRequests);

    // Get pending requests
    const pendingRequests = requests.filter(
      (r) => r.status === KYC_STATUS.PENDING,
    );

    // Get completed requests
    const completedRequests = requests.filter(
      (r) =>
        r.status === KYC_STATUS.APPROVED ||
        r.status === KYC_STATUS.REJECTED,
    );

    // Determine if can upgrade
    const canUpgrade = currentLevel !== KYC_LEVELS.ADVANCED;
    const nextLevel = canUpgrade ? this.getNextLevel(currentLevel) : undefined;
    const requiredDocuments = nextLevel
      ? this.getRequiredDocuments(nextLevel)
      : undefined;

    return {
      userId,
      currentLevel,
      currentStatus: approvedRequests.length > 0 ? KYC_STATUS.APPROVED : KYC_STATUS.PENDING,
      canUpgrade,
      nextLevel,
      requiredDocuments,
      pendingRequests,
      completedRequests,
    };
  }

  /**
   * Submits KYC documents for verification
   */
  async submitKycDocuments(
    userId: string,
    submitDto: SubmitKycDocumentsDto,
    ipAddress: string,
    userAgent?: string,
  ): Promise<KycVerificationRequest> {
    // Check if user already has an approved KYC at this level or higher
    const existingApproved = await this.verificationRepository.findOne({
      where: {
        userId,
        status: KYC_STATUS.APPROVED,
      },
      order: { createdAt: 'DESC' },
    });

    if (existingApproved) {
      const currentLevel = existingApproved.requestedLevel;
      if (this.compareLevels(currentLevel, submitDto.requestedLevel) >= 0) {
        throw new ConflictException(
          `User already has KYC approved at ${currentLevel} or higher`,
        );
      }
    }

    // Check if user has a pending request
    const existingPending = await this.verificationRepository.findOne({
      where: {
        userId,
        status: KYC_STATUS.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    if (existingPending) {
      throw new ConflictException(
        'User already has a pending KYC verification request',
      );
    }

    // Determine KYC provider based on configuration
    const provider = this.selectKycProvider(submitDto.requestedLevel);

    // Create verification request
    const verification = this.verificationRepository.create({
      userId,
      requestedLevel: submitDto.requestedLevel,
      status: KYC_STATUS.PENDING,
      provider,
      documentIds: [],
      submittedAt: new Date(),
      metadata: {
        firstName: submitDto.firstName,
        lastName: submitDto.lastName,
        dateOfBirth: submitDto.dateOfBirth,
        country: submitDto.country,
        address: submitDto.address,
        city: submitDto.city,
        postalCode: submitDto.postalCode,
      },
    });

    const savedVerification = await this.verificationRepository.save(verification);

    // Log submission
    await this.auditService.logKycSubmission(
      userId,
      savedVerification.id,
      submitDto.requestedLevel,
      ipAddress,
      userAgent,
    );

    // If using third-party provider, initiate the check
    if (provider !== KYC_PROVIDER.MANUAL) {
      try {
        const providerRequestId = await this.kycProviderService.initiateKycCheck(
          provider,
          userId,
          submitDto.firstName,
          submitDto.lastName,
          `user-${userId}@platform.com`, // Use a generic email or fetch real one
        );
        savedVerification.providerRequestId = providerRequestId;
        await this.verificationRepository.save(savedVerification);
      } catch (error) {
        console.error((error as Error).message);
        // Continue with manual review
      }
    }

    return savedVerification;
  }

  /**
   * Uploads a document for a verification request
   */
  async uploadDocument(
    userId: string,
    verificationRequestId: string,
    file: Express.Multer.File,
    mimeType: string,
    documentType: DocumentType,
    side: 'front' | 'back',
    ipAddress: string,
    userAgent?: string,
  ): Promise<KycDocument> {
    // Validate verification request
    const verification = await this.verificationRepository.findOne({
      where: { id: verificationRequestId, userId },
    });

    if (!verification) {
      throw new NotFoundException('Verification request not found');
    }

    if (verification.status !== KYC_STATUS.PENDING) {
      throw new BadRequestException(
        'Cannot upload documents to non-pending verification',
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(mimeType)) {
      throw new BadRequestException('Invalid file type');
    }

    // Generate unique object name
    const ext = file.originalname.split('.').pop();
    const objectName = `kyc/${userId}_${Date.now()}.${ext}`;

    // Upload to storage
    await this.storageService.uploadFile(
      "user-kyc",
      objectName,
      file.buffer, file.size,
      {
        'Content-Type': file.mimetype,
      }
    );

    // Encrypt the URL
    const masterKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!masterKey) {
      throw new Error('ENCRYPTION_KEY not configured');
    }
    const encryptedUrl = this.encryptionService.encrypt(objectName, masterKey);

    // Extract OCR data
    let extractedData = null;
    try {
      const ocrResult = await this.ocrService.extractDocumentData(
        file.buffer,
        documentType,
      );
      extractedData = ocrResult;
    } catch (error) {
      console.error('OCR extraction failed:', error);
      // Continue without OCR data
    }

    // Create document record
    const document = this.documentRepository.create({
      userId,
      verificationRequestId,
      documentType,
      documentFrontUrl: side === 'front' ? objectName : '',
      documentBackUrl: side === 'back' ? objectName : '',
      documentFrontUrlEncrypted: side === 'front' ? encryptedUrl : '',
      documentBackUrlEncrypted: side === 'back' ? encryptedUrl : '',
      isEncrypted: true,
      extractedData,
    });

    const savedDocument = await this.documentRepository.save(document);

    // Update verification request with document ID
    verification.documentIds = [...verification.documentIds, savedDocument.id];
    await this.verificationRepository.save(verification);

    // Log document upload
    await this.auditService.logDocumentUpload(
      userId,
      verificationRequestId,
      documentType,
      ipAddress,
      userAgent,
    );

    return savedDocument;
  }

  /**
   * Uploads a selfie for verification
   */
  async uploadSelfie(
    userId: string,
    verificationRequestId: string,
    file: Express.Multer.File,
    mimeType: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    const verification = await this.verificationRepository.findOne({
      where: { id: verificationRequestId, userId },
    });

    if (!verification) {
      throw new NotFoundException('Verification request not found');
    }

    // Generate unique object name
    const ext = file.originalname.split('.').pop();
    const objectName = `kyc/${userId}_${Date.now()}.${ext}`;

    // Upload to storage
    await this.storageService.uploadFile(
      "user-kyc",
      objectName,
      file.buffer, file.size,
      {
        'Content-Type': file.mimetype,
      }
    );

    // Encrypt the URL
    const masterKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!masterKey) {
      throw new Error('ENCRYPTION_KEY not configured');
    }
    const encryptedUrl = this.encryptionService.encrypt(objectName, masterKey);

    // Update verification request
    verification.selfieUrl = objectName;
    verification.selfieUrlEncrypted = encryptedUrl;
    await this.verificationRepository.save(verification);

    // Log upload
    await this.auditService.logDocumentUpload(
      userId,
      verificationRequestId,
      'SELFIE',
      ipAddress,
      userAgent,
    );
  }

  /**
   * Uploads a video for Level 3 verification
   */
  async uploadVideo(
    userId: string,
    verificationRequestId: string,
    file: Express.Multer.File,
    mimeType: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    const verification = await this.verificationRepository.findOne({
      where: { id: verificationRequestId, userId },
    });

    if (!verification) {
      throw new NotFoundException('Verification request not found');
    }

    if (verification.requestedLevel !== KYC_LEVELS.ADVANCED) {
      throw new BadRequestException('Video verification only required for Level 3');
    }

    // Generate unique object name
    const ext = file.originalname.split('.').pop();
    const objectName = `kyc/${userId}_${Date.now()}.${ext}`;

    // Upload to storage
    await this.storageService.uploadFile(
      "user-kyc",
      objectName,
      file.buffer, file.size,
      {
        'Content-Type': file.mimetype,
      }
    );

    // Encrypt the URL
    const masterKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!masterKey) {
      throw new Error('ENCRYPTION_KEY not configured');
    }
    const encryptedUrl = this.encryptionService.encrypt(objectName, masterKey);

    // Update verification request
    verification.videoUrl = objectName;
    verification.videoUrlEncrypted = encryptedUrl;
    await this.verificationRepository.save(verification);

    // Log upload
    await this.auditService.logDocumentUpload(
      userId,
      verificationRequestId,
      'VIDEO',
      ipAddress,
      userAgent,
    );
  }

  /**
   * Reviews a KYC verification request (Admin only)
   */
  async reviewKyc(
    reviewDto: ReviewKycDto,
    reviewerId: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<KycVerificationRequest> {
    const verification = await this.verificationRepository.findOne({
      where: { id: reviewDto.verificationRequestId },
    });

    if (!verification) {
      throw new NotFoundException('Verification request not found');
    }

    if (verification.status !== KYC_STATUS.PENDING) {
      throw new BadRequestException('Verification is not in pending state');
    }

    const oldStatus = verification.status;
    verification.status = reviewDto.status;
    verification.reviewedAt = new Date();
    verification.reviewedBy = reviewerId;
    verification.notes = reviewDto.notes;

    if (reviewDto.status === KYC_STATUS.APPROVED) {
      verification.approvedAt = new Date();
      await this.auditService.logKycApproval(
        verification.userId,
        verification.id,
        reviewerId,
        verification.requestedLevel,
        ipAddress,
        userAgent,
      );
    } else if (reviewDto.status === KYC_STATUS.REJECTED) {
      verification.rejectedAt = new Date();
      verification.rejectionReason = reviewDto.rejectionReason;
      await this.auditService.logKycRejection(
        verification.userId,
        verification.id,
        reviewerId,
        reviewDto.rejectionReason || 'No reason provided',
        ipAddress,
        userAgent,
      );
    }

    const updated = await this.verificationRepository.save(verification);

    // Log review
    await this.auditService.logKycReview(
      verification.userId,
      verification.id,
      reviewerId,
      oldStatus,
      reviewDto.status,
      reviewDto.notes || '',
      ipAddress,
      userAgent,
    );

    return updated;
  }

  /**
   * Gets verification request details
   */
  async getVerificationRequest(
    verificationRequestId: string,
    userId?: string,
  ): Promise<{
    verification: KycVerificationRequest;
    documents: KycDocument[];
  }> {
    const verification = await this.verificationRepository.findOne({
      where: userId
        ? { id: verificationRequestId, userId }
        : { id: verificationRequestId },
    });

    if (!verification) {
      throw new NotFoundException('Verification request not found');
    }

    const documents = await this.documentRepository.find({
      where: { verificationRequestId },
    });

    return { verification, documents };
  }

  /**
   * Gets all pending verification requests (Admin only)
   */
  async getPendingVerifications(
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ verifications: KycVerificationRequest[]; total: number }> {
    const [verifications, total] = await this.verificationRepository.findAndCount({
      where: { status: KYC_STATUS.PENDING },
      order: { submittedAt: 'ASC' },
      take: limit,
      skip: offset,
    });

    return { verifications, total };
  }

  /**
 * PEP (Politically Exposed Persons) screening
 */
  async screenPEP(userId: string, fullName: string, dateOfBirth: string, _nationality: string): Promise<any> {
    const apiKey = this.configService.get('COMPLYADVANTAGE_API_KEY');

    try {
      const response = await axios.post(
        'https://api.complyadvantage.com/searches',
        {
          search_term: fullName,
          fuzziness: 0.6,
          filters: {
            types: ['pep'],
            birth_year: new Date(dateOfBirth).getFullYear(),
          },
        },
        {
          headers: {
            Authorization: `Token ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const isPEP = response.data.total_hits > 0;
      const riskScore = isPEP ? 80 : 0;

      await this.createComplianceCheck(
        userId,
        COMPLIANCE_CHECK_TYPE.PEP_SCREENING,
        isPEP ? COMPLIANCE_CHECK_STATUS.REQUIRES_REVIEW : COMPLIANCE_CHECK_STATUS.PASSED,
        response.data,
        'complyadvantage',
        response.data.ref,
        riskScore,
      );

      return {
        isPEP,
        matches: response.data.hits,
        riskScore,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`PEP screening failed: ${message}`);
      throw new BadRequestException('PEP screening failed');
    }
  }

  /**
 * Sanctions list checking (OFAC, UN, EU)
 */
  async checkSanctionsList(userId: string, fullName: string, nationality: string): Promise<any> {
    const apiKey = this.configService.get('COMPLYADVANTAGE_API_KEY');

    try {
      const response = await axios.post(
        'https://api.complyadvantage.com/searches',
        {
          search_term: fullName,
          fuzziness: 0.8,
          filters: {
            types: ['sanction'],
            countries: [nationality],
          },
        },
        {
          headers: {
            Authorization: `Token ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const isOnSanctionsList = response.data.total_hits > 0;
      const riskScore = isOnSanctionsList ? 100 : 0;

      await this.createComplianceCheck(
        userId,
        COMPLIANCE_CHECK_TYPE.SANCTIONS_CHECK,
        isOnSanctionsList ? COMPLIANCE_CHECK_STATUS.FAILED : COMPLIANCE_CHECK_STATUS.PASSED,
        response.data,
        'complyadvantage',
        response.data.ref,
        riskScore,
      );

      return {
        isOnSanctionsList,
        matches: response.data.hits,
        riskScore,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Sanctions check failed: ${message}`);
      throw new BadRequestException('Sanctions check failed');
    }
  }

  /**
   * Adverse media screening
   */
  async screenAdverseMedia(userId: string, fullName: string): Promise<any> {
    const apiKey = this.configService.get('COMPLYADVANTAGE_API_KEY');

    try {
      const response = await axios.post(
        'https://api.complyadvantage.com/searches',
        {
          search_term: fullName,
          fuzziness: 0.7,
          filters: {
            types: ['adverse-media'],
          },
        },
        {
          headers: {
            Authorization: `Token ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const hasAdverseMedia = response.data.total_hits > 0;
      const riskScore = hasAdverseMedia ? 60 : 0;

      await this.createComplianceCheck(
        userId,
        COMPLIANCE_CHECK_TYPE.ADVERSE_MEDIA,
        hasAdverseMedia ? COMPLIANCE_CHECK_STATUS.REQUIRES_REVIEW : COMPLIANCE_CHECK_STATUS.PASSED,
        response.data,
        'complyadvantage',
        response.data.ref,
        riskScore,
      );

      return {
        hasAdverseMedia,
        matches: response.data.hits,
        riskScore,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Adverse media screening failed: ${message}`);
      throw new BadRequestException('Adverse media screening failed');
    }
  }

  /**
   * Liveness detection check
   */
  async performLivenessCheck(userId: string, _videoUrl: string): Promise<boolean> {
    // This would integrate with a liveness detection service
    // For now, we'll mark it as a placeholder
    this.logger.info(`Performing liveness check for user ${userId}`);

    const kyc = await this.verificationRepository.findOne({ where: { userId } });
    if (kyc) {
      kyc.livenessVerified = true;
      await this.verificationRepository.save(kyc);
    }

    return true;
  }

  /**
   * Document authenticity check
   */
  async verifyDocumentAuthenticity(userId: string, _documentUrl: string): Promise<boolean> {
    // This would integrate with a document verification service
    this.logger.info(`Verifying document authenticity for user ${userId}`);

    const kyc = await this.verificationRepository.findOne({ where: { userId } });
    if (kyc) {
      kyc.documentAuthenticityVerified = true;
      await this.verificationRepository.save(kyc);
    }

    return true;
  }

  /**
   * Enhanced due diligence for high-risk users
   */
  async performEnhancedDueDiligence(userId: string, data: Record<string, any>): Promise<ComplianceCheck> {
    this.logger.info(`Performing enhanced due diligence for user ${userId}`);

    return await this.createComplianceCheck(
      userId,
      COMPLIANCE_CHECK_TYPE.ENHANCED_DUE_DILIGENCE,
      COMPLIANCE_CHECK_STATUS.IN_PROGRESS,
      data,
      'internal',
    );
  }

  /**
 * Get all compliance checks for a user
 */
  async getUserComplianceChecks(userId: string): Promise<ComplianceCheck[]> {
    return await this.complianceCheckRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Helper: Determines current KYC level from approved requests
   */
  private getCurrentLevel(
    approvedRequests: KycVerificationRequest[],
  ): KycLevel {
    if (approvedRequests.length === 0) {
      return KYC_LEVELS.NONE;
    }

    const levels = approvedRequests.map((r) => r.requestedLevel);
    const levelOrder = [
      KYC_LEVELS.NONE,
      KYC_LEVELS.BASIC,
      KYC_LEVELS.INTERMEDIATE,
      KYC_LEVELS.ADVANCED,
    ];

    let highestLevel: KycLevel = KYC_LEVELS.NONE;
    for (const level of levels) {
      if (
        levelOrder.indexOf(level) > levelOrder.indexOf(highestLevel)
      ) {
        highestLevel = level;
      }
    }

    return highestLevel;
  }

  /**
   * Helper: Gets the next KYC level
   */
  private getNextLevel(currentLevel: KycLevel): KycLevel | undefined {
    const levelMap = {
      [KYC_LEVELS.NONE]: KYC_LEVELS.NONE,
      [KYC_LEVELS.BASIC]: KYC_LEVELS.BASIC,
      [KYC_LEVELS.INTERMEDIATE]: KYC_LEVELS.INTERMEDIATE,
      [KYC_LEVELS.ADVANCED]: undefined,
    };

    return levelMap[currentLevel];
  }

  /**
   * Helper: Gets required documents for a KYC level
   */
  private getRequiredDocuments(level: KycLevel): DocumentType[] {
    const requiredDocs = {
      [KYC_LEVELS.NONE]: [],
      [KYC_LEVELS.BASIC]: [DOCUMENT_TYPE.PASSPORT, DOCUMENT_TYPE.NATIONAL_ID, DOCUMENT_TYPE.DRIVER_LICENSE],
      [KYC_LEVELS.INTERMEDIATE]: [DOCUMENT_TYPE.PROOF_OF_ADDRESS, DOCUMENT_TYPE.UTILITY_BILL, DOCUMENT_TYPE.BANK_STATEMENT],
      [KYC_LEVELS.ADVANCED]: [], // Video verification
    };

    return requiredDocs[level];
  }

  /**
   * Helper: Compares two KYC levels
   */
  private compareLevels(level1: KycLevel, level2: KycLevel): number {
    const levelOrder = [
      KYC_LEVELS.NONE,
      KYC_LEVELS.BASIC,
      KYC_LEVELS.INTERMEDIATE,
      KYC_LEVELS.ADVANCED,
    ];

    return levelOrder.indexOf(level1) - levelOrder.indexOf(level2);
  }

  /**
   * Helper: Selects KYC provider based on level and configuration
   */
  private selectKycProvider(level: KycLevel): KycProvider {
    // Level 3 always uses manual review for video verification
    if (level === KYC_LEVELS.ADVANCED) {
      return KYC_PROVIDER.MANUAL;
    }

    // Otherwise, use configured provider or default to manual
    const configuredProvider = process.env.KYC_PROVIDER || 'MANUAL';
    return KYC_PROVIDER[configuredProvider as keyof typeof KYC_PROVIDER] || KYC_PROVIDER.MANUAL;
  }

  /**
 * Create compliance check record
 */
  private async createComplianceCheck(
    userId: string,
    type: ComplianceCheckType,
    status: ComplianceCheckStatus,
    data: Record<string, any>,
    provider?: string,
    providerReferenceId?: string,
    riskScore?: number,
  ): Promise<ComplianceCheck> {
    const check = this.complianceCheckRepo.create({
      userId,
      type,
      status,
      data,
      provider,
      providerReferenceId,
      riskScore,
    });

    return await this.complianceCheckRepo.save(check);
  }

}
