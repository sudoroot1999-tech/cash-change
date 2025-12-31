import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as tls from 'tls';
import * as fs from 'fs';
import * as crypto from 'crypto';

export interface MTLSConfig {
  caPath: string;
  certPath: string;
  keyPath: string;
  rejectUnauthorized?: boolean;
  allowedServices?: string[];
}

@Injectable()
export class MTLSService {
  private readonly logger = new Logger(MTLSService.name);
  private ca: Buffer;
  private cert: Buffer;
  private key: Buffer;
  private allowedServices: Set<string>;
  private rejectUnauthorized: boolean;

  constructor(config: MTLSConfig) {
    try {
      this.ca = fs.readFileSync(config.caPath);
      this.cert = fs.readFileSync(config.certPath);
      this.key = fs.readFileSync(config.keyPath);
      this.allowedServices = new Set(config.allowedServices || []);
      this.rejectUnauthorized = config.rejectUnauthorized ?? true;
      
      this.logger.log('mTLS configuration loaded successfully');
    } catch (error:any) {
      this.logger.error(`Failed to load mTLS certificates: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get TLS options for server
   */
  getServerOptions(): tls.TlsOptions {
    return {
      ca: this.ca,
      cert: this.cert,
      key: this.key,
      requestCert: true,
      rejectUnauthorized: this.rejectUnauthorized,
    };
  }

  /**
   * Get TLS options for client
   */
  getClientOptions(): tls.ConnectionOptions {
    return {
      ca: this.ca,
      cert: this.cert,
      key: this.key,
      rejectUnauthorized: this.rejectUnauthorized,
    };
  }

  /**
   * Verify client certificate
   */
  verifyClientCertificate(cert: any): boolean {
    if (!cert) {
      this.logger.warn('No client certificate provided');
      return false;
    }

    try {
      // Check if certificate is valid
      const now = new Date();
      const validFrom = new Date(cert.valid_from);
      const validTo = new Date(cert.valid_to);

      if (now < validFrom || now > validTo) {
        this.logger.warn('Client certificate is expired or not yet valid');
        return false;
      }

      // Check if service is allowed
      if (this.allowedServices.size > 0) {
        const commonName = cert.subject.CN;
        if (!this.allowedServices.has(commonName)) {
          this.logger.warn(`Service ${commonName} is not in allowed list`);
          return false;
        }
      }

      return true;
    } catch (error:any) {
      this.logger.error(`Certificate verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Extract service name from certificate
   */
  getServiceName(cert: any): string {
    return cert?.subject?.CN || 'unknown';
  }

  /**
   * Generate certificate fingerprint
   */
  getCertificateFingerprint(cert: any): string {
    const der = Buffer.from(cert.raw, 'binary');
    return crypto.createHash('sha256').update(der).digest('hex');
  }

  /**
   * Middleware to verify mTLS
   */
  createVerificationMiddleware() {
    return (req: any, res: any, next: any) => {
      const cert = req.socket.getPeerCertificate();

      if (!this.verifyClientCertificate(cert)) {
        throw new UnauthorizedException('Invalid client certificate');
      }

      // Attach service info to request
      req.service = {
        name: this.getServiceName(cert),
        fingerprint: this.getCertificateFingerprint(cert),
      };

      next();
    };
  }

  /**
   * Add service to allowed list
   */
  addAllowedService(serviceName: string): void {
    this.allowedServices.add(serviceName);
    this.logger.log(`Added ${serviceName} to allowed services`);
  }

  /**
   * Remove service from allowed list
   */
  removeAllowedService(serviceName: string): void {
    this.allowedServices.delete(serviceName);
    this.logger.log(`Removed ${serviceName} from allowed services`);
  }

  /**
   * Check if service is allowed
   */
  isServiceAllowed(serviceName: string): boolean {
    return this.allowedServices.size === 0 || this.allowedServices.has(serviceName);
  }
}
