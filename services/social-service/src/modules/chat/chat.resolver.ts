import { Resolver, Query, Mutation, Args, ID, Int, Subscription } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { ChatService } from './chat.service';
import { Conversation, Message } from '../../database/entities';
import { CreateConversationDto, SendMessageDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { PaginationMeta } from '../../common/dto';
import { ObjectType, Field } from '@nestjs/graphql';

const pubSub = new PubSub();

@ObjectType()
class PaginatedConversations {
  @Field(() => [Conversation])
  items: Conversation[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}

@ObjectType()
class PaginatedMessages {
  @Field(() => [Message])
  items: Message[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}

@Resolver(() => Conversation)
export class ChatResolver {
  constructor(private readonly chatService: ChatService) {}

  @Query(() => PaginatedConversations, { name: 'conversations' })
  @UseGuards(JwtAuthGuard)
  getConversations(
    @CurrentUser('userId') userId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.chatService.getUserConversations(userId, { page, limit });
  }

  @Query(() => Conversation, { name: 'conversation' })
  @UseGuards(JwtAuthGuard)
  getConversation(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.chatService.getConversation(id, userId);
  }

  @Query(() => PaginatedMessages, { name: 'messages' })
  @UseGuards(JwtAuthGuard)
  getMessages(
    @Args('conversationId', { type: () => ID }) conversationId: string,
    @CurrentUser('userId') userId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 50 }) limit: number,
  ) {
    return this.chatService.getMessages(conversationId, userId, { page, limit });
  }

  @Mutation(() => Conversation)
  @UseGuards(JwtAuthGuard)
  createConversation(
    @CurrentUser('userId') userId: string,
    @Args('input') input: CreateConversationDto,
  ) {
    return this.chatService.createConversation(userId, input);
  }

  @Mutation(() => Message)
  @UseGuards(JwtAuthGuard)
  async sendMessage(
    @Args('conversationId', { type: () => ID }) conversationId: string,
    @CurrentUser('userId') userId: string,
    @Args('input') input: SendMessageDto,
  ) {
    const message = await this.chatService.sendMessage(conversationId, userId, input);
    pubSub.publish(`newMessage.${conversationId}`, { newMessage: message });
    return message;
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  markConversationAsRead(
    @Args('conversationId', { type: () => ID }) conversationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.chatService.markAsRead(conversationId, userId).then(() => true);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  deleteMessage(
    @Args('messageId', { type: () => ID }) messageId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.chatService.deleteMessage(messageId, userId).then(() => true);
  }

  @Mutation(() => Message)
  @UseGuards(JwtAuthGuard)
  editMessage(
    @Args('messageId', { type: () => ID }) messageId: string,
    @CurrentUser('userId') userId: string,
    @Args('content') content: string,
  ) {
    return this.chatService.editMessage(messageId, userId, content);
  }

  @Mutation(() => Conversation)
  @UseGuards(JwtAuthGuard)
  addParticipants(
    @Args('conversationId', { type: () => ID }) conversationId: string,
    @CurrentUser('userId') userId: string,
    @Args('participantIds', { type: () => [String] }) participantIds: string[],
  ) {
    return this.chatService.addParticipants(conversationId, userId, participantIds);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  removeParticipant(
    @Args('conversationId', { type: () => ID }) conversationId: string,
    @CurrentUser('userId') userId: string,
    @Args('participantId', { type: () => ID }) participantId: string,
  ) {
    return this.chatService.removeParticipant(conversationId, userId, participantId).then(() => true);
  }

  @Subscription(() => Message, {
    name: 'newMessage',
    filter: (payload, variables) => payload.newMessage.conversationId === variables.conversationId,
  })
  subscribeToMessages(@Args('conversationId', { type: () => ID }) conversationId: string) {
    return pubSub.asyncIterator(`newMessage.${conversationId}`);
  }
}
