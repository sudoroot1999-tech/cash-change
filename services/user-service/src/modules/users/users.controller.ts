import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { CurrentUser, BadRequestError, User, Public, HTTP_STATUS, RequireAuth } from '@exchange/common';
import { AuthenticatedUser } from '@exchange/common';
import { UsersService } from './users.service';
import { UpdateUserDto, UserResponseDto, PaginationQueryDto, VerifyEmailDto } from './dto/user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadAvatarResponseDto } from './dto/upload-avatar.dto';

@ApiTags('Users')
@Controller('users')
@RequireAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user from token' })
  @ApiResponse({ status: 200, description: 'Current user data', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@CurrentUser() currentUser): Promise<UserResponseDto> {
    return this.toResponseDto(currentUser);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    return this.toResponseDto(user);
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HTTP_STATUS.OK)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.usersService.verifyEmail(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(id, updateUserDto);
    return this.toResponseDto(user);
  }


  @Get()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  async getProfile(@Param('userId', ParseUUIDPipe) userId: string) {
    const profile = await this.usersService.getUserProfile(userId)
    return { success: true, data: profile }
  }

  @Put()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  async updateProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateDto: UpdateUserDto,
  ) {
    const updatedProfile = await this.usersService.update(userId, updateDto)
    return { success: true, data: updatedProfile }
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved successfully' })
  async getPreferences(@CurrentUser() user) {
    const profile = await this.usersService.getUserProfile(user.userID);
    return {
      success: true,
      data: profile.preferences,
    };
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  async updatePreferences(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() preferences: Record<string, unknown>,
  ) {
    const updatedPreferences = this.usersService.updateUserPreferences(userId, preferences);
    return { success: true, data: updatedPreferences }
  }

  @Post('upload-avatar')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully', type: UploadAvatarResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload avatar' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  async uploadAvatar(
    @Param('userId', ParseUUIDPipe) userId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user
  ) {

    if (!file) {
      throw new BadRequestError('No file uploaded');
    }

    const result = await this.usersService.uploadAvatar(
      user.userID,
      file,
      file.mimetype
    );

    return {
      success: true,
      message: 'Avatar uploaded successfully',
      data: result?.avatarUrl,
    };
  }

  @Get('limits')
  @ApiOperation({ summary: 'Get user limits based on KYC level' })
  @ApiResponse({ status: 200, description: 'Limits retrieved successfully' })
  async getLimits(@CurrentUser() user) {
    const limits = await this.usersService.getUserLimits(user.userId);
    return {
      success: true,
      data: limits,
    };
  }

  @Post('limits/check')
  @ApiOperation({ summary: 'Check if user can perform an action based on limits' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        limitType: {
          type: 'string',
          enum: ['withdrawal', 'deposit', 'trade'],
        },
        amount: {
          type: 'number',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Limit check completed' })
  async checkLimit(
    @CurrentUser() user,
    @Body() body: { limitType: 'withdrawal' | 'deposit' | 'trade'; amount: number },
  ) {
    const result = await this.usersService.checkLimit(
      user.userId,
      body.limitType,
      body.amount,
    );

    return {
      success: true,
      data: { ...result },
    };
  }

  /**
   * Transform User entity to Response DTO
   */
  private toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username || undefined,
      phone: user.phone || undefined,
      status: user.status,
      tier: user.tier,
      kycLevel: user.kycLevel,
      referralCode: user.referralCode,
      twoFactorEnabled: user.twoFactorEnabled,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      emailVerificationToken: user.emailVerificationToken,
      antiPhishingCode: user.antiPhishingCode,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
      createdAt: user.createdAt,
    };
  }
}
