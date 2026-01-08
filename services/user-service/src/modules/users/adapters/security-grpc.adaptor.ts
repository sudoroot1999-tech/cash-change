import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { SecurityPort } from "../ports/security.ports";
import { AntiPhishingCode, LoginHistory, snakeToCamel } from "@exchange/common";
import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom, Observable } from "rxjs";

interface SnakedAntiPhishingCode {
    id: string;
    user_id: string;
    phishing_code: string;
    is_active: boolean;
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
    killAllSessions(data: { user_id: string; except_session_id?: string }): Observable<{ success: boolean, data: string }>;

    // Anti-Phishing methods
    setAntiPhishingCode(data: { user_id: string; phishing_code: string; ip_address?: string }): Observable<{ success: boolean, data: SnakedAntiPhishingCode }>;
    generateRandomCode(data: {}): Observable<{ success: boolean, data: { code: string } }>;

    logLoginAttempt(data: {
        user_id: string;
        ip_address?: string;
        user_agent?: string;
        device_fingerprint?: string;
        success: boolean;
        failure_reason?: string;
        metadata_json?: string;
        status?: string;
    }): Observable<{ success: boolean, data: SnakedLoginHistory }>;
}

@Injectable()
export class SecurityGrpcAdapter implements SecurityPort, OnModuleInit {

    private service: SecurityGrpcService;

    constructor(@Inject('SECURITY_PACKAGE') private client: ClientGrpc) { }

    onModuleInit() {
        this.service = this.client.getService<SecurityGrpcService>('SecurityService');
    }


    async killAllSessions(user_id: string, except_session_id?: string): Promise<string> {
        try {
            const response = await firstValueFrom(this.service.killAllSessions({ user_id, except_session_id }));
            if (!response.success || !response.data) {
                throw new Error('Create session failed');
            }
            return response?.data
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async generateRandomCode(): Promise<{ code: string }> {
        try {
            const response = await firstValueFrom(this.service.generateRandomCode({}));
            if (!response.success || !response.data) {
                throw new Error('Create session failed');
            }
            return response?.data
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async setAntiPhishingCode({ user_id, phishing_code, ip_address }: { user_id: string; phishing_code: string; ip_address?: string; }): Promise<AntiPhishingCode> {
        try {
            const response = await firstValueFrom(this.service.setAntiPhishingCode({ user_id, phishing_code, ip_address }));
            if (!response.success || !response.data) {
                throw new Error('Create session failed');
            }
            return snakeToCamel<SnakedAntiPhishingCode>(response?.data)
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
            return snakeToCamel<SnakedLoginHistory>(response?.data)
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

}