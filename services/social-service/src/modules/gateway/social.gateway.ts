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
  namespace: '/social',
  cors: { origin: '*', credentials: true },
})
export class SocialGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>();

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

      // Track user sockets
      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub)!.add(client.id);

      // Join user's personal room
      client.join(`user:${payload.sub}`);

      console.log(`User ${payload.sub} connected to social gateway`);
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
      }
    }
    console.log(`Client ${client.id} disconnected from social gateway`);
  }

  @SubscribeMessage('subscribe:feed')
  handleSubscribeFeed(@ConnectedSocket() client: Socket) {
    client.join('feed:global');
    return { event: 'subscribed', data: { channel: 'feed:global' } };
  }

  @SubscribeMessage('subscribe:user')
  handleSubscribeUser(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: string }) {
    client.join(`user:${data.userId}:activity`);
    return { event: 'subscribed', data: { channel: `user:${data.userId}:activity` } };
  }

  @SubscribeMessage('subscribe:post')
  handleSubscribePost(@ConnectedSocket() client: Socket, @MessageBody() data: { postId: string }) {
    client.join(`post:${data.postId}`);
    return { event: 'subscribed', data: { channel: `post:${data.postId}` } };
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(@ConnectedSocket() client: Socket, @MessageBody() data: { postId: string }) {
    client.to(`post:${data.postId}`).emit('user:typing', {
      userId: client.data.userId,
      postId: data.postId,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(@ConnectedSocket() client: Socket, @MessageBody() data: { postId: string }) {
    client.to(`post:${data.postId}`).emit('user:stopped_typing', {
      userId: client.data.userId,
      postId: data.postId,
    });
  }

  // Event handlers for broadcasting
  @OnEvent('notification.created')
  handleNotificationCreated(notification: any) {
    this.server.to(`user:${notification.userId}`).emit('notification:new', notification);
  }

  @OnEvent('post.created')
  handlePostCreated(post: any) {
    this.server.to('feed:global').emit('post:new', post);
    this.server.to(`user:${post.authorId}:activity`).emit('post:new', post);
  }

  @OnEvent('post.liked')
  handlePostLiked(data: { postId: string; userId: string; likesCount: number }) {
    this.server.to(`post:${data.postId}`).emit('post:liked', data);
  }

  @OnEvent('comment.created')
  handleCommentCreated(comment: any) {
    this.server.to(`post:${comment.postId}`).emit('comment:new', comment);
  }

  @OnEvent('follow.created')
  handleFollowCreated(data: { followerId: string; followingId: string }) {
    this.server.to(`user:${data.followingId}`).emit('follow:new', data);
  }

  // Utility methods
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }
}
