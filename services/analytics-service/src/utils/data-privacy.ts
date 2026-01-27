import crypto from 'crypto';

export class DataPrivacy {
  private static readonly SALT = 'analytics-service-salt';

  /**
   * Hash PII data for anonymization
   */
  static hashPII(data: string): string {
    return crypto
      .createHmac('sha256', this.SALT)
      .update(data)
      .digest('hex');
  }

  /**
   * Mask email addresses
   */
  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***';
    
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2 
      ? local.substring(0, 2) + '***' 
      : '***';
    const [domainName, tld] = domain.split('.');
    const maskedDomain = domainName.length > 2 
      ? domainName.substring(0, 2) + '***' 
      : '***';
    
    return `${maskedLocal}@${maskedDomain}.${tld}`;
  }

  /**
   * Mask phone numbers
   */
  static maskPhone(phone: string): string {
    if (!phone) return '***';
    
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '***';
    
    return '***-***-' + digits.slice(-4);
  }

  /**
   * Mask user ID for display
   */
  static maskUserId(userId: string): string {
    if (!userId || userId.length < 8) return '***';
    
    return userId.substring(0, 4) + '***' + userId.substring(userId.length - 4);
  }

  /**
   * Anonymize user data for analytics
   */
  static anonymizeUserData(data: any): any {
    const anonymized = { ...data };

    // Remove or hash PII fields
    if (anonymized.email) {
      anonymized.email_hash = this.hashPII(anonymized.email);
      delete anonymized.email;
    }

    if (anonymized.phone) {
      anonymized.phone_hash = this.hashPII(anonymized.phone);
      delete anonymized.phone;
    }

    if (anonymized.full_name) {
      delete anonymized.full_name;
    }

    if (anonymized.address) {
      delete anonymized.address;
    }

    if (anonymized.ip_address) {
      anonymized.ip_hash = this.hashPII(anonymized.ip_address);
      delete anonymized.ip_address;
    }

    return anonymized;
  }

  /**
   * Check if data contains PII that should be masked
   */
  static containsPII(data: any): boolean {
    const piiFields = ['email', 'phone', 'full_name', 'address', 'ssn', 'passport'];
    
    return piiFields.some(field => data.hasOwnProperty(field));
  }

  /**
   * Apply GDPR data minimization
   */
  static minimizeData(data: any, allowedFields: string[]): any {
    const minimized: any = {};

    allowedFields.forEach(field => {
      if (data.hasOwnProperty(field)) {
        minimized[field] = data[field];
      }
    });

    return minimized;
  }

  /**
   * Generate anonymous user segment
   */
  static generateSegment(userData: any): string {
    const segments: string[] = [];

    // Trading volume segment
    if (userData.total_volume > 100000) {
      segments.push('high-volume');
    } else if (userData.total_volume > 10000) {
      segments.push('medium-volume');
    } else {
      segments.push('low-volume');
    }

    // Activity segment
    if (userData.last_active) {
      const daysSinceActive = Math.floor(
        (Date.now() - new Date(userData.last_active).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceActive < 7) {
        segments.push('active');
      } else if (daysSinceActive < 30) {
        segments.push('inactive');
      } else {
        segments.push('dormant');
      }
    }

    return segments.join('-');
  }
}
