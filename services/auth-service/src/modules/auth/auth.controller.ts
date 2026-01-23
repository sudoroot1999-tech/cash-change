
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Get,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser, Public, RateLimit, ReqContext, RequestContext, RequireAuth } from '@exchange/common';
import {
  LoginDto,
  RefreshTokenDto,
  Enable2FADto,
  RegisterDto,
  Verify2FADto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  LogoutDto
} from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5 })
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(
    @Body() dto: RegisterDto,
  ) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5, blockDurationMs: 30 * 60 })
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @ReqContext() ctx: RequestContext
  ) {
    return this.authService.login(dto, ctx);
  }

  @Post('refresh')
  @RequireAuth()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ windowMs: 60 * 1000, maxRequests: 10 })
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @CurrentUser() user,
    @ReqContext() ctx: RequestContext
  ) {
    return this.authService.refreshToken(user.id, dto, ctx);
  }

  @Post('logout')
  @RequireAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  async logout(@CurrentUser() user, @Body() logoutDto: LogoutDto): Promise<void> {
    await this.authService.logout(user, logoutDto.sessionId);
  }

  @Post('2fa/setup')
  @RequireAuth()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup 2FA - get secret and QR code' })
  @ApiResponse({ status: 200, type: Enable2FADto })
  async setup2FA(@CurrentUser() user) {
    return this.authService.setup2FA(user.id);
  }

  @Post('2fa/enable')
  @RequireAuth()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable 2FA after verification' })
  @ApiResponse({ status: 200, description: '2FA setup initiated' })
  async enable2FA(@CurrentUser() user, @Body() dto: Verify2FADto) {
    return this.authService.confirm2FA(user, dto.token);
  }

  @Post('verify-2fa')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ windowMs: 5 * 60 * 1000, maxRequests: 5 })
  @ApiOperation({ summary: 'Verify 2FA code and complete login' })
  @ApiResponse({ status: 200, description: '2FA verified successfully' })
  @ApiResponse({ status: 401, description: 'Invalid 2FA code' })
  async verify2FA(
    @Body() dto: Verify2FADto & { tempToken: string },
    @ReqContext() ctx: RequestContext,
  ) {
    return this.authService.verify2FA(
      dto.tempToken,
      dto,
      ctx
    );
  }

  @Post('2fa/disable')
  @RequireAuth()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA' })
  async disable2FA(@Body() _verifyDto: Enable2FADto, @Req() _req: Request) {
    // Implementation would verify code and disable 2FA
    return { success: true, message: '2FA disabled' };
  }

  @Put('change-password')
  @RequireAuth()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 3 })
  @ApiOperation({ summary: 'Change password' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid current password' })
  async changePassword(@CurrentUser() user, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user, dto);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 3 })
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Reset email sent' })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @ReqContext() ctx: RequestContext) {
    return this.authService.forgotPassword(dto, ctx.ipAddress);
  }

  @Post('reset-password')
  @RequireAuth()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 3 })
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto, @CurrentUser() user) {
    return this.authService.resetPassword(dto, user.id);
  }

}
