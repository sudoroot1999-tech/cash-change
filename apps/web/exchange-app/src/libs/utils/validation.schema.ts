import { z } from 'zod';
import * as Joi from 'joi';

// Zod Schemas
export const ZodSchemas = {
    // User schemas
    email: z.string().email().min(5).max(255),
    password: z.string().min(8).max(128),
    username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
    phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),

    // Crypto schemas
    cryptoAddress: z.string().min(26).max(64),
    amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
    transactionHash: z.string().length(64),

    // API schemas
    apiKey: z.string().length(64),
    uuid: z.string().uuid(),

    // Common schemas
    url: z.string().url(),
    date: z.string().datetime(),
    positiveNumber: z.number().positive(),
    nonNegativeNumber: z.number().nonnegative(),

    // Registration schema
    register: z.object({
        email: z.string().min(1, 'Email is required').email(),
        password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters').max(128),
        username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
        referralCode: z.string().optional(),
        phone: z.string().optional(),
        phishingCode: z.string().optional(),
        acceptTerms: z.boolean().refine((val: any) => val === true).optional(),
        rememberMe: z.boolean().optional(),
    }),

    // Login schema
    login: z.object({
        email: z.string().min(1, 'Email is required').email(),
        password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
        twoFactorCode: z.string().length(6).optional(),
        rememberMe: z.boolean().optional(),
    }),

    // Withdrawal schema
    withdrawal: z.object({
        currency: z.string().min(2).max(10),
        amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
        address: z.string().min(26).max(64),
        network: z.string().optional(),
        memo: z.string().max(100).optional(),
        twoFactorCode: z.string().length(6),
    }),

    // Deposit schema
    deposit: z.object({
        currency: z.string().min(2).max(10),
        amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
        network: z.string().optional(),
    }),

    // Trade schema
    trade: z.object({
        symbol: z.string().regex(/^[A-Z]+\/[A-Z]+$/),
        side: z.enum(['buy', 'sell']),
        type: z.enum(['market', 'limit', 'stop', 'stop_limit']),
        amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
        price: z.string().regex(/^\d+(\.\d{1,8})?$/).optional(),
        stopPrice: z.string().regex(/^\d+(\.\d{1,8})?$/).optional(),
    }),

    // KYC schema
    kyc: z.object({
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        nationality: z.string().length(2),
        address: z.object({
            street: z.string().min(1).max(200),
            city: z.string().min(1).max(100),
            state: z.string().max(100).optional(),
            postalCode: z.string().min(1).max(20),
            country: z.string().length(2),
        }),
        documentType: z.enum(['passport', 'id_card', 'drivers_license']),
        documentNumber: z.string().min(1).max(50),
    }),
};

// Joi Schemas
export const JoiSchemas = {
    // User schemas
    email: Joi.string().email().min(5).max(255).required(),
    password: Joi.string().min(8).max(128).required(),
    username: Joi.string().min(3).max(50).pattern(/^[a-zA-Z0-9_-]+$/).required(),
    phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),

    // Crypto schemas
    cryptoAddress: Joi.string().min(26).max(64).required(),
    amount: Joi.string().pattern(/^\d+(\.\d{1,8})?$/).required(),
    transactionHash: Joi.string().length(64).required(),

    // API schemas
    apiKey: Joi.string().length(64).required(),
    uuid: Joi.string().uuid().required(),

    // Registration schema
    register: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).max(128).required(),
        username: Joi.string().min(3).max(50).pattern(/^[a-zA-Z0-9_-]+$/).required(),
        acceptTerms: Joi.boolean().valid(true).required(),
    }),

    // Login schema
    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
        twoFactorCode: Joi.string().length(6).optional(),
    }),

    // Withdrawal schema
    withdrawal: Joi.object({
        currency: Joi.string().min(2).max(10).required(),
        amount: Joi.string().pattern(/^\d+(\.\d{1,8})?$/).required(),
        address: Joi.string().min(26).max(64).required(),
        network: Joi.string().optional(),
        memo: Joi.string().max(100).optional(),
        twoFactorCode: Joi.string().length(6).required(),
    }),

    // Deposit schema
    deposit: Joi.object({
        currency: Joi.string().min(2).max(10).required(),
        amount: Joi.string().pattern(/^\d+(\.\d{1,8})?$/).required(),
        network: Joi.string().optional(),
    }),

    // Trade schema
    trade: Joi.object({
        symbol: Joi.string().pattern(/^[A-Z]+\/[A-Z]+$/).required(),
        side: Joi.string().valid('buy', 'sell').required(),
        type: Joi.string().valid('market', 'limit', 'stop', 'stop_limit').required(),
        amount: Joi.string().pattern(/^\d+(\.\d{1,8})?$/).required(),
        price: Joi.string().pattern(/^\d+(\.\d{1,8})?$/).optional(),
        stopPrice: Joi.string().pattern(/^\d+(\.\d{1,8})?$/).optional(),
    }),

    // KYC schema
    kyc: Joi.object({
        firstName: Joi.string().min(1).max(100).required(),
        lastName: Joi.string().min(1).max(100).required(),
        dateOfBirth: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
        nationality: Joi.string().length(2).required(),
        address: Joi.object({
            street: Joi.string().min(1).max(200).required(),
            city: Joi.string().min(1).max(100).required(),
            state: Joi.string().max(100).optional(),
            postalCode: Joi.string().min(1).max(20).required(),
            country: Joi.string().length(2).required(),
        }).required(),
        documentType: Joi.string().valid('passport', 'id_card', 'drivers_license').required(),
        documentNumber: Joi.string().min(1).max(50).required(),
    }),
};