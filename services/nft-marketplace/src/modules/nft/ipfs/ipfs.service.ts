import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { create } from 'ipfs-http-client/dist/index.js';
import axios from 'axios';

@Injectable()
export class IpfsService {
  private readonly logger = new Logger(IpfsService.name);
  private ipfsClient: any;
  private readonly pinataApiKey: string;
  private readonly pinataSecretKey: string;
  private readonly ipfsGateway: string;

  constructor(private configService: ConfigService) {
    // Initialize IPFS client (Infura)
    const projectId = this.configService.get('IPFS_PROJECT_ID');
    const projectSecret = this.configService.get('IPFS_PROJECT_SECRET');
    const apiUrl = this.configService.get('IPFS_API_URL');

    // IPFS client disabled for testnet deployment
    // if (projectId && projectSecret) {
    //   const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
    //   this.ipfsClient = create({
    //     url: apiUrl,
    //     headers: {
    //       authorization: auth,
    //     },
    //   });
    // }
    this.ipfsClient = null; // Testnet mode - IPFS disabled

    // Pinata credentials
    this.pinataApiKey = this.configService.get('PINATA_API_KEY');
    this.pinataSecretKey = this.configService.get('PINATA_SECRET_KEY');
    this.ipfsGateway = this.configService.get('IPFS_GATEWAY_URL');
  }

  /**
   * Upload file to IPFS
   */
  async uploadFile(file: Buffer, filename: string): Promise<string> {
    try {
      if (this.pinataApiKey && this.pinataSecretKey) {
        return await this.uploadToPinata(file, filename);
      } else if (this.ipfsClient) {
        return await this.uploadToInfura(file);
      } else {
        throw new Error('No IPFS service configured');
      }
    } catch (error) {
      this.logger.error(`Error uploading file to IPFS: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Upload JSON metadata to IPFS
   */
  async uploadMetadata(metadata: any): Promise<string> {
    try {
      const jsonString = JSON.stringify(metadata);
      const buffer = Buffer.from(jsonString);

      if (this.pinataApiKey && this.pinataSecretKey) {
        return await this.uploadToPinata(buffer, 'metadata.json');
      } else if (this.ipfsClient) {
        return await this.uploadToInfura(buffer);
      } else {
        throw new Error('No IPFS service configured');
      }
    } catch (error) {
      this.logger.error(`Error uploading metadata to IPFS: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Upload to Infura IPFS
   */
  private async uploadToInfura(data: Buffer): Promise<string> {
    const result = await this.ipfsClient.add(data);
    const cid = result.path;
    this.logger.log(`File uploaded to Infura IPFS: ${cid}`);
    return cid;
  }

  /**
   * Upload to Pinata
   */
  private async uploadToPinata(data: Buffer, filename: string): Promise<string> {
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', data, filename);

    const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      maxBodyLength: Infinity,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
        pinata_api_key: this.pinataApiKey,
        pinata_secret_api_key: this.pinataSecretKey,
      },
    });

    const cid = response.data.IpfsHash;
    this.logger.log(`File uploaded to Pinata: ${cid}`);
    return cid;
  }

  /**
   * Pin existing CID
   */
  async pinCid(cid: string, name?: string): Promise<void> {
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      this.logger.warn('Pinata credentials not configured, skipping pin');
      return;
    }

    try {
      await axios.post(
        'https://api.pinata.cloud/pinning/pinByHash',
        {
          hashToPin: cid,
          pinataMetadata: { name },
        },
        {
          headers: {
            pinata_api_key: this.pinataApiKey,
            pinata_secret_api_key: this.pinataSecretKey,
          },
        },
      );

      this.logger.log(`CID pinned successfully: ${cid}`);
    } catch (error) {
      this.logger.error(`Error pinning CID: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Fetch metadata from IPFS
   */
  async fetchMetadata(uri: string): Promise<any> {
    try {
      // Extract CID from URI
      const cid = this.extractCidFromUri(uri);
      const url = `${this.ipfsGateway}${cid}`;

      const response = await axios.get(url, { timeout: 10000 });
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching metadata from IPFS: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Validate NFT metadata
   */
  validateMetadata(metadata: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!metadata.name) {
      errors.push('Missing required field: name');
    }

    if (!metadata.image && !metadata.animation_url) {
      errors.push('Must have either image or animation_url');
    }

    // Validate attributes format
    if (metadata.attributes) {
      if (!Array.isArray(metadata.attributes)) {
        errors.push('Attributes must be an array');
      } else {
        metadata.attributes.forEach((attr: any, index: number) => {
          if (!attr.trait_type) {
            errors.push(`Attribute at index ${index} missing trait_type`);
          }
          if (attr.value === undefined) {
            errors.push(`Attribute at index ${index} missing value`);
          }
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract CID from various URI formats
   */
  private extractCidFromUri(uri: string): string {
    // Handle ipfs:// protocol
    if (uri.startsWith('ipfs://')) {
      return uri.replace('ipfs://', '');
    }

    // Handle gateway URLs
    if (uri.includes('/ipfs/')) {
      const parts = uri.split('/ipfs/');
      return parts[1];
    }

    // Assume it's already a CID
    return uri;
  }

  /**
   * Get IPFS gateway URL for a CID
   */
  getGatewayUrl(cid: string): string {
    return `${this.ipfsGateway}${cid}`;
  }

  /**
   * Build ERC-721 metadata
   */
  buildERC721Metadata(params: {
    name: string;
    description?: string;
    image: string;
    animationUrl?: string;
    externalUrl?: string;
    attributes?: Array<{ trait_type: string; value: any; display_type?: string }>;
    backgroundColor?: string;
  }): any {
    return {
      name: params.name,
      description: params.description || '',
      image: params.image,
      animation_url: params.animationUrl,
      external_url: params.externalUrl,
      attributes: params.attributes || [],
      background_color: params.backgroundColor,
    };
  }

  /**
   * Build ERC-1155 metadata
   */
  buildERC1155Metadata(params: {
    name: string;
    description?: string;
    image: string;
    decimals?: number;
    properties?: any;
  }): any {
    return {
      name: params.name,
      description: params.description || '',
      image: params.image,
      decimals: params.decimals || 0,
      properties: params.properties || {},
    };
  }
}
