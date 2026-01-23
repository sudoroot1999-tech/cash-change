import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { SecurityPort } from "../ports/security.port";
import { UserSession, UserTwoFactor, TrustedDevice, LoginHistory, snakeToCamel, ApiResponse, camelToSnake } from "@exchange/common";
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
    killSession(data: { user_id: string; session_id: string }): Observable<{ success: boolean, data: string }>;
    // killAllSessions(data: { user_id: string; except_session_id?: string }): any;
    getActiveSessions(data: { user_id: string }): Observable<{ success: boolean, data: SnakedUserSession[] }>;
    updateSession(data: { session_id: string, refresh_token?: string, expires_in_hours?: number }): Observable<{ success: boolean, data: SnakedUserSession }>;

    // 2FA methods
    findTwoFactorByUserId(data: { user_id: string }): Observable<{ success: boolean, data: SnakedUserTwoFactor }>;
    generateSecret(data: { user_id: string; email: string }): Observable<{ success: boolean, data: { otpauth_url: string; backup_codes: string[]; secret: string } }>;
    generateQRCode(data: { otpauth_url: string }): Observable<{ success: boolean, data: { qr_code_data_url: string } }>;
    verifyToken(data: { user_id: string; token: string }): Observable<{ success: true, data: { is_valid: boolean } }>;
    verifyBackupCode(data: { user_id: string; code: string }): Observable<{ success: true, data: { is_valid: boolean } }>;
    // disable2FA(data: { user_id: string }): any;
    updateTwoFactor(data: {
        user_id: string; data: {
            is_enabled: boolean;
            last_verified_at: Date;
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
            screen_resolution?: string;
            timezone?: string;
            language?: string;
            ip_address?: string;
            user_agent?: string;
        },
        location?: {
            country?: string;
            city?: string;
        }
    ): Observable<{ success: boolean, data: SnakedTrustedDevice }>;

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
                user_agent: userAgent
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

    async getActiveSessions(userId: string): Promise<UserSession[]> {
        try {
            const response = await firstValueFrom(this.service.getActiveSessions({
                user_id: userId,
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

    async updateSession(sessionId: string, refreshToken?: string, expiresInHours?: number): Promise<UserSession> {
        try {
            const response = await firstValueFrom(this.service.updateSession({
                session_id: sessionId,
                refresh_token: refreshToken,
                expires_in_hours: expiresInHours
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

    async findTwoFactorByUserId(userId: string): Promise<UserTwoFactor> {
        try {
            const response = await firstValueFrom(this.service.findTwoFactorByUserId({
                user_id: userId,
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

    async generateSecret(userId: string, email: string): Promise<{ otpauthUrl: any; backupCodes: string[]; secret: any; }> {
        try {
            const response = await firstValueFrom(this.service.generateSecret({
                user_id: userId,
                email: email,
            }));
            if (!response.success || !response.data) {
                throw new Error('Create session failed');
            }
            return snakeToCamel<{
                otpauth_url: string;
                backup_codes: string[];
                secret: string;
            }>(response?.data);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async generateQRCode(otpauthUrl: string): Promise<{ qrCodeDataUrl: string }> {
        try {
            const response = await firstValueFrom(this.service.generateQRCode({
                otpauth_url: otpauthUrl,
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

    async verifyToken(userId: string, token: string): Promise<{ isValid: boolean }> {
        try {
            const response = await firstValueFrom(this.service.verifyToken({
                user_id: userId,
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

    async verifyBackupCode(userId: string, code: string): Promise<{ isValid: boolean }> {
        try {
            const response = await firstValueFrom(this.service.verifyBackupCode({
                user_id: userId,
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

    async updateTwoFactor(userId: string, isEnabled: boolean, lastVerifiedAt: Date): Promise<UserTwoFactor> {
        try {
            const response = await firstValueFrom(this.service.updateTwoFactor({
                user_id: userId,
                data: {
                    is_enabled: isEnabled,
                    last_verified_at: lastVerifiedAt,
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


    async killSession(userId: string, sessionId: string): Promise<string> {
        try {
            const response = await firstValueFrom(this.service.killSession({
                user_id: userId,
                session_id: sessionId
            }));

            if (!response.success || !response.data) {
                throw new Error('Create session failed');
            }
            return (response?.data);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async registerDevice(data: {
        userId: string,
        fingerprint: string,
        browser?: string,
        os?: string,
        device?: string,
        screenResolution?: string,
        timezone?: string,
        language?: string,
        ipAddress?: string,
        userAgent?: string,
        locationCountry?: string,
        locationCity?: string
    }): Promise<TrustedDevice> {
        const transformedData = camelToSnake<{
            userId: string,
            fingerprint: string,
            browser?: string,
            os?: string,
            device?: string,
            screenResolution?: string,
            timezone?: string,
            language?: string,
            ipAddress?: string,
            userAgent?: string,
            locationCountry?: string,
            locationCity?: string
        }>(data);
        try {
            const response = await firstValueFrom(this.service.registerDevice(
                transformedData.user_id,
                {
                    fingerprint: transformedData.fingerprint,
                    browser: transformedData.browser,
                    os: transformedData.os,
                    device: transformedData.device,
                    screen_resolution: transformedData.screen_resolution,
                    timezone: transformedData.timezone,
                    language: transformedData.language,
                    ip_address: transformedData.ip_address,
                    user_agent: transformedData.user_agent,
                },
                {
                    country: transformedData.location_country,
                    city: transformedData.location_city,
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

    async logLoginAttempt(data: {
        userId: string,
        ipAddress: string,
        success: boolean,
        userAgent?: string,
        deviceFingerprint?: string,
        failureReason?: string,
        metadataJson?: string
    }): Promise<LoginHistory> {
        const transformedData = camelToSnake<{
            userId: string,
            ipAddress: string,
            success: boolean,
            userAgent?: string,
            deviceFingerprint?: string,
            failureReason?: string,
            metadataJson?: string
        }>(data);
        try {
            const response = await firstValueFrom(this.service.logLoginAttempt({
                user_id: transformedData.user_id,
                ip_address: transformedData.ip_address,
                success: transformedData.success,
                user_agent: transformedData.user_agent,
                device_fingerprint: transformedData.device_fingerprint,
                failure_reason: transformedData.failure_reason,
                metadata_json: transformedData.metadata_json,
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