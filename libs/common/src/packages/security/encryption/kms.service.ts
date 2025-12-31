import { Injectable, Logger } from '@nestjs/common';
import { KMSClient, EncryptCommand, DecryptCommand, GenerateDataKeyCommand } from '@aws-sdk/client-kms';
import { SecretsManagerClient, GetSecretValueCommand, CreateSecretCommand, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager';

export interface KMSConfig {
  region: string;
  keyId: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

@Injectable()
export class KMSService {
  private readonly logger = new Logger(KMSService.name);
  private kmsClient: KMSClient;
  private secretsClient: SecretsManagerClient;
  private keyId: string;

  constructor(config: KMSConfig) {
    const clientConfig: any = {
      region: config.region,
    };

    if (config.accessKeyId && config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      };
    }

    this.kmsClient = new KMSClient(clientConfig);
    this.secretsClient = new SecretsManagerClient(clientConfig);
    this.keyId = config.keyId;
  }

  /**
   * Encrypt data using AWS KMS
   */
  async encrypt(plaintext: string): Promise<string> {
    try {
      const command = new EncryptCommand({
        KeyId: this.keyId,
        Plaintext: Buffer.from(plaintext, 'utf8'),
      });

      const response = await this.kmsClient.send(command);
      return Buffer.from(response.CiphertextBlob!).toString('base64');
    } catch (error:any) {
      this.logger.error(`KMS encryption failed: ${error.message}`);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data using AWS KMS
   */
  async decrypt(ciphertext: string): Promise<string> {
    try {
      const command = new DecryptCommand({
        KeyId: this.keyId,
        CiphertextBlob: Buffer.from(ciphertext, 'base64'),
      });

      const response = await this.kmsClient.send(command);
      return Buffer.from(response.Plaintext!).toString('utf8');
    } catch (error:any) {
      this.logger.error(`KMS decryption failed: ${error.message}`);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Generate data encryption key
   */
  async generateDataKey(): Promise<{ plaintext: Buffer; ciphertext: string }> {
    try {
      const command = new GenerateDataKeyCommand({
        KeyId: this.keyId,
        KeySpec: 'AES_256',
      });

      const response = await this.kmsClient.send(command);
      
      return {
        plaintext: Buffer.from(response.Plaintext!),
        ciphertext: Buffer.from(response.CiphertextBlob!).toString('base64'),
      };
    } catch (error:any) {
      this.logger.error(`Data key generation failed: ${error.message}`);
      throw new Error('Key generation failed');
    }
  }

  /**
   * Store secret in AWS Secrets Manager
   */
  async storeSecret(secretName: string, secretValue: string): Promise<void> {
    try {
      const command = new CreateSecretCommand({
        Name: secretName,
        SecretString: secretValue,
      });

      await this.secretsClient.send(command);
      this.logger.log(`Secret ${secretName} stored successfully`);
    } catch (error:any) {
      if (error.name === 'ResourceExistsException') {
        // Update existing secret
        await this.updateSecret(secretName, secretValue);
      } else {
        this.logger.error(`Failed to store secret: ${error.message}`);
        throw new Error('Secret storage failed');
      }
    }
  }

  /**
   * Update secret in AWS Secrets Manager
   */
  async updateSecret(secretName: string, secretValue: string): Promise<void> {
    try {
      const command = new UpdateSecretCommand({
        SecretId: secretName,
        SecretString: secretValue,
      });

      await this.secretsClient.send(command);
      this.logger.log(`Secret ${secretName} updated successfully`);
    } catch (error:any) {
      this.logger.error(`Failed to update secret: ${error.message}`);
      throw new Error('Secret update failed');
    }
  }

  /**
   * Retrieve secret from AWS Secrets Manager
   */
  async getSecret(secretName: string): Promise<string> {
    try {
      const command = new GetSecretValueCommand({
        SecretId: secretName,
      });

      const response = await this.secretsClient.send(command);
      return response.SecretString!;
    } catch (error:any) {
      this.logger.error(`Failed to retrieve secret: ${error.message}`);
      throw new Error('Secret retrieval failed');
    }
  }
}
