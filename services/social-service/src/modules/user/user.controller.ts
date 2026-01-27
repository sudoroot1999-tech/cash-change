import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateProfileDto, UpdateProfileDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { PaginationDto } from '../../common/dto';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create user profile' })
  createProfile(@CurrentUser('userId') userId: string, @Body() dto: CreateProfileDto) {
    return this.userService.createProfile(userId, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getMyProfile(@CurrentUser('userId') userId: string) {
    return this.userService.findByUserId(userId);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  updateMyProfile(@CurrentUser('userId') userId: string, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(userId, dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users' })
  @ApiQuery({ name: 'q', required: true })
  searchUsers(@Query('q') query: string, @Query() pagination: PaginationDto) {
    return this.userService.searchUsers(query, pagination);
  }

  @Get('top-traders')
  @ApiOperation({ summary: 'Get top traders' })
  getTopTraders(@Query() pagination: PaginationDto) {
    return this.userService.getTopTraders(pagination);
  }

  @Get('suggested')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get suggested users to follow' })
  @ApiQuery({ name: 'limit', required: false })
  getSuggestedUsers(
    @CurrentUser('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.userService.getSuggestedUsers(userId, limit);
  }

  @Get(':username')
  @ApiOperation({ summary: 'Get user profile by username' })
  @ApiParam({ name: 'username' })
  getProfileByUsername(@Param('username') username: string) {
    return this.userService.findByUsername(username);
  }

  @Get('id/:userId')
  @ApiOperation({ summary: 'Get user profile by user ID' })
  @ApiParam({ name: 'userId' })
  getProfileByUserId(@Param('userId') userId: string) {
    return this.userService.findByUserId(userId);
  }
}
