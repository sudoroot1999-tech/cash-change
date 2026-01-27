import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APIKeyService } from "./api/api-key.service";
import { JWTAuthService } from "./auth/jwt-auth.service";
import { MTLSService } from "./auth/mtls.service";
import { AMLService } from "./compliance/aml.service";
import { GDPRService } from "./compliance/gdpr.service";
import { EncryptionService } from "./encryption/encryption.service";
import { KMSService } from "./encryption/kms.service";
import { PasswordService } from "./hash/password.service";
import { CircuitBreakerService } from "./incident-response/circuit-breaker.service";
import { IncidentManagerService } from "./incident-response/incident-manager.service";
import { AnomalyDetectorService } from "./monitoring/anomaly-detector.service";
import { SecurityLoggerService } from "./monitoring/security-logger.service";
import { RateLimiterService } from "./rate-limiting/rate-limiter.service";
import { ValidationService } from "./validation/validation.service";
import { WalletSecurityService } from "./wallet/wallet-security.service";
import { PermissionsGuard } from "./guards/permissions.guard";
import { RequestContextInterceptor } from "./interceptor/request-context.Interceptor";
import { CORSMiddleware, CSRFMiddleware, DeviceContextMiddleware, DeviceFingerprintMiddleware, SecurityMiddleware } from "./middleware/security.middleware";
import { RateLimitGuard } from "./rate-limiting/rate-limit.guard";
import { JwtModule } from "@nestjs/jwt";

@Global()
@Module({
    imports: [
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET'),
                signOptions: {
                    expiresIn: configService.get('JWT_EXPIRES_IN', '15m'),
                },
            }),
        }),
    ],
    providers: [
        APIKeyService,
        JWTAuthService,
        // MTLSService,
        AMLService,
        GDPRService,
        {
            provide: EncryptionService, useFactory: () => ({
                algorithm: 'aes-256-gcm',
                keyLength: 32,
                ivLength: 16,
                saltLength: 64,
                iterations: 100000,
                digest: 'sha512',
            })
        },
        {
            provide: KMSService,
            useFactory: (configService: ConfigService) => ({
                region: configService.get('AWS_REGION'),
                keyId: configService.get('AWS_KMS_KEY_ID'),
                accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
                secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY')
            })
        },
        PasswordService,
        CircuitBreakerService,
        IncidentManagerService,
        {
            provide: AnomalyDetectorService,
            useFactory: () => ({
                withdrawalThreshold: 3,
                loginAttemptsThreshold: 5,
                apiCallsThreshold: 5,
                unusualLocationEnabled: true,
                unusualTimeEnabled: true,
            }),
        },
        SecurityLoggerService,
        RateLimiterService,
        ValidationService,
        WalletSecurityService,
        PermissionsGuard,
        RateLimitGuard,
        RequestContextInterceptor,
        SecurityMiddleware,
        CORSMiddleware,
        DeviceFingerprintMiddleware,
        CSRFMiddleware,
        DeviceContextMiddleware
    ],
    exports: [
        APIKeyService,
        JWTAuthService,
        // MTLSService,
        AMLService,
        GDPRService,
        EncryptionService,
        KMSService,
        PasswordService,
        CircuitBreakerService,
        IncidentManagerService,
        AnomalyDetectorService,
        SecurityLoggerService,
        RateLimiterService,
        ValidationService,
        WalletSecurityService,
        PermissionsGuard,
        RateLimitGuard,
        RequestContextInterceptor,
        SecurityMiddleware,
        CORSMiddleware,
        DeviceFingerprintMiddleware,
        CSRFMiddleware,
        DeviceContextMiddleware
    ]
})
export class SecurityModule {

}