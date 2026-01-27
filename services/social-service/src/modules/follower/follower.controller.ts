import { Controller, Get, Post, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { FollowerService } from './follower.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { PaginationDto } from '../../common/dto';

@ApiTags('followers')
@Controller('followers')
export class FollowerController {
  constructor(private readonly followerService: FollowerService) {}

  @Post(':userId/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a user' })
  @ApiParam({ name: 'userId' })
  follow(@CurrentUser('userId') followerId: string, @Param('userId') followingId: string) {
    return this.followerService.follow(followerId, followingId);
  }

  @Delete(':userId/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiParam({ name: 'userId' })
  unfollow(@CurrentUser('userId') followerId: string, @Param('userId') followingId: string) {
    return this.followerService.unfollow(followerId, followingId);
  }

  @Post('requests/:followerId/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept follow request' })
  @ApiParam({ name: 'followerId' })
  acceptRequest(@CurrentUser('userId') userId: string, @Param('followerId') followerId: string) {
    return this.followerService.acceptFollowRequest(userId, followerId);
  }

  @Delete('requests/:followerId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject follow request' })
  @ApiParam({ name: 'followerId' })
  rejectRequest(@CurrentUser('userId') userId: string, @Param('followerId') followerId: string) {
    return this.followerService.rejectFollowRequest(userId, followerId);
  }

  @Post(':userId/block')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Block a user' })
  @ApiParam({ name: 'userId' })
  block(@CurrentUser('userId') userId: string, @Param('userId') blockedUserId: string) {
    return this.followerService.blockUser(userId, blockedUserId);
  }

  @Delete(':userId/block')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiParam({ name: 'userId' })
  unblock(@CurrentUser('userId') userId: string, @Param('userId') blockedUserId: string) {
    return this.followerService.unblockUser(userId, blockedUserId);
  }

  @Get(':userId/followers')
  @ApiOperation({ summary: 'Get user followers' })
  @ApiParam({ name: 'userId' })
  getFollowers(@Param('userId') userId: string, @Query() pagination: PaginationDto) {
    return this.followerService.getFollowers(userId, pagination);
  }

  @Get(':userId/following')
  @ApiOperation({ summary: 'Get users that user is following' })
  @ApiParam({ name: 'userId' })
  getFollowing(@Param('userId') userId: string, @Query() pagination: PaginationDto) {
    return this.followerService.getFollowing(userId, pagination);
  }

  @Get('requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending follow requests' })
  getPendingRequests(@CurrentUser('userId') userId: string, @Query() pagination: PaginationDto) {
    return this.followerService.getPendingRequests(userId, pagination);
  }

  @Get(':userId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get follow status with a user' })
  @ApiParam({ name: 'userId' })
  getStatus(@CurrentUser('userId') followerId: string, @Param('userId') followingId: string) {
    return this.followerService.getFollowStatus(followerId, followingId);
  }

  @Post(':userId/notifications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle notifications for a followed user' })
  @ApiParam({ name: 'userId' })
  toggleNotifications(@CurrentUser('userId') followerId: string, @Param('userId') followingId: string) {
    return this.followerService.toggleNotifications(followerId, followingId);
  }
}
