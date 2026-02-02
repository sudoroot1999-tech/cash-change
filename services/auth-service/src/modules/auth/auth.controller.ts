
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Get,
  Put,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { AuthenticatedUser, CurrentUser, Public, RateLimit, ReqContext, RequestContext, RequireAuth } from '@exchange/common';
import {
  LoginDto,
  RefreshTokenDto,
  Enable2FADto,
  RegisterDto,
  Verify2FADto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  LogoutDto,
  CompleteLoginDto
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
    const user = await this.authService.register(dto);
    return {
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: {
        ...user
      }
    }
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
    @ReqContext() ctx: RequestContext,
    @Res({ passthrough: true }) res: Response
  ) {

    const result = await this.authService.login(dto, ctx);

    return {
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: {
        ...result
      }
    }
  }

  @Post('complete-login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5, blockDurationMs: 30 * 60 })
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async completeLogin(
    @Body() dto: CompleteLoginDto,
    @ReqContext() ctx: RequestContext,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {

    const sessionId = req.signedCookies['session_id'];
    const result = await this.authService.completeLogin(dto, sessionId, ctx);

    if ('refreshToken' in result) {
      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        signed: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7,
        path: '/',
      });
    }

    return {
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: {
        ...result
      }
    }
  }


  @Post('refresh')
  @RequireAuth()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ windowMs: 60 * 1000, maxRequests: 10 })
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @ReqContext() ctx: RequestContext
  ) {
    const sessionId = req.signedCookies['session_id'];
    const refreshToken = req.signedCookies['refresh_token'];
    const result = await this.authService.refreshToken(user.userId, { refreshToken }, ctx, sessionId);
    return {
      success: true,
      data: {
        ...result
      }
    }
  }

  @Post('logout')
  @RequireAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    
    const sessionId = req.signedCookies['session_id'];
    const result = await this.authService.logout(user, sessionId);

    res.clearCookie('refresh_token', {
      httpOnly: true,
      signed: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
      path: '/',
    });

    return {
      ...result,
      data: result.message
    }
  }

  @Post('2fa/setup')
  @RequireAuth()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup 2FA - get secret and QR code' })
  @ApiResponse({ status: 200, type: Enable2FADto })
  async setup2FA(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.authService.setup2FA(user.userId);
    return {
      success: true,
      data: {
        ...result
      }
    }
  }

  @Post('2fa/enable')
  @RequireAuth()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable 2FA after verification' })
  @ApiResponse({ status: 200, description: '2FA setup initiated' })
  async enable2FA(@CurrentUser() user: AuthenticatedUser, @Body() dto: Verify2FADto) {
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
    const result = await this.authService.verify2FA(
      dto.tempToken,
      dto,
      ctx
    );
    return {
      success: true,
      data: {
        ...result
      }
    }
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
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    const result = await this.authService.changePassword(user, dto);
    return {
      success: true,
      data: {
        result
      }
    }
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 3 })
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Reset email sent' })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @ReqContext() ctx: RequestContext) {
    const result = await this.authService.forgotPassword(dto, ctx.ipAddress);
    return {
      success: true,
      data: {
        result
      }
    }
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 3 })
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(dto);
    return {
      success: true,
      data: {
        result
      }
    }
  }

}
