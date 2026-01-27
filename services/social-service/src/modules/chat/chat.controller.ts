import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateConversationDto, SendMessageDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { PaginationDto } from '../../common/dto';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  createConversation(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createConversation(userId, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get user conversations' })
  getConversations(
    @CurrentUser('userId') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.chatService.getUserConversations(userId, pagination);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiParam({ name: 'id' })
  getConversation(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.chatService.getConversation(id, userId);
  }

  @Put('conversations/:id')
  @ApiOperation({ summary: 'Update conversation' })
  @ApiParam({ name: 'id' })
  updateConversation(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() updates: { name?: string; description?: string; avatarUrl?: string },
  ) {
    return this.chatService.updateConversation(id, userId, updates);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiParam({ name: 'id' })
  sendMessage(
    @Param('id') conversationId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(conversationId, userId, dto);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get conversation messages' })
  @ApiParam({ name: 'id' })
  getMessages(
    @Param('id') conversationId: string,
    @CurrentUser('userId') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.chatService.getMessages(conversationId, userId, pagination);
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  @ApiParam({ name: 'id' })
  markAsRead(
    @Param('id') conversationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.chatService.markAsRead(conversationId, userId);
  }

  @Post('conversations/:id/participants')
  @ApiOperation({ summary: 'Add participants to group conversation' })
  @ApiParam({ name: 'id' })
  addParticipants(
    @Param('id') conversationId: string,
    @CurrentUser('userId') userId: string,
    @Body('participantIds') participantIds: string[],
  ) {
    return this.chatService.addParticipants(conversationId, userId, participantIds);
  }

  @Delete('conversations/:id/participants/:participantId')
  @ApiOperation({ summary: 'Remove participant from group conversation' })
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'participantId' })
  removeParticipant(
    @Param('id') conversationId: string,
    @Param('participantId') participantId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.chatService.removeParticipant(conversationId, userId, participantId);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'id' })
  deleteMessage(
    @Param('id') messageId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.chatService.deleteMessage(messageId, userId);
  }

  @Put('messages/:id')
  @ApiOperation({ summary: 'Edit a message' })
  @ApiParam({ name: 'id' })
  editMessage(
    @Param('id') messageId: string,
    @CurrentUser('userId') userId: string,
    @Body('content') content: string,
  ) {
    return this.chatService.editMessage(messageId, userId, content);
  }
}
