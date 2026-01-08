import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { SecurityPort } from "../ports/security.port";
import { UserSession, UserTwoFactor, TrustedDevice, LoginHistory, snakeToCamel, ApiResponse } from "@exchange/common";
import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom, Observable } from "rxjs";

interface SnakedUserSession {
    id: string;
    user_id: string;
    session_token: string;
    refresh_token?: string | null;
    device_fingerprint?: string | null;
    ip_address: string;
    user_agent?: string | null;
    metadata?: {
        browser?: string;
        os?: string;
        device?: string;
        location?: string;
    } | null;
    is_active: boolean;
    expires_at: Date;
    last_activity_at: Date;
    created_at: Date;
    updated_at: Date;
}

interface SnakedTrustedDevice {
    id: string;
    user_id: string;
    device_name?: string | null;
    fingerprint: string;
    metadata?: {
        browser?: string;
        os?: string;
        device?: string;
        screen_resolution?: string;
        timezone?: string;
        language?: string;
    } | null;
    ip_address?: string | null;
    location?: string | null;
    country_code?: string | null;
    city?: string | null;
    is_trusted: boolean;
    last_used_at?: Date | null;
    created_at: Date;
    updated_at: Date;
}

interface SnakedUserTwoFactor {
    id: string;
    user_id: string;
    secret: string;
    backup_codes: string[];
    is_enabled: boolean;
    last_verified_at?: Date | null;
    created_at: Date;
    updated_at: Date;
}

interface SnakedLoginHistory {
    id: string;
    user_id: string;
    status: LoginStatus;
    ip_address: string;
    location?: string | null;
    country_code?: string | null;
    city?: string | null;
    latitude?: string | null;
    longitude?: string | null;
    device_fingerprint?: string | null;
    user_agent?: string | null;
    metadata?: {
        browser?: string;
        os?: string;
        device?: string;
        is_trusted_device?: boolean;
        is_new_device?: boolean;
    } | null;
    failure_reason?: string | null;
    created_at: Date;
}

interface SnakedAntiPhishingCode {
    id: string;
    user_id: string;
    phishing_code: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}




interface SecurityGrpcService {
    // Session methods
    createSession(data: {
        user_id: string;
        session_token?: string;
        refresh_token?: string;
        device_fingerprint?: string;
        ip_address: string;
        user_agent?: string;
        metadata_json?: string;
        expires_in_hours?: number;
    }): Observable<{ success: boolean, data: SnakedUserSession }>;
    // killSession(data: { user_id: string; session_id: string }): any;
    // killAllSessions(data: { user_id: string; except_session_id?: string }): any;
    getActiveSessions(data: { user_id: string }): Observable<{ success: boolean, data: SnakedUserSession[] }>;
    updateSession(data: { session_id: string, refresh_token?: string, expires_in_hours?: number }): Observable<{ success: boolean, data: SnakedUserSession }>;

    // 2FA methods
    findTwoFactorByUserId(data: { user_id: string }): Observable<{ success: boolean, data: SnakedUserTwoFactor }>;
    generateSecret(data: { user_id: string; email: string }): Observable<{ success: boolean, data: { otpauthUrl: string; backup_codes: string[]; secret: string } }>;
    generateQRCode(data: { otpauth_url: string }): Observable<{ success: boolean, data: { qr_code_data_url: string } }>;
    verifyToken(data: { user_id: string; token: string }): Observable<{ success: true, data: { is_valid: boolean } }>;
    verifyBackupCode(data: { user_id: string; code: string }): Observable<{ success: true, data: { is_valid: boolean } }>;
    // disable2FA(data: { user_id: string }): any;
    updateTwoFactor(data: {
        user_id: string; data: {
            isEnabled: boolean;
            lastVerifiedAt: Date;
        }
    }): Observable<{ success: true, data: SnakedUserTwoFactor }>;

    // Device methods
    registerDevice(
        user_id: string,
        deviceInfo: {
            fingerprint: string;
            browser?: string;
            os?: string;
            device?: string;
            screenResolution?: string;
            timezone?: string;
            language?: string;
            ipAddress?: string;
            userAgent?: string;
        },
        location?: {
            country?: string;
            city?: string;
        }
    ): Observable<{ success: boolean, data: SnakedTrustedDevice }>;
    isDeviceTrusted(data: { user_id: string; fingerprint: string }): Observable<{ success: boolean, data: { is_trusted: boolean } }>;


    logLoginAttempt(data: {
        user_id: string;
        ip_address: string;
        user_agent?: string;
        device_fingerprint?: string;
        success: boolean;
        failure_reason?: string;
        metadata_json?: string;
    }): Observable<{ success: boolean, data: SnakedLoginHistory }>;

}

@Injectable()
export class SecurityGrpcAdapter implements SecurityPort, OnModuleInit {

    private service: SecurityGrpcService;

    constructor(@Inject('SECURITY_PACKAGE') private client: ClientGrpc) { }

    onModuleInit() {
        this.service = this.client.getService<SecurityGrpcService>('SecurityService');
    }

    async createSession({ userId, sessionToken, refreshToken, deviceFingerprint, ipAddress, userAgent, metadata, expiresInHours }: { userId: string; sessionToken?: string; refreshToken?: string; deviceFingerprint?: string; ipAddress: string; userAgent?: string; metadata?: any; expiresInHours?: number; }): Promise<UserSession> {
        try {
            const response = await firstValueFrom(this.service.createSession({
                user_id: userId,
                ip_address: ipAddress,
                device_fingerprint: deviceFingerprint,
            }))
            if (!response.success || !response.data) {
                throw new Error('Create session failed');
            }

            return snakeToCamel<SnakedUserSession>(response.data);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async getActiveSessions(user_id: string): Promise<UserSession[]> {
        try {
            const response = await firstValueFrom(this.service.getActiveSessions({
                user_id: user_id,
            }))

            if (!response.success || !response.data) {
                throw new Error('Create session failed');
            }

            return snakeToCamel<SnakedUserSession[]>(response.data);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async updateSession(session_id: string, refresh_token?: string, expires_in_hours?: number): Promise<UserSession> {
        try {
            const response = await firstValueFrom(this.service.updateSession({
                session_id: session_id,
                refresh_token: refresh_token,
                expires_in_hours: expires_in_hours
            }));

            if (!response.success || !response.data) {
                throw new Error('Create session failed');
            }
            return snakeToCamel<SnakedUserSession>(response?.data);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async findTwoFactorByUserId(user_id: string): Promise<UserTwoFactor> {
        try {
            const response = await firstValueFrom(this.service.findTwoFactorByUserId({
                user_id: user_id,
            }));

            if (!response.success || !response.data) {
                throw new Error('Create session failed');
            }
            return snakeToCamel<SnakedUserTwoFactor>(response?.data);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async generateSecret(user_id: string, email: string): Promise<{ otpauthUrl: any; backupCodes: string[]; secret: any; }> {
        try {
            const response = await firstValueFrom(this.service.generateSecret({
                user_id: user_id,
                email: email,
            }));
            if (!response.success || !response.data) {
                throw new Error('Create session failed');
            }
            return snakeToCamel<{
                otpauthUrl: string;
                backup_codes: string[];
                secret: string;
            }>(response?.data);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async generateQRCode(otpauth_url: string): Promise<{ qrCodeDataUrl: string }> {
        try {
            const response = await firstValueFrom(this.service.generateQRCode({
                otpauth_url: otpauth_url,
            }));
            if (!response.success || !response.data) {
                throw new Error('Create session failed');
            }
            return snakeToCamel<{ qr_code_data_url: string; }>(response?.data);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async verifyToken(user_id: string, token: string): Promise<{ isValid: boolean }> {
        try {
            const response = await firstValueFrom(this.service.verifyToken({
                user_id: user_id,
                token: token,
            }));
            if (!response.success || !response.data) {
                throw new Error('Create session failed');
            }
            return snakeToCamel<{ is_valid: boolean }>(response?.data);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async verifyBackupCode(user_id: string, code: string): Promise<{ isValid: boolean }> {
        try {
            const response = await firstValueFrom(this.service.verifyBackupCode({
                user_id: user_id,
                code: code,
            }));
            if (!response.success || !response.data) {
                throw new Error('Create session failed');
            }
            return snakeToCamel<{ is_valid: boolean }>(response?.data);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async updateTwoFactor(user_id: string, isEnabled: boolean, lastVerifiedAt: Date): Promise<UserTwoFactor> {
        try {
            const response = await firstValueFrom(this.service.updateTwoFactor({
                user_id,
                data: {
                    isEnabled,
                    lastVerifiedAt,
                }
            }));

            if (!response.success || !response.data) {
                throw new Error('Create session failed');
            }
            return snakeToCamel<SnakedUserTwoFactor>(response?.data);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async registerDevice({ user_id, fingerprint, browser, os, device, screenResolution, timezone, language, ipAddress, userAgent, locationCountry, locationCity }: { user_id: string; fingerprint: string; browser?: string; os?: string; device?: string; screenResolution?: string; timezone?: string; language?: string; ipAddress?: string; userAgent?: string; locationCountry?: string; locationCity?: string; }): Promise<TrustedDevice> {
        try {
            const response = await firstValueFrom(this.service.registerDevice(
                user_id,
                {
                    fingerprint,
                    browser,
                    os,
                    device,
                    screenResolution,
                    timezone,
                    language,
                    ipAddress,
                    userAgent,
                },
                {
                    country: locationCountry,
                    city: locationCity,
                }
            ));
            if (!response.success || !response.data) {
                throw new Error('Create session failed');
            }
            return snakeToCamel<SnakedTrustedDevice>(response?.data);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async isDeviceTrusted(user_id: string, fingerprint: string): Promise<{ isTrusted: boolean }> {
        try {
            const response = await firstValueFrom(this.service.isDeviceTrusted({
                user_id,
                fingerprint,
            }));

            if (!response.success || !response.data) {
                throw new Error('Create session failed');
            }
            return snakeToCamel<{
                is_trusted: boolean;
            }>(response?.data);

        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async logLoginAttempt({ user_id, ip_address, success, user_agent, device_fingerprint, failure_reason, metadata_json }: { user_id: string; ip_address: string; success: boolean; user_agent?: string; device_fingerprint?: string; failure_reason?: string; metadata_json?: string; }): Promise<LoginHistory> {
        try {
            const response = await firstValueFrom(this.service.logLoginAttempt({
                user_id,
                ip_address,
                success,
                user_agent,
                device_fingerprint,
                failure_reason,
                metadata_json,
            }));
            if (!response.success || !response.data) {
                throw new Error('Create session failed');
            }
            return snakeToCamel<SnakedLoginHistory>(response?.data);

        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }
}