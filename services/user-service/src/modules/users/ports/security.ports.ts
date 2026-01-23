import { AntiPhishingCode, LoginHistory } from "@exchange/common";

export interface SecurityPort {
    // Session methods

    // killSession(user_id: string, session_id: string): any;
    killAllSessions(userId: string, exceptSessionId?: string): Promise<string>;

    // 2FA methods

    generateRandomCode(): Promise<{ code: string }>;
    setAntiPhishingCode({
        userId,
        phishingCode,
        ipAddress
    }: {
        userId: string,
        phishingCode: string,
        ipAddress?: string
    }): Promise<AntiPhishingCode>;

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
