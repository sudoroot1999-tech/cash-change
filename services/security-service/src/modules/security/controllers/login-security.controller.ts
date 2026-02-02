import { Controller, Get, Post, Delete, Param, Req, Body, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import { LoginSecurityService } from '../services/login-security.service';
import { DeviceFingerprintService } from '../services/device-fingerprint.service';
import { AuthenticatedUser, CurrentUser, RequireAuth } from '@exchange/common';
import { CreateSessionDto } from '../dto/login-security.dto';

@Controller('security/login')
@RequireAuth()
export class LoginSecurityController {
  constructor(
    private readonly loginSecurityService: LoginSecurityService,
    private readonly deviceService: DeviceFingerprintService,
  ) { }

  @Get('history')
  async getLoginHistory(@Req() req: any) {
    const userId = req.user.id;
    const history = await this.loginSecurityService.getLoginHistory(userId);

    return {
      success: true,
      data: history,
    };
  }

  @Post('sessions')
  async createSession(
    @Body() createSessionDto: CreateSessionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {

    createSessionDto.userId = user.userId;
    const session = await this.loginSecurityService.createSession(createSessionDto);

    res.cookie('session_id', session.id, {
      httpOnly: true,
      signed: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 Days
      path: '/',
    });

    return {
      success: true,
      data: session,
    };
  }

  @Get('sessions')
  async getActiveSessions(@Req() req: any) {
    const userId = req.user.id;
    const sessions = await this.loginSecurityService.getActiveSessions(userId);

    return {
      success: true,
      data: sessions,
    };
  }

  @Delete('sessions')
  async killCurrentSession(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {

    const sessionId = req.signedCookies?.['session_id'];
    await this.loginSecurityService.killSession(user.userId, sessionId);

    res.clearCookie('session_id', {
      httpOnly: true,
      secure: false,
      signed: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 Days
      path: '/',
    });

    return {
      success: true,
      message: 'Session terminated',
    };
  }

  @Delete('sessions/:sessionId')
  async killSession(@Req() req: any, @Param('sessionId') sessionId: string) {
    const userId = req.user.id;
    await this.loginSecurityService.killSession(userId, sessionId);

    return {
      success: true,
      message: 'Session terminated',
    };
  }

  @Post('sessions/kill-all')
  async killAllSessions(@Req() req: any) {
    const userId = req.user.id;
    const currentSessionId = req.session?.id;

    await this.loginSecurityService.killAllSessions(userId, currentSessionId);

    return {
      success: true,
      message: 'All sessions terminated (except current)',
    };
  }

  @Get('devices')
  async getDevices(@Req() req: any) {
    const userId = req.user.id;
    const devices = await this.deviceService.getUserDevices(userId);

    return {
      success: true,
      data: devices,
    };
  }

  @Post('devices/:deviceId/trust')
  async trustDevice(@Req() req: any, @Param('deviceId') deviceId: string) {
    const userId = req.user.id;
    const device = await this.deviceService.trustDevice(userId, deviceId);

    return {
      success: true,
      message: 'Device trusted',
      data: device,
    };
  }

  @Delete('devices/:deviceId')
  async removeDevice(@Req() req: any, @Param('deviceId') deviceId: string) {
    const userId = req.user.id;
    await this.deviceService.deleteDevice(userId, deviceId);

    return {
      success: true,
      message: 'Device removed',
    };
  }
}
