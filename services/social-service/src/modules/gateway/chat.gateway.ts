import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>();
  private userConversations = new Map<string, Set<string>>();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;

      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub)!.add(client.id);

      client.join(`user:${payload.sub}`);

      // Emit online status
      this.broadcastUserStatus(payload.sub, 'online');

      console.log(`User ${payload.sub} connected to chat gateway`);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.userSockets.get(userId)?.delete(client.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
        this.broadcastUserStatus(userId, 'offline');
      }
    }
    console.log(`Client ${client.id} disconnected from chat gateway`);
  }

  @SubscribeMessage('join:conversation')
  handleJoinConversation(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    client.join(`conversation:${data.conversationId}`);
    
    if (!this.userConversations.has(client.data.userId)) {
      this.userConversations.set(client.data.userId, new Set());
    }
    this.userConversations.get(client.data.userId)!.add(data.conversationId);

    return { event: 'joined', data: { conversationId: data.conversationId } };
  }

  @SubscribeMessage('leave:conversation')
  handleLeaveConversation(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    client.leave(`conversation:${data.conversationId}`);
    this.userConversations.get(client.data.userId)?.delete(data.conversationId);
    return { event: 'left', data: { conversationId: data.conversationId } };
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    client.to(`conversation:${data.conversationId}`).emit('user:typing', {
      userId: client.data.userId,
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    client.to(`conversation:${data.conversationId}`).emit('user:stopped_typing', {
      userId: client.data.userId,
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('message:read')
  handleMessageRead(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string; messageId: string }) {
    client.to(`conversation:${data.conversationId}`).emit('message:read', {
      userId: client.data.userId,
      conversationId: data.conversationId,
      messageId: data.messageId,
    });
  }

  // Event handlers
  @OnEvent('message.sent')
  handleMessageSent(data: { conversationId: string; message: any }) {
    this.server.to(`conversation:${data.conversationId}`).emit('message:new', data.message);
  }

  @OnEvent('messages.read')
  handleMessagesRead(data: { conversationId: string; userId: string }) {
    this.server.to(`conversation:${data.conversationId}`).emit('messages:read', data);
  }

  // Utility methods
  sendToConversation(conversationId: string, event: string, data: any) {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
  }

  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  private broadcastUserStatus(userId: string, status: 'online' | 'offline') {
    const conversations = this.userConversations.get(userId);
    if (conversations) {
      conversations.forEach((convId) => {
        this.server.to(`conversation:${convId}`).emit('user:status', { userId, status });
      });
    }
  }
}
