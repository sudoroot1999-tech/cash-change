
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from '@exchange/common';
import {
  LoginDto,
  RefreshTokenDto,
  TokenResponseDto,
  Enable2FADto,
  TwoFactorSetupDto,
} from './dto/auth.dto';
import { RegisterDto } from './dto/register.dto';
import {
  SendVerificationCodeDto,
  VerifyCodeDto,
  LoginWithEmailCodeDto,
  VerificationCodeResponseDto,
} from './dto/verification.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request): Promise<TokenResponseDto> {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!loginDto.twoFactorCode) {
        throw new Error('2FA code required');
      }
      const isValid = this.authService.verify2FACode(
        user.twoFactorSecret!,
        loginDto.twoFactorCode,
      );
      if (!isValid) {
        throw new Error('Invalid 2FA code');
      }
    }

    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      platform: req.headers['sec-ch-ua-platform'],
    };
    const ipAddress = req.ip || req.socket.remoteAddress;

    return this.authService.generateTokens(user, deviceInfo, ipAddress);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  async refresh(@Body() refreshDto: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refreshTokens(refreshDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  async logout(@Body() refreshDto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(refreshDto.refreshToken);
  }

  @Post('2fa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup 2FA - get secret and QR code' })
  @ApiResponse({ status: 200, type: TwoFactorSetupDto })
  async setup2FA(@Req() req: Request): Promise<TwoFactorSetupDto> {
    // In production, get userId from JWT token
    const userId = (req as any).user?.sub;
    return this.authService.setup2FA(userId);
  }

  @Post('2fa/enable')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable 2FA after verification' })
  async enable2FA(@Body() _enableDto: Enable2FADto, @Req() _req: Request) {
    // Implementation would verify code and enable 2FA
    return { success: true, message: '2FA enabled successfully' };
  }

  @Post('2fa/disable')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA' })
  async disable2FA(@Body() _verifyDto: Enable2FADto, @Req() _req: Request) {
    // Implementation would verify code and disable 2FA
    return { success: true, message: '2FA disabled' };
  }

  @Get('validate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate current token' })
  async validateToken(@Req() req: Request) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      throw new Error('No token provided');
    }
    return this.authService.validateToken(token);
  }

  @Public()
  @Post('send-login-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send login verification code to email' })
  @ApiResponse({ status: 200, type: VerificationCodeResponseDto })
  async sendLoginCode(@Body() loginDto: LoginDto): Promise<VerificationCodeResponseDto> {
    const result = await this.authService.sendLoginCode(loginDto.email, loginDto.password);
    return {
      success: true,
      message: 'Verification code sent to your email',
      expiresInMinutes: result.expiresInMinutes,
    };
  }

  @Public()
  @Post('login-with-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email verification code' })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  async loginWithCode(@Body() loginDto: LoginWithEmailCodeDto, @Req() req: Request): Promise<TokenResponseDto> {
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      platform: req.headers['sec-ch-ua-platform'],
    };
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await this.authService.loginWithEmailCode(
      loginDto.email,
      loginDto.password,
      loginDto.emailCode,
    );

    return result;
  }

  @Public()
  @Post('complete-registration')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete registration with email verification code' })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  async completeRegistration(@Body() verifyDto: VerifyCodeDto): Promise<TokenResponseDto> {
    return this.authService.completeRegistration(verifyDto.email, verifyDto.code);
  }

  @Public()
  @Post('resend-registration-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend registration verification code' })
  @ApiResponse({ status: 200, type: VerificationCodeResponseDto })
  async resendRegistrationCode(@Body() dto: { email: string }): Promise<VerificationCodeResponseDto> {
    const result = await this.authService.resendRegistrationCode(dto.email);
    return {
      success: true,
      message: 'Verification code sent to your email',
      expiresInMinutes: result.expiresInMinutes,
    };
  }
}
