import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { WebinarService } from './webinar.service';
import { Webinar, WebinarRegistration, WebinarStatus } from '../../database/entities';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Resolver(() => Webinar)
export class WebinarResolver {
  constructor(private readonly webinarService: WebinarService) {}

  @Query(() => Webinar, { name: 'webinar' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<Webinar> {
    return this.webinarService.findOne(id);
  }

  @Query(() => [Webinar], { name: 'upcomingWebinars' })
  async getUpcoming(@Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number): Promise<Webinar[]> {
    return this.webinarService.getUpcoming(limit);
  }

  @Query(() => [Webinar], { name: 'liveWebinars' })
  async getLive(): Promise<Webinar[]> {
    return this.webinarService.getLive();
  }

  @Query(() => [WebinarRegistration], { name: 'myWebinarRegistrations' })
  @UseGuards(JwtAuthGuard)
  async getMyRegistrations(@CurrentUser('userId') userId: string): Promise<WebinarRegistration[]> {
    return this.webinarService.getUserRegistrations(userId);
  }

  @Mutation(() => WebinarRegistration)
  @UseGuards(JwtAuthGuard)
  async registerForWebinar(
    @Args('webinarId', { type: () => ID }) webinarId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<WebinarRegistration> {
    return this.webinarService.register(userId, webinarId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deleteWebinar(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    await this.webinarService.remove(id);
    return true;
  }
}
