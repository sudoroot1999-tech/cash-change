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
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { RequireAuth, Public, CurrentUser, BadRequestError } from '@exchange/common';
import { AuthenticatedUser } from '@exchange/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto, PaginationQueryDto } from './dto/user.dto';
import { User } from './entities/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadAvatarResponseDto } from './dto/upload-avatar.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@ApiTags('Users')
@Controller('users')
@RequireAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // @Post()
  // @Public()
  // @HttpCode(HttpStatus.CREATED)
  // @ApiOperation({ summary: 'Register a new user' })
  // @ApiResponse({ status: 201, description: 'User created successfully', type: UserResponseDto })
  // @ApiResponse({ status: 409, description: 'Email or phone already registered' })
  // async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
  //   const user = await this.usersService.create(createUserDto);
  //   return this.toResponseDto(user);
  // }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user from token' })
  @ApiResponse({ status: 200, description: 'Current user data', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@CurrentUser() currentUser: AuthenticatedUser): Promise<UserResponseDto> {
    const user = await this.usersService.findById(currentUser.userId);
    return this.toResponseDto(user);
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

  // @Put(':id')
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Update user' })
  // @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  // @ApiResponse({ status: 200, type: UserResponseDto })
  // async update(
  //   @Param('id', ParseUUIDPipe) id: string,
  //   @Body() updateUserDto: UpdateUserDto,
  // ): Promise<UserResponseDto> {
  //   const user = await this.usersService.update(id, updateUserDto);
  //   return this.toResponseDto(user);
  // }

  @Get(':id/referrals')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user referrals' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getReferrals(@Param('id', ParseUUIDPipe) id: string, @Query() query: PaginationQueryDto) {
    const { page = 1, limit = 20 } = query;
    const { items, total } = await this.usersService.getReferrals(id, page, limit);
    return {
      data: items.map((u) => this.toResponseDto(u)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('referral/:code')
  @ApiOperation({ summary: 'Check referral code validity' })
  @ApiParam({ name: 'code', type: 'string' })
  @ApiResponse({ status: 200, description: 'Referral code is valid' })
  @ApiResponse({ status: 404, description: 'Invalid referral code' })
  async checkReferralCode(@Param('code') code: string) {
    const user = await this.usersService.findByReferralCode(code.toUpperCase());
    return { valid: !!user };
  }


  @Get()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  async getProfile(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.usersService.getUserProfile(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  async updateProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateDto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, updateDto);
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
    return this.usersService.updateUserPreferences(userId, preferences);
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
    data: result,
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
      data: result,
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
      emailVerificationToken:user.emailVerificationToken,
      antiPhishingCode:user.antiPhishingCode,
      lastLoginAt:user.lastLoginAt,
      lastLoginIp:user.lastLoginIp,
      createdAt: user.createdAt,
    };
  }
}
