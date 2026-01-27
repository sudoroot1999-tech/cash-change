import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from '../services/chat.service';
import { SendMessageDto } from '../dto/send-message.dto';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/p2p-chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  constructor(
    private chatService: ChatService,
  ) {}

  handleConnection(client: AuthenticatedSocket) {
    console.log(`Client connected: ${client.id}`);

    // Extract userId from auth token (you should implement proper JWT validation)
    const token = client.handshake.auth.token || client.handshake.headers.authorization;

    if (token) {
      // Decode token and get userId
      // For now, we'll just accept the userId from client (in production, validate JWT)
      const userId = client.handshake.auth.userId;
      if (userId) {
        client.userId = userId;
        this.userSockets.set(userId, client.id);
      }
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    console.log(`Client disconnected: ${client.id}`);

    if (client.userId) {
      this.userSockets.delete(client.userId);
    }
  }

  @SubscribeMessage('join_trade')
  async handleJoinTrade(
    @MessageBody() data: { tradeId: string; userId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    client.join(`trade:${data.tradeId}`);
    console.log(`User ${data.userId} joined trade room: ${data.tradeId}`);

    // Send trade history
    const messages = await this.chatService.getTradeMessages(data.tradeId, data.userId);
    client.emit('trade_messages', messages);

    // Mark messages as read
    await this.chatService.markMessagesAsRead(data.tradeId, data.userId);
  }

  @SubscribeMessage('leave_trade')
  handleLeaveTrade(
    @MessageBody() data: { tradeId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`trade:${data.tradeId}`);
    console.log(`Client left trade room: ${data.tradeId}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: { tradeId: string; userId: string; message: SendMessageDto },
  ) {
    try {
      const message = await this.chatService.sendMessage(
        data.tradeId,
        data.userId,
        data.message,
      );

      // Emit to trade room
      this.server.to(`trade:${data.tradeId}`).emit('new_message', message);

      // Send push notification to other party if not online
      // This would be determined by checking if they're in the room
      // For simplicity, we'll always send notification
      // await this.notificationService.notifyNewMessage(data.tradeId, recipientId, data.userId);

      return { success: true, message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { tradeId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`trade:${data.tradeId}`).emit('user_typing', { userId: data.userId });
  }

  @SubscribeMessage('stop_typing')
  handleStopTyping(
    @MessageBody() data: { tradeId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`trade:${data.tradeId}`).emit('user_stop_typing', { userId: data.userId });
  }

  // Send message to specific user
  sendToUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  // Send message to trade room
  sendToTrade(tradeId: string, event: string, data: any) {
    this.server.to(`trade:${tradeId}`).emit(event, data);
  }
}
