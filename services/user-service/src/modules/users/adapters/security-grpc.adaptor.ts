import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { SecurityPort } from "../ports/security.ports";
import { AntiPhishingCode, LoginHistory, snakeToCamel } from "@exchange/common";
import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom, Observable } from "rxjs";

interface SecurityGrpcService {
    // Session methods
    killAllSessions(data: { user_id: string; except_session_id?: string }): Observable<{ success: boolean, data: string }>;

    // Anti-Phishing methods
    setAntiPhishingCode(data: { user_id: string; phishing_code: string; ip_address?: string }): Observable<{ success: boolean, data: AntiPhishingCode }>;
    generateRandomCode(data: {}): Observable<{ success: boolean, data: string }>;

    logLoginAttempt(data: {
        user_id: string;
        ip_address?: string;
        user_agent?: string;
        device_fingerprint?: string;
        success: boolean;
        failure_reason?: string;
        metadata_json?: string;
        status?: string;
    }): Observable<LoginHistory>;
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
            const result = await firstValueFrom(this.service.killAllSessions({ user_id, except_session_id }));
            const { success, data } = snakeToCamel(result);
            if (success) {
                return data;
            }
            throw new Error('Something Wrong');
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async generateRandomCode(): Promise<string> {
        try {
            const result = await firstValueFrom(this.service.generateRandomCode({}));
            const { success, data } = snakeToCamel(result);
            if (success) {
                return data;
            }
            throw new Error('Something Wrong');
        }
        catch (error) {
            throw new Error('Something Wrong');
        }
    }

    async setAntiPhishingCode({ user_id, phishing_code, ip_address }: { user_id: string; phishing_code: string; ip_address?: string; }): Promise<AntiPhishingCode> {
        try {
            const result = await firstValueFrom(this.service.setAntiPhishingCode({ user_id, phishing_code, ip_address }));
            const { success, data } = snakeToCamel(result);
            if (success) {
                return data;
            }
            throw new Error('Something Wrong');
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