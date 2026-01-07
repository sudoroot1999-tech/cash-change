import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
    ApiKeyService,
    TransactionMonitoringService,
    LoginSecurityService,
    TwoFactorService,
    DeviceFingerprintService,
    AntiPhishingService,
    UpdateTwoFactorStatusDto,
} from '../services';
import { UserTwoFactor } from '../entities/user-two-factor.entity';
import { UserSession } from '../entities';

interface ValidateApiKeyRequest {
    api_key: string;
    api_secret: string;
}

interface ValidateApiKeyResponse {
    is_valid: boolean;
    user_id?: string;
    permissions?: string[];
}

interface CheckRiskScoreRequest {
    user_id: string;
    action: string;
    ip_address: string;
}

interface CheckRiskScoreResponse {
    score: number;
    risk_level: string;
    check_passed: boolean;
}

// Session Interfaces
interface CreateSessionRequest {
    user_id: string;
    session_token?: string;
    refresh_token?: string;
    device_fingerprint?: string;
    ip_address: string;
    user_agent?: string;
    metadata_json?: string;
    expires_in_hours?: number;
}


interface UpdateSessionRequest {
    session_id:string,
    refresh_token?:string,
    expires_in_hours?:number
}

interface SessionData {
    id: string;
    user_id: string;
    session_token: string;
    is_active: boolean;
    expires_at: string;
    last_activity_at: string;
    device_fingerprint?: string;
    ip_address: string;
    user_agent?: string;
}

interface CreateSessionResponse {
    session: SessionData;
}

interface UpdateSessionResponse {
    session: SessionData;
}


interface ValidateSessionRequest {
    session_token: string;
}

interface ValidateSessionResponse {
    is_valid: boolean;
    session?: SessionData;
}

interface KillSessionRequest {
    user_id: string;
    session_id: string;
}

interface KillSessionResponse {
    success: boolean;
}

interface KillAllSessionsRequest {
    user_id: string;
    except_session_id?: string;
}

interface KillAllSessionsResponse {
    success: boolean;
}

// 2FA Interfaces
interface GenerateSecretRequest {
    user_id: string;
    email: string;
}

interface GenerateSecretResponse {
    otpauth_url: string;
}

interface GenerateQRCodeRequest {
    otpauth_url: string;
}

interface GenerateQRCodeResponse {
    qr_code_data_url: string;
}

interface VerifyAndEnableRequest {
    user_id: string;
    token: string;
}

interface VerifyAndEnableResponse {
    success: boolean;
}

interface VerifyTokenRequest {
    user_id: string;
    token: string;
}

interface VerifyTokenResponse {
    is_valid: boolean;
}

interface VerifyBackupCodeRequest {
    user_id: string;
    code: string;
}

interface VerifyBackupCodeResponse {
    is_valid: boolean;
}

interface Disable2FARequest {
    user_id: string;
}

interface Disable2FAResponse {
    success: boolean;
}

// Device Interfaces
interface DeviceInfo {
    fingerprint: string;
    browser?: string;
    os?: string;
    device?: string;
    screen_resolution?: string;
    timezone?: string;
    language?: string;
    ip_address?: string;
    user_agent?: string;
}

interface DeviceLocation {
    country?: string;
    city?: string;
}

interface RegisterDeviceRequest {
    user_id: string;
    device_info: DeviceInfo;
    location?: DeviceLocation;
}

interface TrustedDeviceData {
    id: string;
    user_id: string;
    fingerprint: string;
    is_trusted: boolean;
    last_used_at?: string;
    ip_address?: string;
    first_seen_at: string;
    device_name?: string;
    browser?: string;
    os?: string;
}

interface RegisterDeviceResponse {
    device: TrustedDeviceData;
}

interface IsDeviceTrustedRequest {
    user_id: string;
    fingerprint: string;
}

interface IsDeviceTrustedResponse {
    is_trusted: boolean;
}

interface TrustDeviceRequest {
    user_id: string;
    device_id: string;
}

interface TrustDeviceResponse {
    device: TrustedDeviceData;
}

interface RevokeDeviceTrustRequest {
    user_id: string;
    device_id: string;
}

interface RevokeDeviceTrustResponse {
    success: boolean;
}

interface GetUserDevicesRequest {
    user_id: string;
}

interface GetUserDevicesResponse {
    devices: TrustedDeviceData[];
}

interface IsNewDeviceRequest {
    user_id: string;
    fingerprint: string;
}

interface IsNewDeviceResponse {
    is_new: boolean;
}

interface GenerateFingerprintRequest {
    user_agent: string;
    accept_language?: string;
    accept_encoding?: string;
    ip_address: string;
}

interface GenerateFingerprintResponse {
    fingerprint: string;
}

interface DeleteDeviceRequest {
    user_id: string;
    device_id: string;
}

interface DeleteDeviceResponse {
    success: boolean;
}

// Anti-Phishing Interfaces
interface SetAntiPhishingCodeRequest {
    user_id: string;
    phishing_code: string;
    ip_address?: string;
}

interface AntiPhishingData {
    user_id: string;
    phishing_code: string;
    is_active: boolean;
}

interface SetAntiPhishingCodeResponse {
    code: AntiPhishingData;
}

interface GetAntiPhishingCodeRequest {
    user_id: string;
}

interface GetAntiPhishingCodeResponse {
    code?: AntiPhishingData;
}

interface GetCodeForEmailRequest {
    user_id: string;
}

interface GetCodeForEmailResponse {
    code: string;
}

interface VerifyAntiPhishingCodeRequest {
    user_id: string;
    code: string;
}

interface VerifyAntiPhishingCodeResponse {
    is_valid: boolean;
}

interface DeactivateCodeRequest {
    user_id: string;
}

interface DeactivateCodeResponse {
    success: boolean;
}

interface GenerateRandomCodeRequest { }

interface GenerateRandomCodeResponse {
    code: string;
}

interface LogLoginAttemptRequest {
    user_id: string;
    ip_address: string;
    user_agent?: string;
    device_fingerprint?: string;
    success: boolean;
    failure_reason?: string;
    metadata_json?: string;
}

interface LogLoginAttemptResponse {
    success: boolean;
}

interface FindTwoFactorByUserIdRequest {
    user_id: string;
}

interface FindTwoFactorByUserIdResponse {
    two_factor?: UserTwoFactor;
}

interface UpdateTwoFactorRequest {
    user_id: string;
    data: UpdateTwoFactorStatusDto;
}

interface UpdateTwoFactorResponse {
    two_factor: UserTwoFactor;
}

interface GetActiveSessionRequest {
    user_id: string;
}

interface GetActiveSessionResponse {
    sessions: UserSession[];
}

@Controller()
export class SecurityGrpcController {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly transactionMonitoringService: TransactionMonitoringService,
        private readonly loginSecurityService: LoginSecurityService,
        private readonly twoFactorService: TwoFactorService,
        private readonly deviceFingerprintService: DeviceFingerprintService,
        private readonly antiPhishingService: AntiPhishingService,
    ) { }

    @GrpcMethod('SecurityService', 'ValidateApiKey')
    async validateApiKey(data: ValidateApiKeyRequest): Promise<ValidateApiKeyResponse> {
        const { api_key, api_secret } = data;
        const validKey = await this.apiKeyService.validateApiKey(api_key, api_secret);
        if (!validKey) {
            return { is_valid: false };
        }
        return {
            is_valid: true,
            user_id: validKey.userId,
            permissions: validKey.permissions,
        };
    }

    @GrpcMethod('SecurityService', 'CheckRiskScore')
    async checkRiskScore(data: CheckRiskScoreRequest): Promise<CheckRiskScoreResponse> {
        const { user_id, action, ip_address } = data; // Unused but part of interface
        // Implementation remains same as before, simplified for this rewrite to use the service
        const riskScore = await this.transactionMonitoringService.calculateRiskScore(user_id);
        const passed = riskScore.score < 80;
        return {
            score: riskScore.score,
            risk_level: riskScore.riskLevel,
            check_passed: passed,
        };
    }

    // Session Methods
    @GrpcMethod('SecurityService', 'CreateSession')
    async createSession(data: CreateSessionRequest): Promise<CreateSessionResponse> {
        const session = await this.loginSecurityService.createSession({
            userId: data.user_id,
            sessionToken: data.session_token,
            refreshToken: data.refresh_token,
            deviceFingerprint: data.device_fingerprint,
            ipAddress: data.ip_address,
            userAgent: data.user_agent,
            metadata: data.metadata_json ? JSON.parse(data.metadata_json) : undefined,
            expiresInHours: data.expires_in_hours,
        });

        return {
            session: {
                id: session.id,
                user_id: session.userId,
                session_token: session.sessionToken,
                is_active: session.isActive,
                expires_at: session.expiresAt.toISOString(),
                last_activity_at: session.lastActivityAt.toISOString(),
                device_fingerprint: session.deviceFingerprint,
                ip_address: session.ipAddress,
                user_agent: session.userAgent,
            },
        };
    }

    @GrpcMethod('SecurityService', 'UpdateSession')
    async updateSession(data: UpdateSessionRequest): Promise<UpdateSessionResponse> {
        const session = await this.loginSecurityService.updateSession({
            sessionId: data.session_id,
            refreshToken: data.refresh_token,
            expiresInHours: data.expires_in_hours,
        });

        return {
            session: {
                id: session.id,
                user_id: session.userId,
                session_token: session.sessionToken,
                is_active: session.isActive,
                expires_at: session.expiresAt.toISOString(),
                last_activity_at: session.lastActivityAt.toISOString(),
                device_fingerprint: session.deviceFingerprint,
                ip_address: session.ipAddress,
                user_agent: session.userAgent,
            },
        };
    }

    @GrpcMethod('SecurityService','GetActiveSession')
    async getActiveSession(data:GetActiveSessionRequest):Promise<GetActiveSessionResponse>{
        const sessions = await this.loginSecurityService.getActiveSessions(data.user_id);   
        return {sessions}
    }

    @GrpcMethod('SecurityService', 'ValidateSession')
    async validateSession(data: ValidateSessionRequest): Promise<ValidateSessionResponse> {
        const session = await this.loginSecurityService.validateSession(data.session_token);
        if (!session) {
            return { is_valid: false };
        }
        return {
            is_valid: true,
            session: {
                id: session.id,
                user_id: session.userId,
                session_token: session.sessionToken,
                is_active: session.isActive,
                expires_at: session.expiresAt.toISOString(),
                last_activity_at: session.lastActivityAt.toISOString(),
                device_fingerprint: session.deviceFingerprint,
                ip_address: session.ipAddress,
                user_agent: session.userAgent,
            },
        };
    }

    @GrpcMethod('SecurityService', 'KillSession')
    async killSession(data: KillSessionRequest): Promise<KillSessionResponse> {
        await this.loginSecurityService.killSession(data.user_id, data.session_id);
        return { success: true };
    }

    @GrpcMethod('SecurityService', 'KillAllSessions')
    async killAllSessions(data: KillAllSessionsRequest): Promise<KillAllSessionsResponse> {
        await this.loginSecurityService.killAllSessions(data.user_id, data.except_session_id);
        return { success: true };
    }

    @GrpcMethod('SecurityService', 'FindTwoFactorByUserId')
    async findTwoFactorByUserId(data: FindTwoFactorByUserIdRequest): Promise<FindTwoFactorByUserIdResponse> {
        const twoFactor = await this.twoFactorService.findByUserId(data.user_id);
        return { two_factor: twoFactor };
    }

    // 2FA Methods
    @GrpcMethod('SecurityService', 'GenerateSecret')
    async generateSecret(data: GenerateSecretRequest): Promise<GenerateSecretResponse> {
        const result = await this.twoFactorService.generateSecret(data.user_id, data.email);
        return { otpauth_url: result.otpauthUrl };
    }

    @GrpcMethod('SecurityService', 'UpdateTwoFactor')
    async updateTwoFactor(data: UpdateTwoFactorRequest): Promise<UpdateTwoFactorResponse> {
        const twoFactor = await this.twoFactorService.updateTwoFactor(data.user_id, data.data);
        return { two_factor: twoFactor };
    }

    @GrpcMethod('SecurityService', 'GenerateQRCode')
    async generateQRCode(data: GenerateQRCodeRequest): Promise<GenerateQRCodeResponse> {
        const qrCode = await this.twoFactorService.generateQRCode(data.otpauth_url);
        return { qr_code_data_url: qrCode };
    }

    @GrpcMethod('SecurityService', 'VerifyAndEnable')
    async verifyAndEnable(data: VerifyAndEnableRequest): Promise<VerifyAndEnableResponse> {
        const success = await this.twoFactorService.verifyAndEnable(data.user_id, data.token);
        return { success };
    }

    @GrpcMethod('SecurityService', 'VerifyToken')
    async verifyToken(data: VerifyTokenRequest): Promise<VerifyTokenResponse> {
        const isValid = await this.twoFactorService.verifyToken(data.user_id, data.token);
        return { is_valid: isValid };
    }

    @GrpcMethod('SecurityService', 'VerifyBackupCode')
    async verifyBackupCode(data: VerifyBackupCodeRequest): Promise<VerifyBackupCodeResponse> {
        const isValid = await this.twoFactorService.verifyBackupCode(data.user_id, data.code);
        return { is_valid: isValid };
    }

    @GrpcMethod('SecurityService', 'Disable2FA')
    async disable2FA(data: Disable2FARequest): Promise<Disable2FAResponse> {
        await this.twoFactorService.disable(data.user_id);
        return { success: true };
    }

    // Device Methods
    @GrpcMethod('SecurityService', 'RegisterDevice')
    async registerDevice(data: RegisterDeviceRequest): Promise<RegisterDeviceResponse> {
        const device = await this.deviceFingerprintService.registerDevice(
            data.user_id,
            {
                fingerprint: data.device_info.fingerprint,
                browser: data.device_info.browser,
                os: data.device_info.os,
                device: data.device_info.device,
                screenResolution: data.device_info.screen_resolution,
                timezone: data.device_info.timezone,
                language: data.device_info.language,
                ipAddress: data.device_info.ip_address,
                userAgent: data.device_info.user_agent,
            },
            {
                country: data.location?.country,
                city: data.location?.city,
            },
        );
        return {
            device: {
                id: device.id,
                user_id: device.userId,
                fingerprint: device.fingerprint,
                is_trusted: device.isTrusted,
                last_used_at: device.lastUsedAt?.toISOString(),
                ip_address: device.ipAddress,
                first_seen_at: device.createdAt.toISOString(),
                device_name: device.deviceName,
                browser: device.metadata?.browser,
                os: device.metadata?.os,
            },
        };
    }

    @GrpcMethod('SecurityService', 'IsDeviceTrusted')
    async isDeviceTrusted(data: IsDeviceTrustedRequest): Promise<IsDeviceTrustedResponse> {
        const isTrusted = await this.deviceFingerprintService.isDeviceTrusted(data.user_id, data.fingerprint);
        return { is_trusted: isTrusted };
    }

    @GrpcMethod('SecurityService', 'TrustDevice')
    async trustDevice(data: TrustDeviceRequest): Promise<TrustDeviceResponse> {
        const device = await this.deviceFingerprintService.trustDevice(data.user_id, data.device_id);
        return {
            device: {
                id: device.id,
                user_id: device.userId,
                fingerprint: device.fingerprint,
                is_trusted: device.isTrusted,
                last_used_at: device.lastUsedAt?.toISOString(),
                ip_address: device.ipAddress,
                first_seen_at: device.createdAt.toISOString(),
                device_name: device.deviceName,
                browser: device.metadata?.browser,
                os: device.metadata?.os,
            },
        };
    }

    @GrpcMethod('SecurityService', 'RevokeDeviceTrust')
    async revokeDeviceTrust(data: RevokeDeviceTrustRequest): Promise<RevokeDeviceTrustResponse> {
        await this.deviceFingerprintService.revokeDeviceTrust(data.user_id, data.device_id);
        return { success: true };
    }

    @GrpcMethod('SecurityService', 'GetUserDevices')
    async getUserDevices(data: GetUserDevicesRequest): Promise<GetUserDevicesResponse> {
        const devices = await this.deviceFingerprintService.getUserDevices(data.user_id);
        return {
            devices: devices.map((d) => ({
                id: d.id,
                user_id: d.userId,
                fingerprint: d.fingerprint,
                is_trusted: d.isTrusted,
                last_used_at: d.lastUsedAt?.toISOString(),
                ip_address: d.ipAddress,
                first_seen_at: d.createdAt.toISOString(),
                device_name: d.deviceName,
                browser: d.metadata?.browser,
                os: d.metadata?.os,
            })),
        };
    }

    @GrpcMethod('SecurityService', 'IsNewDevice')
    async isNewDevice(data: IsNewDeviceRequest): Promise<IsNewDeviceResponse> {
        const isNew = await this.deviceFingerprintService.isNewDevice(data.user_id, data.fingerprint);
        return { is_new: isNew };
    }

    @GrpcMethod('SecurityService', 'GenerateFingerprint')
    async generateFingerprint(data: GenerateFingerprintRequest): Promise<GenerateFingerprintResponse> {
        const fingerprint = this.deviceFingerprintService.generateFingerprint({
            userAgent: data.user_agent,
            acceptLanguage: data.accept_language,
            acceptEncoding: data.accept_encoding,
            ipAddress: data.ip_address,
        });
        return { fingerprint };
    }

    @GrpcMethod('SecurityService', 'DeleteDevice')
    async deleteDevice(data: DeleteDeviceRequest): Promise<DeleteDeviceResponse> {
        await this.deviceFingerprintService.deleteDevice(data.user_id, data.device_id);
        return { success: true };
    }

    // Anti-Phishing Methods
    @GrpcMethod('SecurityService', 'SetAntiPhishingCode')
    async setAntiPhishingCode(data: SetAntiPhishingCodeRequest): Promise<SetAntiPhishingCodeResponse> {
        const code = await this.antiPhishingService.setAntiPhishingCode(data.user_id, data.phishing_code, data.ip_address);
        return {
            code: {
                user_id: code.userId,
                phishing_code: code.phishingCode,
                is_active: code.isActive,
            },
        };
    }

    @GrpcMethod('SecurityService', 'GetAntiPhishingCode')
    async getAntiPhishingCode(data: GetAntiPhishingCodeRequest): Promise<GetAntiPhishingCodeResponse> {
        const code = await this.antiPhishingService.getAntiPhishingCode(data.user_id);
        return {
            code: code
                ? {
                    user_id: code.userId,
                    phishing_code: code.phishingCode,
                    is_active: code.isActive,
                }
                : undefined,
        };
    }

    @GrpcMethod('SecurityService', 'GetCodeForEmail')
    async getCodeForEmail(data: GetCodeForEmailRequest): Promise<GetCodeForEmailResponse> {
        const codeString = await this.antiPhishingService.getCodeForEmail(data.user_id);
        return { code: codeString };
    }

    @GrpcMethod('SecurityService', 'VerifyAntiPhishingCode')
    async verifyAntiPhishingCode(data: VerifyAntiPhishingCodeRequest): Promise<VerifyAntiPhishingCodeResponse> {
        const isValid = await this.antiPhishingService.verifyAntiPhishingCode(data.user_id, data.code);
        return { is_valid: isValid };
    }

    @GrpcMethod('SecurityService', 'DeactivateCode')
    async deactivateCode(data: DeactivateCodeRequest): Promise<DeactivateCodeResponse> {
        await this.antiPhishingService.deactivateCode(data.user_id);
        return { success: true };
    }

    @GrpcMethod('SecurityService', 'GenerateRandomCode')
    async generateRandomCode(data: GenerateRandomCodeRequest): Promise<GenerateRandomCodeResponse> {
        const code = this.antiPhishingService.generateRandomCode();
        return { code };
    }

    @GrpcMethod('SecurityService', 'LogLoginAttempt')
    async logLoginAttempt(data: LogLoginAttemptRequest): Promise<LogLoginAttemptResponse> {
        await this.loginSecurityService.logLoginAttempt({
            userId: data.user_id,
            ipAddress: data.ip_address,
            userAgent: data.user_agent,
            deviceFingerprint: data.device_fingerprint,
            status: data.success ? 'SUCCESS' as any : 'FAILED' as any,
            failureReason: data.failure_reason,
            metadata: data.metadata_json ? JSON.parse(data.metadata_json) : undefined,
        });

        return { success: true };
    }
}
