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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RequireAuth, Public, CurrentUser } from '@exchange/common';
import { AuthenticatedUser } from '@exchange/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto, PaginationQueryDto } from './dto/user.dto';
import { User } from './entities/user.entity';

@ApiTags('Users')
@Controller('users')
@RequireAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully', type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'Email or phone already registered' })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(createUserDto);
    return this.toResponseDto(user);
  }

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

  @Patch(':id/verify-email')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark email as verified' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async verifyEmail(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    const user = await this.usersService.verifyEmail(id);
    return this.toResponseDto(user);
  }

  @Patch(':id/verify-phone')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark phone as verified' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async verifyPhone(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    const user = await this.usersService.verifyPhone(id);
    return this.toResponseDto(user);
  }

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
      createdAt: user.createdAt,
    };
  }
}
