import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface EncryptionConfig {
  algorithm?: string;
  keyLength?: number;
  ivLength?: number;
  saltLength?: number;
  iterations?: number;
  digest?: string;
}

@Injectable()
export class EncryptionService {
  private readonly algorithm: string;
  private readonly keyLength: number;
  private readonly ivLength: number;
  private readonly saltLength: number;
  private readonly iterations: number;
  private readonly digest: string;

  constructor(config?: EncryptionConfig) {
    this.algorithm = config?.algorithm || 'aes-256-gcm';
    this.keyLength = config?.keyLength || 32;
    this.ivLength = config?.ivLength || 16;
    this.saltLength = config?.saltLength || 64;
    this.iterations = config?.iterations || 100000;
    this.digest = config?.digest || 'sha512';
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(data: string, masterKey: string): string {
    try {
      const salt = crypto.randomBytes(this.saltLength);
      const key = crypto.pbkdf2Sync(
        masterKey,
        salt,
        this.iterations,
        this.keyLength,
        this.digest
      );
      
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = (cipher as any).getAuthTag();
      
      // Combine salt + iv + authTag + encrypted data
      const result = Buffer.concat([
        salt,
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
      ]);
      
      return result.toString('base64');
    } catch (error:any) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(encryptedData: string, masterKey: string): string {
    try {
      const buffer = Buffer.from(encryptedData, 'base64');
      
      const salt = buffer.slice(0, this.saltLength);
      const iv = buffer.slice(this.saltLength, this.saltLength + this.ivLength);
      const authTag = buffer.slice(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + 16
      );
      const encrypted = buffer.slice(this.saltLength + this.ivLength + 16);
      
      const key = crypto.pbkdf2Sync(
        masterKey,
        salt,
        this.iterations,
        this.keyLength,
        this.digest
      );
      
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      (decipher as any).setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error:any) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Hash data using SHA-256
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Hash data using SHA-512
   */
  hashSHA512(data: string): string {
    return crypto.createHash('sha512').update(data).digest('hex');
  }

  /**
   * Generate HMAC signature
   */
  generateHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifyHMAC(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Generate random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate secure random bytes
   */
  generateRandomBytes(length: number): Buffer {
    return crypto.randomBytes(length);
  }

  /**
   * Encrypt field-level data (for sensitive fields in database)
   */
  encryptField(value: string, fieldKey: string, masterKey: string): string {
    const combinedKey = this.hash(masterKey + fieldKey);
    return this.encrypt(value, combinedKey);
  }

  /**
   * Decrypt field-level data
   */
  decryptField(encryptedValue: string, fieldKey: string, masterKey: string): string {
    const combinedKey = this.hash(masterKey + fieldKey);
    return this.decrypt(encryptedValue, combinedKey);
  }

  /**
   * Generate key pair for asymmetric encryption
   */
  generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return { publicKey, privateKey };
  }

  /**
   * Encrypt with public key (RSA)
   */
  encryptWithPublicKey(data: string, publicKey: string): string {
    const buffer = Buffer.from(data, 'utf8');
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      buffer
    );
    return encrypted.toString('base64');
  }

  /**
   * Decrypt with private key (RSA)
   */
  decryptWithPrivateKey(encryptedData: string, privateKey: string): string {
    const buffer = Buffer.from(encryptedData, 'base64');
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      buffer
    );
    return decrypted.toString('utf8');
  }

  /**
   * Sign data with private key
   */
  sign(data: string, privateKey: string): string {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, 'base64');
  }

  /**
   * Verify signature with public key
   */
  verify(data: string, signature: string, publicKey: string): boolean {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, 'base64');
  }
}
