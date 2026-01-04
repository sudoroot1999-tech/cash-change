import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyService } from '../modules/security/services';


@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    const apiKey = request.headers['x-api-key'];
    const apiSecret = request.headers['x-api-secret'];
    const timestamp = request.headers['x-timestamp'];
    const signature = request.headers['x-signature'];

    if (!apiKey || !apiSecret) {
      throw new UnauthorizedException('API key and secret required');
    }

    // Validate API key
    const validatedKey = await this.apiKeyService.validateApiKey(
      apiKey,
      apiSecret,
      request.ip,
    );

    if (!validatedKey) {
      throw new UnauthorizedException('Invalid API key or secret');
    }

    // Verify signature if provided
    if (signature && timestamp) {
      const isValidSignature = this.apiKeyService.verifySignature(
        apiSecret,
        timestamp,
        request.method,
        request.path,
        JSON.stringify(request.body || {}),
        signature,
      );

      if (!isValidSignature) {
        throw new UnauthorizedException('Invalid signature');
      }

      // Validate nonce
      const nonce = request.headers['x-nonce'];
      if (nonce) {
        const isValidNonce = await this.apiKeyService.validateNonce(nonce, timestamp);
        if (!isValidNonce) {
          throw new UnauthorizedException('Invalid nonce or timestamp');
        }
      }
    }

    // Attach API key to request
    request.apiKey = validatedKey;
    request.user = { id: validatedKey.userId };

    return true;
  }
}
