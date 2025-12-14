import {
  Controller,
  Get,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { SessionsService } from './sessions.service';

@ApiTags('Sessions')
@Controller('sessions')
@ApiBearerAuth()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active sessions' })
  async getSessions(@Req() req: Request) {
    const userId = (req as any).user?.userId;
    const sessions = await this.sessionsService.getUserSessions(userId);
    return {
      data: sessions.map((s) => ({
        id: s.id,
        deviceInfo: s.deviceInfo,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      })),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.userId;
    await this.sessionsService.deleteSession(sessionId, userId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all other sessions' })
  async revokeOtherSessions(@Req() req: Request) {
    const userId = (req as any).user?.userId;
    const currentSessionId = (req as any).sessionId;
    const count = await this.sessionsService.deleteOtherSessions(userId, currentSessionId);
    return { revokedCount: count };
  }
}
