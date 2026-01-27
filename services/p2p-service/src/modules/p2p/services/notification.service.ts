import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { P2pTrade } from '../entities/p2p-trade.entity';
import { P2pDispute } from '../entities/p2p-dispute.entity';

@Injectable()
export class NotificationService {
  private readonly notificationServiceUrl: string;

  constructor(private configService: ConfigService) {
    this.notificationServiceUrl =
      this.configService.get('NOTIFICATION_SERVICE_URL') || 'http://localhost:3009';
  }

  async notifyTradeInitiated(trade: P2pTrade): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/api/notifications/send`, {
        userId: trade.sellerId,
        type: 'p2p_trade_initiated',
        title: 'New Trade Initiated',
        message: `A buyer has initiated a trade for ${trade.cryptoAmount} ${trade.cryptoAsset}`,
        data: { tradeId: trade.id },
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async notifyPaymentMade(trade: P2pTrade): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/api/notifications/send`, {
        userId: trade.sellerId,
        type: 'p2p_payment_made',
        title: 'Payment Made',
        message: `Buyer has marked payment as made for trade ${trade.id}`,
        data: { tradeId: trade.id },
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async notifyTradeCompleted(trade: P2pTrade): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/api/notifications/send`, {
        userId: trade.buyerId,
        type: 'p2p_trade_completed',
        title: 'Trade Completed',
        message: `Your trade has been completed. ${trade.cryptoAmount} ${trade.cryptoAsset} has been released to your wallet`,
        data: { tradeId: trade.id },
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async notifyTradeCancelled(trade: P2pTrade): Promise<void> {
    const recipientId = trade.cancelledBy === trade.buyerId ? trade.sellerId : trade.buyerId;

    try {
      await axios.post(`${this.notificationServiceUrl}/api/notifications/send`, {
        userId: recipientId,
        type: 'p2p_trade_cancelled',
        title: 'Trade Cancelled',
        message: `Trade ${trade.id} has been cancelled`,
        data: { tradeId: trade.id },
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async notifyTradeExpired(trade: P2pTrade): Promise<void> {
    try {
      // Notify both parties
      await Promise.all([
        axios.post(`${this.notificationServiceUrl}/api/notifications/send`, {
          userId: trade.buyerId,
          type: 'p2p_trade_expired',
          title: 'Trade Expired',
          message: `Trade ${trade.id} has expired due to payment timeout`,
          data: { tradeId: trade.id },
        }),
        axios.post(`${this.notificationServiceUrl}/api/notifications/send`, {
          userId: trade.sellerId,
          type: 'p2p_trade_expired',
          title: 'Trade Expired',
          message: `Trade ${trade.id} has expired. Funds have been returned to your wallet`,
          data: { tradeId: trade.id },
        }),
      ]);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async notifyDisputeCreated(dispute: P2pDispute, trade: P2pTrade): Promise<void> {
    const otherPartyId = dispute.openedBy === trade.buyerId ? trade.sellerId : trade.buyerId;

    try {
      // Notify other party
      await axios.post(`${this.notificationServiceUrl}/api/notifications/send`, {
        userId: otherPartyId,
        type: 'p2p_dispute_created',
        title: 'Dispute Opened',
        message: `A dispute has been opened for trade ${trade.id}`,
        data: { tradeId: trade.id, disputeId: dispute.id },
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async notifyDisputeResolved(dispute: P2pDispute, trade: P2pTrade): Promise<void> {
    try {
      // Notify both parties
      await Promise.all([
        axios.post(`${this.notificationServiceUrl}/api/notifications/send`, {
          userId: trade.buyerId,
          type: 'p2p_dispute_resolved',
          title: 'Dispute Resolved',
          message: `The dispute for trade ${trade.id} has been resolved`,
          data: { tradeId: trade.id, disputeId: dispute.id },
        }),
        axios.post(`${this.notificationServiceUrl}/api/notifications/send`, {
          userId: trade.sellerId,
          type: 'p2p_dispute_resolved',
          title: 'Dispute Resolved',
          message: `The dispute for trade ${trade.id} has been resolved`,
          data: { tradeId: trade.id, disputeId: dispute.id },
        }),
      ]);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async notifyNewMessage(tradeId: string, recipientId: string, _senderId: string): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/api/notifications/send`, {
        userId: recipientId,
        type: 'p2p_new_message',
        title: 'New Message',
        message: `You have a new message in trade ${tradeId}`,
        data: { tradeId },
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }
}
