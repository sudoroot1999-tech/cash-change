import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Channel, ChannelSubscriber, ChannelPost } from '../../database/entities';
import { ChannelService } from './channel.service';
import { ChannelController } from './channel.controller';
import { ChannelResolver } from './channel.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Channel, ChannelSubscriber, ChannelPost])],
  controllers: [ChannelController],
  providers: [ChannelService, ChannelResolver],
  exports: [ChannelService],
})
export class ChannelModule {}
