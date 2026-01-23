import { LoginHistory, TrustedDevice, UserSession, UserTwoFactor } from "@exchange/common";

export interface SecurityPort {
    // Session methods
    createSession({
        userId,
        sessionToken,
        refreshToken,
        deviceFingerprint,
        ipAddress,
        userAgent,
        metadata,
        expiresInHours
    }: {
        userId: string;
        sessionToken?: string;
        refreshToken?: string;
        deviceFingerprint?: string;
        ipAddress: string;
        userAgent?: string;
        metadata?: any;
        expiresInHours?: number;
    }): Promise<UserSession>;

    killSession(userId: string, sessionId: string): Promise<string>;
    // killAllSessions(user_id: string, except_session_id?: string): any;
    getActiveSessions(userId: string): Promise<UserSession[]>;
    updateSession(sessionId: string, refreshToken?: string, expiresInHours?: number): Promise<UserSession>;

    // 2FA methods
    findTwoFactorByUserId(userId: string): Promise<UserTwoFactor>;
    generateSecret(userId: string, email: string): Promise<{
        otpauthUrl: any;
        backupCodes: string[];
        secret: any;
    }>;
    generateQRCode(otpauthUrl: string): Promise<{ qrCodeDataUrl: string }>;
    verifyToken(userId: string, token: string): Promise<{ isValid: boolean }>;
    verifyBackupCode(userId: string, code: string): Promise<{ isValid: boolean }>;
    // disable2FA(user_id: string): any;
    updateTwoFactor(userId: string, isEnabled: boolean, lastVerifiedAt: Date): Promise<UserTwoFactor>;

    // Device methods
    registerDevice({
        userId,
        fingerprint,
        browser,
        os,
        device,
        screenResolution,
        timezone,
        language,
        ipAddress,
        userAgent,
        locationCountry,
        locationCity
    }: {
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
    }): Promise<TrustedDevice>;

    logLoginAttempt({
        userId,
        ipAddress,
        success,
        userAgent,
        deviceFingerprint,
        failureReason,
        metadataJson
    }: {
        userId: string,
        ipAddress: string,
        success: boolean,
        userAgent?: string,
        deviceFingerprint?: string,
        failureReason?: string,
        metadataJson?: string
    }): Promise<LoginHistory>;

}
