import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey, ApiKeyPermission } from '../entities/api-key.entity';
import { SecurityEvent, SecurityEventType, RiskLevel } from '../entities/security-event.entity';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export interface CreateApiKeyDto {
  userId: string;
  keyName: string;
  permissions: ApiKeyPermission[];
  ipWhitelist?: string[];
  expiresInDays?: number;
}

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);
  private readonly API_KEY_PREFIX = 'crypto_exchange_';

  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(SecurityEvent)
    private securityEventRepository: Repository<SecurityEvent>,
  ) {}

  /**
   * Create new API key
   */
  async createApiKey(data: CreateApiKeyDto): Promise<{ apiKey: ApiKey; secret: string }> {
    const { userId, keyName, permissions, ipWhitelist, expiresInDays } = data;

    // Generate API key and secret
    const apiKeyValue = this.generateApiKey();
    const secret = this.generateSecret();
    const secretHash = await bcrypt.hash(secret, 10);

    // Calculate expiration date
    let expiresAt: Date | null = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const apiKey = this.apiKeyRepository.create({
      userId,
      keyName,
      apiKey: apiKeyValue,
      secretHash,
      permissions,
      ipWhitelist: ipWhitelist || [],
      isActive: true,
      expiresAt,
    });

    await this.apiKeyRepository.save(apiKey);

    // Log security event
    await this.logSecurityEvent(userId, SecurityEventType.API_KEY_CREATED, {
      keyName,
      permissions,
      expiresAt,
    });

    this.logger.log(`API key created for user ${userId}: ${keyName}`);

    // Return both the entity and the secret (only shown once)
    return {
      apiKey,
      secret, // This should be shown to user only once
    };
  }

  /**
   * Validate API key and secret
   */
  async validateApiKey(
    apiKeyValue: string,
    secret: string,
    ipAddress?: string,
  ): Promise<ApiKey | null> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { apiKey: apiKeyValue, isActive: true },
    });

    if (!apiKey) {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      this.logger.warn(`Expired API key used: ${apiKeyValue}`);
      return null;
    }

    // Validate secret
    const isSecretValid = await bcrypt.compare(secret, apiKey.secretHash);
    if (!isSecretValid) {
      return null;
    }

    // Check IP whitelist
    if (ipAddress && apiKey.ipWhitelist && apiKey.ipWhitelist.length > 0) {
      if (!apiKey.ipWhitelist.includes(ipAddress)) {
        this.logger.warn(`API key used from non-whitelisted IP: ${ipAddress}`);
        return null;
      }
    }

    // Update last used
    apiKey.lastUsedAt = new Date();
    await this.apiKeyRepository.save(apiKey);

    return apiKey;
  }

  /**
   * Verify request signature (HMAC-SHA256)
   */
  verifySignature(
    secret: string,
    timestamp: string,
    method: string,
    path: string,
    body: string,
    signature: string,
  ): boolean {
    const message = `${timestamp}${method}${path}${body}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Check for replay attack (nonce validation)
   */
  async validateNonce(
    nonce: string,
    timestamp: string,
  ): Promise<boolean> {
    // Timestamp should be within 5 minutes
    const requestTime = parseInt(timestamp);
    const currentTime = Date.now();
    const timeDiff = Math.abs(currentTime - requestTime);
    
    if (timeDiff > 5 * 60 * 1000) { // 5 minutes
      return false;
    }

    // In production, check nonce in Redis to prevent reuse
    // For now, we'll just validate timestamp
    return true;
  }

  /**
   * Rotate API secret
   */
  async rotateSecret(
    userId: string,
    apiKeyId: string,
  ): Promise<{ apiKey: ApiKey; secret: string }> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: apiKeyId, userId },
    });

    if (!apiKey) {
      throw new BadRequestException('API key not found');
    }

    const newSecret = this.generateSecret();
    const secretHash = await bcrypt.hash(newSecret, 10);

    apiKey.secretHash = secretHash;
    apiKey.lastRotatedAt = new Date();
    await this.apiKeyRepository.save(apiKey);

    this.logger.log(`API secret rotated for key ${apiKeyId}`);

    return { apiKey, secret: newSecret };
  }

  /**
   * Update API key permissions
   */
  async updatePermissions(
    userId: string,
    apiKeyId: string,
    permissions: ApiKeyPermission[],
  ): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: apiKeyId, userId },
    });

    if (!apiKey) {
      throw new BadRequestException('API key not found');
    }

    apiKey.permissions = permissions;
    return await this.apiKeyRepository.save(apiKey);
  }

  /**
   * Update IP whitelist
   */
  async updateIpWhitelist(
    userId: string,
    apiKeyId: string,
    ipWhitelist: string[],
  ): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: apiKeyId, userId },
    });

    if (!apiKey) {
      throw new BadRequestException('API key not found');
    }

    apiKey.ipWhitelist = ipWhitelist;
    return await this.apiKeyRepository.save(apiKey);
  }

  /**
   * Get user's API keys
   */
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    return await this.apiKeyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Deactivate API key
   */
  async deactivateApiKey(userId: string, apiKeyId: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: apiKeyId, userId },
    });

    if (!apiKey) {
      throw new BadRequestException('API key not found');
    }

    apiKey.isActive = false;
    await this.apiKeyRepository.save(apiKey);

    // Log security event
    await this.logSecurityEvent(userId, SecurityEventType.API_KEY_DELETED, {
      keyName: apiKey.keyName,
    });

    this.logger.log(`API key deactivated: ${apiKeyId}`);
  }

  /**
   * Delete API key
   */
  async deleteApiKey(userId: string, apiKeyId: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: apiKeyId, userId },
    });

    if (!apiKey) {
      throw new BadRequestException('API key not found');
    }

    await this.apiKeyRepository.delete(apiKeyId);

    // Log security event
    await this.logSecurityEvent(userId, SecurityEventType.API_KEY_DELETED, {
      keyName: apiKey.keyName,
    });

    this.logger.log(`API key deleted: ${apiKeyId}`);
  }

  /**
   * Generate API key
   */
  private generateApiKey(): string {
    const random = crypto.randomBytes(32).toString('hex');
    return `${this.API_KEY_PREFIX}${random}`;
  }

  /**
   * Generate API secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(
    userId: string,
    eventType: SecurityEventType,
    details: Record<string, any>,
  ): Promise<void> {
    const event = this.securityEventRepository.create({
      userId,
      eventType,
      riskLevel: RiskLevel.MEDIUM,
      details,
    });

    await this.securityEventRepository.save(event);
  }
}
