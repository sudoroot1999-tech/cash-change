import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChatService } from '../services/chat.service';
import { SendMessageDto } from '../dto/send-message.dto';

@ApiTags('P2P Chat')
@Controller('p2p/chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post(':tradeId/message')
  @ApiOperation({ summary: 'Send a message in trade chat' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @Param('tradeId') tradeId: string,
    @Body() dto: SendMessageDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.chatService.sendMessage(tradeId, userId, dto);
  }

  @Get(':tradeId/messages')
  @ApiOperation({ summary: 'Get trade chat messages' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async getMessages(@Param('tradeId') tradeId: string, @Req() req: any) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.chatService.getTradeMessages(tradeId, userId);
  }

  @Post(':tradeId/read')
  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markAsRead(@Param('tradeId') tradeId: string, @Req() req: any) {
    const userId = req.user?.id || req.headers['x-user-id'];
    await this.chatService.markMessagesAsRead(tradeId, userId);
    return { message: 'Messages marked as read' };
  }

  @Get(':tradeId/unread-count')
  @ApiOperation({ summary: 'Get unread message count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  async getUnreadCount(@Param('tradeId') tradeId: string, @Req() req: any) {
    const userId = req.user?.id || req.headers['x-user-id'];
    const count = await this.chatService.getUnreadCount(tradeId, userId);
    return { count };
  }
}
