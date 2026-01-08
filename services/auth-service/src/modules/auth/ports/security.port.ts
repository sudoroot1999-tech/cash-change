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

    // killSession(user_id: string, session_id: string): any;
    // killAllSessions(user_id: string, except_session_id?: string): any;
    getActiveSessions(user_id: string): Promise<UserSession[]>;
    updateSession(session_id: string, refresh_token?: string, expires_in_hours?: number): Promise<UserSession>;

    // 2FA methods
    findTwoFactorByUserId(user_id: string): Promise<UserTwoFactor>;
    generateSecret(user_id: string, email: string): Promise<{
        otpauthUrl: any;
        backupCodes: string[];
        secret: any;
    }>;
    generateQRCode(otpauth_url: string): Promise<{ qrCodeDataUrl: string }>;
    verifyToken(user_id: string, token: string): Promise<{ isValid: boolean }>;
    verifyBackupCode(user_id: string, code: string): Promise<{ isValid: boolean }>;
    // disable2FA(user_id: string): any;
    updateTwoFactor(user_id: string, isEnabled: boolean, lastVerifiedAt: Date): Promise<UserTwoFactor>;

    // Device methods
    registerDevice({
        user_id,
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
        user_id: string,
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

    isDeviceTrusted(user_id: string, fingerprint: string): Promise<{ isTrusted: boolean }>;

    logLoginAttempt({
        user_id,
        ip_address,
        success,
        user_agent,
        device_fingerprint,
        failure_reason,
        metadata_json
    }: {
        user_id: string,
        ip_address: string,
        success: boolean,
        user_agent?: string,
        device_fingerprint?: string,
        failure_reason?: string,
        metadata_json?: string
    }): Promise<LoginHistory>;

}
