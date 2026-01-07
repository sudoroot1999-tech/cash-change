import { AntiPhishingCode, LoginHistory } from "@exchange/common";

export interface SecurityPort {
    // Session methods

    // killSession(user_id: string, session_id: string): any;
    killAllSessions(user_id: string, except_session_id?: string): Promise<string>;

    // 2FA methods

    generateRandomCode(): Promise<string>;
    setAntiPhishingCode({
        user_id,
        phishing_code,
        ip_address
    }: {
        user_id: string,
        phishing_code: string,
        ip_address?: string
    }): Promise<AntiPhishingCode>;

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
