import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ApiKeyService, TransactionMonitoringService } from '../services';

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

@Controller()
export class SecurityGrpcController {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly transactionMonitoringService: TransactionMonitoringService,
    ) { }

    @GrpcMethod('SecurityService', 'ValidateApiKey')
    async validateApiKey(data: ValidateApiKeyRequest): Promise<ValidateApiKeyResponse> {
        const { api_key, api_secret } = data;

        // The service requires both key and secret
        const validKey = await this.apiKeyService.validateApiKey(api_key, api_secret);

        if (!validKey) {
            return {
                is_valid: false,
            };
        }

        return {
            is_valid: true,
            user_id: validKey.userId,
            permissions: validKey.permissions,
        };
    }

    @GrpcMethod('SecurityService', 'CheckRiskScore')
    async checkRiskScore(data: CheckRiskScoreRequest): Promise<CheckRiskScoreResponse> {
        const { user_id, action, ip_address } = data;

        // We can use the action and ip_address for logging/context if the service supported it
        // For now we assume the service uses stored data mainly

        // Potentially specific checks for withdrawal etc if services supported it

        const riskScore = await this.transactionMonitoringService.calculateRiskScore(user_id);

        // Determine if check passed
        // Block Critical (>= 80)
        const passed = riskScore.score < 80;

        return {
            score: riskScore.score,
            risk_level: riskScore.riskLevel,
            check_passed: passed,
        };
    }
}
