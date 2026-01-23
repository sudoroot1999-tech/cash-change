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
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/wallet',
})
export class WalletGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WalletGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Remove from user sockets
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const { userId } = data;
    
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    
    this.userSockets.get(userId).add(client.id);
    client.join(`user:${userId}`);
    
    this.logger.log(`User ${userId} subscribed with socket ${client.id}`);
    client.emit('subscribed', { userId });
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const { userId } = data;
    const sockets = this.userSockets.get(userId);
    
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    
    client.leave(`user:${userId}`);
    this.logger.log(`User ${userId} unsubscribed socket ${client.id}`);
  }

  /**
   * Send balance update to user
   */
  sendBalanceUpdate(
    userId: string,
    data: {
      currency: string;
      balance: string;
      lockedBalance: string;
      availableBalance: string;
    },
  ): void {
    this.server.to(`user:${userId}`).emit('balance:update', data);
    this.logger.debug(`Balance update sent to user ${userId}`);
  }

  /**
   * Send transaction notification
   */
  sendTransactionNotification(
    userId: string,
    data: {
      type: string;
      amount: string;
      currency: string;
      status: string;
      txHash?: string;
    },
  ): void {
    this.server.to(`user:${userId}`).emit('transaction:new', data);
    this.logger.debug(`Transaction notification sent to user ${userId}`);
  }

  /**
   * Send deposit notification
   */
  sendDepositNotification(
    userId: string,
    data: {
      amount: string;
      currency: string;
      txHash: string;
      confirmations: number;
      requiredConfirmations: number;
    },
  ): void {
    this.server.to(`user:${userId}`).emit('deposit:detected', data);
    this.logger.log(`Deposit notification sent to user ${userId}`);
  }

  /**
   * Send deposit confirmation update
   */
  sendDepositConfirmationUpdate(
    userId: string,
    data: {
      txHash: string;
      confirmations: number;
      requiredConfirmations: number;
      confirmed: boolean;
    },
  ): void {
    this.server.to(`user:${userId}`).emit('deposit:confirmation', data);
    this.logger.debug(`Deposit confirmation update sent to user ${userId}`);
  }

  /**
   * Send withdrawal status update
   */
  sendWithdrawalUpdate(
    userId: string,
    data: {
      withdrawalId: string;
      status: string;
      txHash?: string;
    },
  ): void {
    this.server.to(`user:${userId}`).emit('withdrawal:update', data);
    this.logger.log(`Withdrawal update sent to user ${userId}`);
  }

  /**
   * Send internal transfer notification
   */
  sendInternalTransferNotification(
    userId: string,
    data: {
      type: 'sent' | 'received';
      amount: string;
      currency: string;
      fromUserId?: string;
      toUserId?: string;
    },
  ): void {
    this.server.to(`user:${userId}`).emit('transfer:internal', data);
    this.logger.log(`Internal transfer notification sent to user ${userId}`);
  }

  /**
   * Send security alert
   */
  sendSecurityAlert(
    userId: string,
    data: {
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      action: string;
    },
  ): void {
    this.server.to(`user:${userId}`).emit('security:alert', data);
    this.logger.warn(`Security alert sent to user ${userId}: ${data.message}`);
  }

  /**
   * Broadcast system announcement
   */
  broadcastSystemAnnouncement(message: string): void {
    this.server.emit('system:announcement', { message, timestamp: new Date() });
    this.logger.log(`System announcement broadcast: ${message}`);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }
}
