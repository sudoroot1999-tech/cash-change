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

interface SnakedAntiPhishingCode {
    id: string;
    user_id: string;
    phishing_code: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
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
    async createSession(data: CreateSessionRequest): Promise<ApiResponse<SnakedUserSession>> {
        const transformedData = snakeToCamel<CreateSessionRequest>(data);
        try {
            const session = await this.loginSecurityService.createSession({
                userId: transformedData.userId,
                sessionToken: transformedData.sessionToken,
                refreshToken: transformedData.refreshToken,
                deviceFingerprint: transformedData.deviceFingerprint,
                ipAddress: transformedData.ipAddress,
                userAgent: transformedData.userAgent,
                metadata: transformedData.metadataJson ? JSON.parse(transformedData.metadataJson) : undefined,
                expiresInHours: transformedData.expiresInHours,
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
    async updateSession(data: UpdateSessionRequest): Promise<ApiResponse<SnakedUserSession>> {
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
    async getActiveSession(data: GetActiveSessionRequest): Promise<ApiResponse<SnakedUserSession[]>> {
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
            return camelToSnake<ApiResponse<string>>({ ...response, data: response.message })
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
    async findTwoFactorByUserId(data: FindTwoFactorByUserIdRequest): Promise<ApiResponse<SnakedUserTwoFactor>> {
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
        otpauth_url: any;
        backup_codes:
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
    async updateTwoFactor(data: UpdateTwoFactorRequest): Promise<ApiResponse<SnakedUserTwoFactor>> {
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
    async generateQRCode(data: GenerateQRCodeRequest): Promise<ApiResponse<{ qr_code_data_url: string }>> {
        try {
            const qrCode = await this.twoFactorService.generateQRCode(data.otpauth_url);
            return camelToSnake<ApiResponse<{ qrCodeDataUrl: string }>>({ success: true, data: { qrCodeDataUrl: qrCode } });
        }
        catch (error: any) {
            return camelToSnake({ success: false, error })
        }
    }

    @GrpcMethod('SecurityService', 'VerifyToken')
    async verifyToken(data: VerifyTokenRequest): Promise<ApiResponse<{ is_valid: boolean }>> {
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
    async verifyBackupCode(data: VerifyBackupCodeRequest): Promise<ApiResponse<{ is_valid: boolean }>> {
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
    async disable2FA(data: Disable2FARequest): Promise<{
        success: boolean;
    }> {
        await this.twoFactorService.disable(data.user_id);
        return { success: true };
    }

    // Device Methods
    @GrpcMethod('SecurityService', 'RegisterDevice')
    async registerDevice(data: RegisterDeviceRequest): Promise<ApiResponse<SnakedTrustedDevice>> {
        const transformedData = snakeToCamel<RegisterDeviceRequest>(data);
        try {
            const device = await this.deviceFingerprintService.registerDevice(
                transformedData.userId,
                {
                    fingerprint: transformedData.deviceInfo.fingerprint,
                    browser: transformedData.deviceInfo.browser,
                    os: transformedData.deviceInfo.os,
                    device: transformedData.deviceInfo.device,
                    screenResolution: transformedData.deviceInfo.screenResolution,
                    timezone: transformedData.deviceInfo.timezone,
                    language: transformedData.deviceInfo.language,
                    ipAddress: transformedData.deviceInfo.ipAddress,
                    userAgent: transformedData.deviceInfo.userAgent,
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

    // Anti-Phishing Methods
    @GrpcMethod('SecurityService', 'SetAntiPhishingCode')
    async setAntiPhishingCode(data: SetAntiPhishingCodeRequest): Promise<ApiResponse<SnakedAntiPhishingCode>> {
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
    async logLoginAttempt(data: LogLoginAttemptRequest): Promise<ApiResponse<SnakedLoginHistory>> {
        const transformedData = snakeToCamel<LogLoginAttemptRequest>(data);
        try {
            const logLoginAttemp = await this.loginSecurityService.logLoginAttempt({
                userId: transformedData.userId,
                ipAddress: transformedData.ipAddress,
                userAgent: transformedData.userAgent,
                deviceFingerprint: transformedData.deviceFingerprint,
                status: data.success ? LOGIN_STATUS.SUCCESS : LOGIN_STATUS.FAILED,
                failureReason: transformedData.failureReason,
                metadata: transformedData.metadataJson ? JSON.parse(transformedData.metadataJson) : undefined,
            });

            return camelToSnake<ApiResponse<LoginHistory>>({ success: true, data: logLoginAttemp });
        }
        catch (error: any) {
            return camelToSnake({ success: false, error })
        }
    }
}
