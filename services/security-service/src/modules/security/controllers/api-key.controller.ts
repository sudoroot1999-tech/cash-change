import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiKeyService } from '../services/api-key.service';
import { CreateApiKeyDto, UpdateApiKeyPermissionsDto, UpdateIpWhitelistDto } from '../dto/api-key.dto';
import { RequireAuth } from '@exchange/common';

@Controller('security/api-keys')
@RequireAuth()
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  async createApiKey(@Req() req: any, @Body() dto: CreateApiKeyDto) {
    const userId = req.user.id;
    
    const result = await this.apiKeyService.createApiKey({
      userId,
      ...dto,
    });

    return {
      success: true,
      message: 'API key created successfully. Save the secret - it will not be shown again.',
      data: {
        apiKey: result.apiKey.apiKey,
        secret: result.secret,
        permissions: result.apiKey.permissions,
        expiresAt: result.apiKey.expiresAt,
      },
    };
  }

  @Get()
  async getApiKeys(@Req() req: any) {
    const userId = req.user.id;
    const keys = await this.apiKeyService.getUserApiKeys(userId);

    return {
      success: true,
      data: keys.map(key => ({
        id: key.id,
        keyName: key.keyName,
        apiKey: key.apiKey,
        permissions: key.permissions,
        ipWhitelist: key.ipWhitelist,
        isActive: key.isActive,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
      })),
    };
  }

  @Put(':keyId/permissions')
  async updatePermissions(
    @Req() req: any,
    @Param('keyId') keyId: string,
    @Body() dto: UpdateApiKeyPermissionsDto,
  ) {
    const userId = req.user.id;
    const result = await this.apiKeyService.updatePermissions(userId, keyId, dto.permissions);

    return {
      success: true,
      message: 'Permissions updated',
      data: result,
    };
  }

  @Put(':keyId/ip-whitelist')
  async updateIpWhitelist(
    @Req() req: any,
    @Param('keyId') keyId: string,
    @Body() dto: UpdateIpWhitelistDto,
  ) {
    const userId = req.user.id;
    const result = await this.apiKeyService.updateIpWhitelist(userId, keyId, dto.ipWhitelist);

    return {
      success: true,
      message: 'IP whitelist updated',
      data: result,
    };
  }

  @Post(':keyId/rotate')
  async rotateSecret(@Req() req: any, @Param('keyId') keyId: string) {
    const userId = req.user.id;
    const result = await this.apiKeyService.rotateSecret(userId, keyId);

    return {
      success: true,
      message: 'Secret rotated successfully. Save the new secret - it will not be shown again.',
      data: {
        secret: result.secret,
        lastRotatedAt: result.apiKey.lastRotatedAt,
      },
    };
  }

  @Delete(':keyId')
  async deleteApiKey(@Req() req: any, @Param('keyId') keyId: string) {
    const userId = req.user.id;
    await this.apiKeyService.deleteApiKey(userId, keyId);

    return {
      success: true,
      message: 'API key deleted',
    };
  }
}
