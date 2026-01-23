import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Redis from 'ioredis';

export interface APIKey {
  id: string;
  key: string;
  secret: string;
  userId: string;
  name: string;
  permissions: string[];
  ipWhitelist?: string[];
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  expiresAt?: Date;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface APIKeyMetadata {
  id: string;
  userId: string;
  name: string;
  permissions: string[];
  ipWhitelist?: string[];
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
}

@Injectable()
export class APIKeyService {
  private readonly logger = new Logger(APIKeyService.name);
  private redis: Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis(configService.get('REDIS_URL'));
  }

  /**
   * Generate new API key pair
   */
  generateAPIKey(): { key: string; secret: string } {
    const key = `ak_${crypto.randomBytes(16).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('hex');

    return { key, secret };
  }

  /**
   * Create API key
   */
  async createAPIKey(
    userId: string,
    name: string,
    permissions: string[],
    options?: {
      ipWhitelist?: string[];
      rateLimit?: { windowMs: number; maxRequests: number };
      expiresAt?: Date;
    },
  ): Promise<APIKey> {
    const { key, secret } = this.generateAPIKey();
    const id = crypto.randomBytes(16).toString('hex');

    const apiKey: APIKey = {
      id,
      key,
      secret,
      userId,
      name,
      permissions,
      ipWhitelist: options?.ipWhitelist,
      rateLimit: options?.rateLimit,
      expiresAt: options?.expiresAt,
      createdAt: new Date(),
    };

    // Store in Redis
    await this.redis.set(
      `api_key:${key}`,
      JSON.stringify(apiKey),
      'EX',
      options?.expiresAt
        ? Math.floor((options.expiresAt.getTime() - Date.now()) / 1000)
        : 365 * 24 * 60 * 60, // 1 year default
    );

    // Store key ID for user
    await this.redis.sadd(`user_api_keys:${userId}`, id);

    this.logger.log(`Created API key ${id} for user ${userId}`);

    return apiKey;
  }

  /**
   * Verify API key and signature
   */
  async verifyAPIKey(
    key: string,
    signature: string,
    timestamp: string,
    body: string,
    ip?: string,
  ): Promise<APIKeyMetadata> {
    const apiKeyData = await this.redis.get(`api_key:${key}`);

    if (!apiKeyData) {
      throw new UnauthorizedException('Invalid API key');
    }

    const apiKey: APIKey = JSON.parse(apiKeyData);

    // Check expiration
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    // Check IP whitelist
    if (apiKey.ipWhitelist && apiKey.ipWhitelist.length > 0 && ip) {
      if (!apiKey.ipWhitelist.includes(ip)) {
        this.logger.warn(`API key ${key} used from unauthorized IP: ${ip}`);
        throw new UnauthorizedException('IP not whitelisted');
      }
    }

    // Verify signature
    const expectedSignature = this.generateSignature(
      timestamp,
      body,
      apiKey.secret,
    );

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Check timestamp (prevent replay attacks)
    const requestTime = parseInt(timestamp, 10);
    const now = Date.now();
    const timeDiff = Math.abs(now - requestTime);

    if (timeDiff > 60000) {
      // 1 minute tolerance
      throw new UnauthorizedException('Request timestamp is too old');
    }

    // Update last used
    apiKey.lastUsedAt = new Date();
    await this.redis.set(`api_key:${key}`, JSON.stringify(apiKey));

    return {
      id: apiKey.id,
      userId: apiKey.userId,
      name: apiKey.name,
      permissions: apiKey.permissions,
      ipWhitelist: apiKey.ipWhitelist,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
    };
  }

  /**
   * Generate HMAC signature
   */
  generateSignature(timestamp: string, body: string, secret: string): string {
    const message = `${timestamp}${body}`;
    return crypto.createHmac('sha256', secret).update(message).digest('hex');
  }

  /**
   * Revoke API key
   */
  async revokeAPIKey(keyId: string, userId: string): Promise<void> {
    // Find the key
    const keys = await this.redis.smembers(`user_api_keys:${userId}`);

    for (const id of keys) {
      const keyData = await this.redis.get(`api_key:${id}`);
      if (keyData) {
        const apiKey: APIKey = JSON.parse(keyData);
        if (apiKey.id === keyId) {
          await this.redis.del(`api_key:${apiKey.key}`);
          await this.redis.srem(`user_api_keys:${userId}`, id);
          this.logger.log(`Revoked API key ${keyId} for user ${userId}`);
          return;
        }
      }
    }

    throw new Error('API key not found');
  }

  /**
   * List user's API keys
   */
  async listAPIKeys(userId: string): Promise<APIKeyMetadata[]> {
    const keyIds = await this.redis.smembers(`user_api_keys:${userId}`);
    const keys: APIKeyMetadata[] = [];

    for (const id of keyIds) {
      const keyData = await this.redis.get(`api_key:${id}`);
      if (keyData) {
        const apiKey: APIKey = JSON.parse(keyData);
        keys.push({
          id: apiKey.id,
          userId: apiKey.userId,
          name: apiKey.name,
          permissions: apiKey.permissions,
          ipWhitelist: apiKey.ipWhitelist,
          createdAt: apiKey.createdAt,
          lastUsedAt: apiKey.lastUsedAt,
          expiresAt: apiKey.expiresAt,
        });
      }
    }

    return keys;
  }

  /**
   * Check API key permissions
   */
  hasPermission(apiKey: APIKeyMetadata, permission: string): boolean {
    return apiKey.permissions.includes(permission) || apiKey.permissions.includes('*');
  }

  /**
   * Rotate API key secret
   */
  async rotateSecret(keyId: string, userId: string): Promise<{ key: string; secret: string }> {
    const keys = await this.redis.smembers(`user_api_keys:${userId}`);

    for (const id of keys) {
      const keyData = await this.redis.get(`api_key:${id}`);
      if (keyData) {
        const apiKey: APIKey = JSON.parse(keyData);
        if (apiKey.id === keyId) {
          const newSecret = crypto.randomBytes(32).toString('hex');
          apiKey.secret = newSecret;

          await this.redis.set(`api_key:${apiKey.key}`, JSON.stringify(apiKey));

          this.logger.log(`Rotated secret for API key ${keyId}`);

          return { key: apiKey.key, secret: newSecret };
        }
      }
    }

    throw new Error('API key not found');
  }
}
