import { ZodSchema } from 'zod';
import * as Joi from 'joi';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/* ===================== ZOD ===================== */

export const zodValidator =
    (schema: ZodSchema<any>): ValidatorFn =>
        (control: AbstractControl): ValidationErrors | null => {
            const result = schema.safeParse(control.value);

            if (result.success) return null;

            const errors: Record<string, string> = {};

            for (const issue of result.error.issues) {
                const path = issue.path.join('.') || 'form';
                errors[path] = issue.message;
            }

            return errors;
        };

/* ===================== JOI ===================== */

export const validateJoi = <T>(
    schema: Joi.Schema,
    data: unknown,
): T => {
    const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
    });

    if (error) {
        const messages = error.details.map(d => d.message);
        throw new Error('Validation failed', { cause: messages });
    }

    return value;
};

/* ===================== SANITIZATION ===================== */

export const sanitizeString = (input: string): string => {
    if (!input) return input;

    return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
};

export const sanitizeHTML = (html: string): string => {
    if (!html) return html;

    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
};

/* ===================== BASIC VALIDATORS ===================== */

export const isValidEmail = (email: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidUrl = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

export const isValidPhoneNumber = (phone: string): boolean =>
    /^\+?[1-9]\d{1,14}$/.test(phone);

export const isValidUUID = (uuid: string): boolean =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        uuid,
    );

/* ===================== CRYPTO ===================== */

export type CryptoType = 'BTC' | 'ETH' | 'SOL';

export const isValidCryptoAddress = (
    address: string,
    type: CryptoType,
): boolean => {
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
};

/* ===================== PASSWORD ===================== */

export const validatePasswordStrength = (password: string) => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score++;
    else feedback.push('Password must be at least 8 characters long');

    if (password.length >= 12) score++;

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    else feedback.push('Password must contain both uppercase and lowercase letters');

    if (/\d/.test(password)) score++;
    else feedback.push('Password must contain at least one number');

    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++;
    else feedback.push('Password must contain at least one special character');

    if (/^(.)\1+$/.test(password)) {
        feedback.push('Password cannot be all the same character');
        score = 0;
    }

    if (
        /^(012|123|234|345|456|567|678|789|abc|bcd|cde|def|xyz)/i.test(password)
    ) {
        feedback.push('Password contains common sequential patterns');
        score = Math.max(0, score - 1);
    }

    return {
        isValid: score >= 4 && feedback.length === 0,
        score,
        feedback,
    };
};

/* ===================== INJECTION ===================== */

export const containsSQLInjection = (input: string): boolean => {
    const patterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
        /(--|;|\/\*|\*\/)/gi,
        /('|\\'|--|\+|\|\|)/gi,
    ];

    return patterns.some(p => p.test(input));
};

export const containsNoSQLInjection = (input: unknown): boolean => {
    if (typeof input !== 'object' || input === null) return false;

    const dangerousKeys = ['$where', '$regex', '$ne', '$gt', '$lt', '$gte', '$lte'];

    const walk = (obj: any): boolean =>
        Object.keys(obj).some(
            key =>
                dangerousKeys.includes(key) ||
                (typeof obj[key] === 'object' && walk(obj[key])),
        );

    return walk(input);
};

/* ===================== FILE ===================== */

export const validateFileUpload = (
    file: any,
    options: {
        maxSize?: number;
        allowedMimeTypes?: string[];
        allowedExtensions?: string[];
    },
): { isValid: boolean; error?: string } => {
    if (options.maxSize && file.size > options.maxSize) {
        return { isValid: false, error: 'File size limit exceeded' };
    }

    if (
        options.allowedMimeTypes &&
        !options.allowedMimeTypes.includes(file.mimetype)
    ) {
        return { isValid: false, error: 'Invalid file type' };
    }

    if (options.allowedExtensions) {
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        if (!ext || !options.allowedExtensions.includes(ext)) {
            return { isValid: false, error: 'Invalid file extension' };
        }
    }

    return { isValid: true };
};

/* ===================== IP & AMOUNT ===================== */

export const isValidIP = (ip: string): boolean => {
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6 = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    if (ipv4.test(ip)) {
        return ip.split('.').every(o => +o >= 0 && +o <= 255);
    }

    return ipv6.test(ip);
};

export const isValidAmount = (
    amount: string | number,
    decimals = 8,
): boolean => {
    const num = typeof amount === 'string' ? Number(amount) : amount;
    if (isNaN(num) || num < 0) return false;

    const decimal = amount.toString().split('.')[1];
    return !decimal || decimal.length <= decimals;
};
