import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation, ConversationParticipant, Message } from '../../database/entities';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatResolver } from './chat.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, ConversationParticipant, Message]),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatResolver],
  exports: [ChatService],
})
export class ChatModule {}
