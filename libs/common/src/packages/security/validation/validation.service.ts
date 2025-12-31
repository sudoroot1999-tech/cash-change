import { Injectable, BadRequestException } from '@nestjs/common';
import { z, ZodSchema } from 'zod';
import * as Joi from 'joi';

@Injectable()
export class ValidationService {
  /**
   * Validate data against Zod schema
   */
  validateZod<T>(schema: ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(
          (err) => `${err.path.join('.')}: ${err.message}`,
        );
        throw new BadRequestException({
          message: 'Validation failed',
          errors: messages,
        });
      }
      throw error;
    }
  }

  /**
   * Validate data against Joi schema
   */
  validateJoi<T>(schema: Joi.Schema, data: unknown): T {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((detail) => detail.message);
      throw new BadRequestException({
        message: 'Validation failed',
        errors: messages,
      });
    }

    return value;
  }

  /**
   * Sanitize string to prevent XSS
   */
  sanitizeString(input: string): string {
    if (!input) return input;

    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Sanitize HTML content
   */
  sanitizeHTML(html: string): string {
    if (!html) return html;

    // Basic HTML sanitization - in production use a library like DOMPurify
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate cryptocurrency address
   */
  isValidCryptoAddress(address: string, type: 'BTC' | 'ETH' | 'SOL'): boolean {
    switch (type) {
      case 'BTC':
        return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(address);
      case 'ETH':
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      case 'SOL':
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
      default:
        return false;
    }
  }

  /**
   * Validate phone number (international format)
   */
  isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate UUID
   */
  isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length < 8) {
      feedback.push('Password must be at least 8 characters long');
    } else {
      score += 1;
    }

    if (password.length >= 12) {
      score += 1;
    }

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password must contain both uppercase and lowercase letters');
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password must contain at least one number');
    }

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password must contain at least one special character');
    }

    // Check for common patterns
    if (/^(.)\1+$/.test(password)) {
      feedback.push('Password cannot be all the same character');
      score = 0;
    }

    if (/^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
      feedback.push('Password contains common sequential patterns');
      score = Math.max(0, score - 1);
    }

    return {
      isValid: score >= 4 && feedback.length === 0,
      score,
      feedback,
    };
  }

  /**
   * Validate SQL injection patterns
   */
  containsSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
      /(--|;|\/\*|\*\/|xp_|sp_)/gi,
      /('|(\\')|(--)|(-)|(\+)|(\|\|))/gi,
    ];

    return sqlPatterns.some((pattern) => pattern.test(input));
  }

  /**
   * Validate NoSQL injection patterns
   */
  containsNoSQLInjection(input: any): boolean {
    if (typeof input !== 'object' || input === null) {
      return false;
    }

    const dangerousKeys = ['$where', '$regex', '$ne', '$gt', '$lt', '$gte', '$lte'];
    
    const checkObject = (obj: any): boolean => {
      for (const key in obj) {
        if (dangerousKeys.includes(key)) {
          return true;
        }
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (checkObject(obj[key])) {
            return true;
          }
        }
      }
      return false;
    };

    return checkObject(input);
  }

  /**
   * Validate and sanitize file upload
   */
  validateFileUpload(
    file: Express.Multer.File,
    options: {
      maxSize?: number;
      allowedMimeTypes?: string[];
      allowedExtensions?: string[];
    },
  ): { isValid: boolean; error?: string } {
    if (options.maxSize && file.size > options.maxSize) {
      return {
        isValid: false,
        error: `File size exceeds maximum allowed size of ${options.maxSize} bytes`,
      };
    }

    if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        error: `File type ${file.mimetype} is not allowed`,
      };
    }

    if (options.allowedExtensions) {
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      if (!ext || !options.allowedExtensions.includes(ext)) {
        return {
          isValid: false,
          error: `File extension .${ext} is not allowed`,
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate IP address
   */
  isValidIP(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    if (ipv4Regex.test(ip)) {
      return ip.split('.').every((octet) => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255;
      });
    }
    
    return ipv6Regex.test(ip);
  }

  /**
   * Validate amount/decimal number
   */
  isValidAmount(amount: string | number, decimals: number = 8): boolean {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(num) || num < 0) {
      return false;
    }

    const decimalPart = amount.toString().split('.')[1];
    if (decimalPart && decimalPart.length > decimals) {
      return false;
    }

    return true;
  }
}
