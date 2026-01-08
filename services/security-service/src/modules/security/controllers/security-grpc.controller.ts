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
import { AntiPhishingCode, ApiResponse, camelToSnake, LOGIN_STATUS, LoginHistory, LoginStatus, snakeToCamel, TrustedDevice } from '@exchange/common';

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
    session_id: string,
    refresh_token?: string,
    expires_in_hours?: number
}

interface KillSessionRequest {
    user_id: string;
    session_id: string;
}

interface KillAllSessionsRequest {
    user_id: string;
    except_session_id?: string;
}

// 2FA Interfaces
interface GenerateSecretRequest {
    user_id: string;
    email: string;
}

interface GenerateQRCodeRequest {
    otpauth_url: string;
}

interface VerifyTokenRequest {
    user_id: string;
    token: string;
}

interface VerifyBackupCodeRequest {
    user_id: string;
    code: string;
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

interface IsDeviceTrustedRequest {
    user_id: string;
    fingerprint: string;
}

// Anti-Phishing Interfaces
interface SetAntiPhishingCodeRequest {
    user_id: string;
    phishing_code: string;
    ip_address?: string;
}


interface GenerateRandomCodeRequest { }


interface LogLoginAttemptRequest {
    user_id: string;
    ip_address: string;
    user_agent?: string;
    device_fingerprint?: string;
    success: boolean;
    failure_reason?: string;
    metadata_json?: string;
}

interface FindTwoFactorByUserIdRequest {
    user_id: string;
}

interface UpdateTwoFactorRequest {
    user_id: string;
    data: UpdateTwoFactorStatusDto;
}

interface GetActiveSessionRequest {
    user_id: string;
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

    // Session Methods
    @GrpcMethod('SecurityService', 'CreateSession')
    async createSession(data: CreateSessionRequest): Promise<ApiResponse<UserSession>> {
        try {
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
            return camelToSnake<ApiResponse<UserSession>>({
                success: true,
                data: session
            })

        }
        catch (error: any) {
            return camelToSnake({ success: false, error })
        }
    }

    @GrpcMethod('SecurityService', 'UpdateSession')
    async updateSession(data: UpdateSessionRequest): Promise<ApiResponse<UserSession>> {
        try {

            const session = await this.loginSecurityService.updateSession({
                sessionId: data.session_id,
                refreshToken: data.refresh_token,
                expiresInHours: data.expires_in_hours
            });

            return camelToSnake<ApiResponse<UserSession>>({
                success: true,
                data: session
            })
        }
        catch (error: any) {
            return camelToSnake({ success: false, error })
        }
    }

    @GrpcMethod('SecurityService', 'GetActiveSession')
    async getActiveSession(data: GetActiveSessionRequest): Promise<ApiResponse<UserSession[]>> {
        try {
            const sessions = await this.loginSecurityService.getActiveSessions(data.user_id);
            return camelToSnake<ApiResponse<UserSession[]>>({ success: true, data: sessions })
        }
        catch (error: any) {
            return camelToSnake({ success: false, error })
        }
    }

    @GrpcMethod('SecurityService', 'KillSession')
    async killSession(data: KillSessionRequest): Promise<ApiResponse<string>> {
        try {
            const response = await this.loginSecurityService.killSession(data.user_id, data.session_id);
            return camelToSnake<ApiResponse<string>>({ ...response })
        }
        catch (error: any) {
            return camelToSnake({ success: false, error })
        }
    }

    @GrpcMethod('SecurityService', 'KillAllSessions')
    async killAllSessions(data: KillAllSessionsRequest): Promise<ApiResponse<string>> {
        try {
            const response = await this.loginSecurityService.killAllSessions(data.user_id, data.except_session_id);
            return camelToSnake<ApiResponse<string>>({ ...response });
        }
        catch (error: any) {
            return camelToSnake({ success: false, error })
        }
    }

    @GrpcMethod('SecurityService', 'FindTwoFactorByUserId')
    async findTwoFactorByUserId(data: FindTwoFactorByUserIdRequest): Promise<ApiResponse<UserTwoFactor>> {
        try {
            const twoFactor = await this.twoFactorService.findByUserId(data.user_id);
            return camelToSnake<ApiResponse<UserTwoFactor>>({
                success: true,
                data: twoFactor
            });
        }
        catch (error: any) {
            return camelToSnake({ success: false, error })
        }
    }

    // 2FA Methods
    @GrpcMethod('SecurityService', 'GenerateSecret')
    async generateSecret(data: GenerateSecretRequest): Promise<ApiResponse<{
        otpauthUrl: any;
        backupCodes:
        string[], secret: any
    }>> {
        try {
            const secret = await this.twoFactorService.generateSecret(data.user_id, data.email);
            return camelToSnake<ApiResponse<{
                otpauthUrl: any;
                backupCodes:
                string[], secret: any
            }>>({ success: true, data: secret });
        }
        catch (error: any) {
            return camelToSnake({ success: false, error })
        }
    }

    @GrpcMethod('SecurityService', 'UpdateTwoFactor')
    async updateTwoFactor(data: UpdateTwoFactorRequest): Promise<ApiResponse<UserTwoFactor>> {
        try {
            const twoFactor = await this.twoFactorService.updateTwoFactor(data.user_id, data.data);
            return camelToSnake<ApiResponse<UserTwoFactor>>({
                success: true,
                data: twoFactor
            });
        }
        catch (error: any) {
            return camelToSnake({ success: false, error })
        }
    }

    @GrpcMethod('SecurityService', 'GenerateQRCode')
    async generateQRCode(data: GenerateQRCodeRequest): Promise<ApiResponse<{ qrCodeDataUrl: string }>> {
        try {
            const qrCode = await this.twoFactorService.generateQRCode(data.otpauth_url);
            return camelToSnake<ApiResponse<{ qrCodeDataUrl: string }>>({ success: true, data: { qrCodeDataUrl: qrCode } });
        }
        catch (error: any) {
            return camelToSnake({ success: false, error })
        }
    }

    @GrpcMethod('SecurityService', 'VerifyToken')
    async verifyToken(data: VerifyTokenRequest): Promise<ApiResponse<{ isValid: boolean }>> {
        try {
            const isValid = await this.twoFactorService.verifyToken(data.user_id, data.token);
            return camelToSnake<ApiResponse<{ isValid: boolean }>>({
                success: true,
                data: { isValid }
            });
        }
        catch (error: any) {
            return camelToSnake({ success: false, error })
        }
    }

    @GrpcMethod('SecurityService', 'VerifyBackupCode')
    async verifyBackupCode(data: VerifyBackupCodeRequest): Promise<ApiResponse<{ isValid: boolean }>> {
        try {
            const isValid = await this.twoFactorService.verifyBackupCode(data.user_id, data.code);
            return camelToSnake<ApiResponse<{ isValid: boolean }>>({
                success: true,
                data: { isValid }
            });
        }
        catch (error: any) {
            return camelToSnake({ success: false, error })
        }
    }

    @GrpcMethod('SecurityService', 'Disable2FA')
    async disable2FA(data: Disable2FARequest): Promise<Disable2FAResponse> {
        await this.twoFactorService.disable(data.user_id);
        return { success: true };
    }

    // Device Methods
    @GrpcMethod('SecurityService', 'RegisterDevice')
    async registerDevice(data: RegisterDeviceRequest): Promise<ApiResponse<TrustedDevice>> {
        try {
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
            return camelToSnake<ApiResponse<TrustedDevice>>({
                success: true,
                data: device
            });
        }
        catch (error: any) {
            return camelToSnake({ success: false, error })
        }
    }

    @GrpcMethod('SecurityService', 'IsDeviceTrusted')
    async isDeviceTrusted(data: IsDeviceTrustedRequest): Promise<ApiResponse<{ isTrusted: boolean }>> {
        try {
            const isTrusted = await this.deviceFingerprintService.isDeviceTrusted(data.user_id, data.fingerprint);
            return camelToSnake<ApiResponse<{ isTrusted: boolean }>>({ success: true, data: { c } });
        }
        catch (error: any) {
            return camelToSnake({ success: false, error })
        }
    }

    // Anti-Phishing Methods
    @GrpcMethod('SecurityService', 'SetAntiPhishingCode')
    async setAntiPhishingCode(data: SetAntiPhishingCodeRequest): Promise<ApiResponse<AntiPhishingCode>> {
        try {
            const antiPhishingCode = await this.antiPhishingService.setAntiPhishingCode(data.user_id, data.phishing_code, data.ip_address);
            return camelToSnake<ApiResponse<AntiPhishingCode>>({
                success: true,
                data: antiPhishingCode
            })
        }
        catch (error: any) {
            return camelToSnake({ success: false, error })
        }
    }

    @GrpcMethod('SecurityService', 'GenerateRandomCode')
    async generateRandomCode(data: GenerateRandomCodeRequest): Promise<ApiResponse<string>> {
        const code = this.antiPhishingService.generateRandomCode();
        return camelToSnake<ApiResponse<string>>({
            success: true,
            data: code
        });
    }

    @GrpcMethod('SecurityService', 'LogLoginAttempt')
    async logLoginAttempt(data: LogLoginAttemptRequest): Promise<ApiResponse<LoginHistory>> {
        try {
            const logLoginAttemp = await this.loginSecurityService.logLoginAttempt({
                userId: data.user_id,
                ipAddress: data.ip_address,
                userAgent: data.user_agent,
                deviceFingerprint: data.device_fingerprint,
                status: data.success ? LOGIN_STATUS.SUCCESS : LOGIN_STATUS.FAILED,
                failureReason: data.failure_reason,
                metadata: data.metadata_json ? JSON.parse(data.metadata_json) : undefined,
            });

            return camelToSnake<ApiResponse<LoginHistory>>({ success: true, data: logLoginAttemp });
        }
        catch (error: any) {
            return camelToSnake({ success: false, error })
        }
    }
}
