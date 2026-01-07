import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { SecurityPort } from "../ports/security.port";
import { UserSession, UserTwoFactor, TrustedDevice, LoginHistory, snakeToCamel } from "libs/common/dist";
import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom, Observable } from "rxjs";

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
    }): Observable<UserSession>;
    // killSession(data: { user_id: string; session_id: string }): any;
    // killAllSessions(data: { user_id: string; except_session_id?: string }): any;
    getActiveSessions(data: { user_id: string }): Observable<UserSession[]>;
    updateSession(data: { session_id: string, refresh_token?: string, expires_in_hours?: number }): Observable<UserSession>;

    // 2FA methods
    findTwoFactorByUserId(data: { user_id: string }): Observable<UserTwoFactor>;
    generateSecret(data: { user_id: string; email: string }): Observable<{ otpauthUrl: string; backupCodes: string[]; secret: string }>;
    generateQRCode(data: { otpauth_url: string }): Observable<string>;
    verifyToken(data: { user_id: string; token: string }): Observable<boolean>;
    verifyBackupCode(data: { user_id: string; code: string }): Observable<boolean>;
    // disable2FA(data: { user_id: string }): any;
    updateTwoFactor(data: {
        user_id: string; data: {
            isEnabled: boolean;
            lastVerifiedAt: Date;
        }
    }): Observable<UserTwoFactor>;

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
    ): Observable<TrustedDevice>;
    isDeviceTrusted(data: { user_id: string; fingerprint: string }): Observable<{ is_trusted: boolean }>;
    generateFingerprint(data: {
        userAgent: string;
        acceptLanguage?: string;
        acceptEncoding?: string;
        ipAddress: string;
    }): Observable<{ fingerprint: string }>;


    logLoginAttempt(data: {
        user_id: string;
        ip_address: string;
        user_agent?: string;
        device_fingerprint?: string;
        success: boolean;
        failure_reason?: string;
        metadata_json?: string;
    }): Observable<LoginHistory>;

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
            const session = await firstValueFrom(this.service.createSession({
                user_id: userId,
                ip_address: ipAddress,
                device_fingerprint: deviceFingerprint,
            }))
            return snakeToCamel(session);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async getActiveSessions(user_id: string): Promise<UserSession[]> {
        try {
            const sessions = await firstValueFrom(this.service.getActiveSessions({
                user_id: user_id,
            }))

            if (!sessions) {
                throw new Error('Invalid refresh token');
            }
            return snakeToCamel(sessions);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async updateSession(session_id: string, refresh_token?: string, expires_in_hours?: number): Promise<UserSession> {
        try {
            const session = await firstValueFrom(this.service.updateSession({
                session_id: session_id,
                refresh_token: refresh_token,
                expires_in_hours: expires_in_hours
            }));
            return snakeToCamel(session);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async findTwoFactorByUserId(user_id: string): Promise<UserTwoFactor> {
        try {
            const twoFactor = await firstValueFrom(this.service.findTwoFactorByUserId({
                user_id: user_id,
            }));
            return snakeToCamel(twoFactor);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async generateSecret(user_id: string, email: string): Promise<{ otpauthUrl: any; backupCodes: string[]; secret: any; }> {
        try {
            const secret = await firstValueFrom(this.service.generateSecret({
                user_id: user_id,
                email: email,
            }));
            return snakeToCamel(secret);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async generateQRCode(otpauth_url: string): Promise<string> {
        try {
            const qrCode = await firstValueFrom(this.service.generateQRCode({
                otpauth_url: otpauth_url,
            }));
            return qrCode;
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async verifyToken(user_id: string, token: string): Promise<boolean> {
        try {
            const result = await firstValueFrom(this.service.verifyToken({
                user_id: user_id,
                token: token,
            }));
            return result;
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async verifyBackupCode(user_id: string, code: string): Promise<boolean> {
        try {
            const result = await firstValueFrom(this.service.verifyBackupCode({
                user_id: user_id,
                code: code,
            }));
            return result;
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async updateTwoFactor(user_id: string, isEnabled: boolean, lastVerifiedAt: Date): Promise<UserTwoFactor> {
        try {
            const result = await firstValueFrom(this.service.updateTwoFactor({
                user_id,
                data: {
                    isEnabled,
                    lastVerifiedAt,
                }
            }));
            return snakeToCamel(result);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async registerDevice({ user_id, fingerprint, browser, os, device, screenResolution, timezone, language, ipAddress, userAgent, locationCountry, locationCity }: { user_id: string; fingerprint: string; browser?: string; os?: string; device?: string; screenResolution?: string; timezone?: string; language?: string; ipAddress?: string; userAgent?: string; locationCountry?: string; locationCity?: string; }): Promise<TrustedDevice> {
        try {
            const result = await firstValueFrom(this.service.registerDevice(
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
            return snakeToCamel(result);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async isDeviceTrusted(user_id: string, fingerprint: string): Promise<boolean> {
        try {
            const result = await firstValueFrom(this.service.isDeviceTrusted({
                user_id,
                fingerprint,
            }));

            const mappedResult = snakeToCamel(result);
            if (mappedResult?.is_trusted) {
                return true;
            }
            return false;
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async logLoginAttempt({ user_id, ip_address, success, user_agent, device_fingerprint, failure_reason, metadata_json }: { user_id: string; ip_address: string; success: boolean; user_agent?: string; device_fingerprint?: string; failure_reason?: string; metadata_json?: string; }): Promise<LoginHistory> {
        try {
            const result = await firstValueFrom(this.service.logLoginAttempt({
                user_id,
                ip_address,
                success,
                user_agent,
                device_fingerprint,
                failure_reason,
                metadata_json,
            }));
            return snakeToCamel(result);
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }
}