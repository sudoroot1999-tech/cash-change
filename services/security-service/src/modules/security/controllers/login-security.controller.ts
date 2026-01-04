import { Controller, Get, Post, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { LoginSecurityService } from '../services/login-security.service';
import { DeviceFingerprintService } from '../services/device-fingerprint.service';

@Controller('security/login')
export class LoginSecurityController {
  constructor(
    private readonly loginSecurityService: LoginSecurityService,
    private readonly deviceService: DeviceFingerprintService,
  ) {}

  @Get('history')
  async getLoginHistory(@Req() req: any) {
    const userId = req.user.id;
    const history = await this.loginSecurityService.getLoginHistory(userId);

    return {
      success: true,
      data: history,
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
