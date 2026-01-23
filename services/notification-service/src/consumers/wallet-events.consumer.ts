import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  RabbitMQService,
  QUEUES,
  DepositDetectedEvent,
  DepositConfirmedEvent,
  WithdrawalRequestedEvent,
  WithdrawalApprovedEvent,
  WithdrawalCompletedEvent,
  WithdrawalRejectedEvent,
  WithdrawalFailedEvent,
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
} from '@exchange/common';
import { NotificationCoreService } from '../modules/notifications/notifications.service';


/**
 * Consumer for wallet events
 * sendNotifications notifications about deposits and withdrawals
 */
@Injectable()
export class WalletEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(WalletEventsConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly notificationService: NotificationCoreService,
  ) {}

  async onModuleInit() {
    // Subscribe to deposit events
    await this.rabbitmq.subscribe<DepositDetectedEvent>(
      QUEUES.DEPOSIT_PROCESS,
      async (event) => {
        await this.handleDepositDetected(event);
      },
    );

    await this.rabbitmq.subscribe<DepositConfirmedEvent>(
      QUEUES.DEPOSIT_CONFIRMED,
      async (event) => {
        await this.handleDepositConfirmed(event);
      },
    );

    // Subscribe to withdrawal events
    await this.rabbitmq.subscribe<WithdrawalRequestedEvent>(
      QUEUES.WITHDRAWAL_REQUEST,
      async (event) => {
        await this.handleWithdrawalRequested(event);
      },
    );

    await this.rabbitmq.subscribe<WithdrawalApprovedEvent>(
      QUEUES.WITHDRAWAL_APPROVED,
      async (event) => {
        await this.handleWithdrawalApproved(event);
      },
    );

    await this.rabbitmq.subscribe<WithdrawalCompletedEvent>(
      QUEUES.WITHDRAWAL_COMPLETED,
      async (event) => {
        await this.handleWithdrawalCompleted(event);
      },
    );

    await this.rabbitmq.subscribe<WithdrawalRejectedEvent>(
      QUEUES.WITHDRAWAL_REJECTED,
      async (event) => {
        await this.handleWithdrawalRejected(event);
      },
    );

    await this.rabbitmq.subscribe<WithdrawalFailedEvent>(
      QUEUES.WITHDRAWAL_FAILED,
      async (event) => {
        await this.handleWithdrawalFailed(event);
      },
    );

    this.logger.log('✅ Wallet event consumers started');
  }

  /**
   * Handle deposit detected event
   */
  private async handleDepositDetected(event: DepositDetectedEvent): Promise<void> {
    try {
      this.logger.log(`Deposit detected: ${event.amount} ${event.asset} for user ${event.userId}`);

      await this.notificationService.sendNotification({
        userId: event.userId,
        type: NOTIFICATION_TYPES.INFO,
        channels: [NOTIFICATION_CHANNELS.PUSH],
        subject: 'Deposit Detected',
        content: `We've detected your deposit of ${event.amount} ${event.asset}. Waiting for ${event.requiredConfirmations} confirmations.`,
        data: {
          asset: event.asset,
          amount: event.amount,
          txHash: event.txHash,
          confirmations: event.confirmations,
          requiredConfirmations: event.requiredConfirmations,
          network: event.network,
        },
      });
    } catch (error) {
      this.logger.error(`Error handling DepositDetectedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Handle deposit confirmed event
   */
  private async handleDepositConfirmed(event: DepositConfirmedEvent): Promise<void> {
    try {
      this.logger.log(`Deposit confirmed: ${event.amount} ${event.asset} for user ${event.userId}`);

      await this.notificationService.sendNotification({
        userId: event.userId,
        type: NOTIFICATION_TYPES.TRANSACTIONAL,
        channels: [NOTIFICATION_CHANNELS.IN_APP,NOTIFICATION_CHANNELS.PUSH,NOTIFICATION_CHANNELS.EMAIL],
        subject: 'Deposit Confirmed',
        content: `Your deposit of ${event.amount} ${event.asset} has been confirmed and credited to your account.`,
        data: {
          asset: event.asset,
          amount: event.amount,
          txHash: event.txHash,
          confirmations: event.confirmations,
          network: event.network,
        },
      });
    } catch (error) {
      this.logger.error(`Error handling DepositConfirmedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Handle withdrawal requested event
   */
  private async handleWithdrawalRequested(event: WithdrawalRequestedEvent): Promise<void> {
    try {
      this.logger.log(`Withdrawal requested: ${event.withdrawalId}`);

      await this.notificationService.sendNotification({
        userId: event.userId,
        type: NOTIFICATION_TYPES.TRANSACTIONAL,
        channels: [NOTIFICATION_CHANNELS.IN_APP,NOTIFICATION_CHANNELS.PUSH,NOTIFICATION_CHANNELS.EMAIL],
        subject: 'Withdrawal Request Received',
        content: `Your withdrawal request for ${event.amount} ${event.asset} has been received and is being processed.`,
        data: {
          withdrawalId: event.withdrawalId,
          asset: event.asset,
          amount: event.amount,
          fee: event.fee,
          address: event.address,
          network: event.network,
        },
      });
    } catch (error) {
      this.logger.error(`Error handling WithdrawalRequestedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Handle withdrawal approved event
   */
  private async handleWithdrawalApproved(event: WithdrawalApprovedEvent): Promise<void> {
    try {
      this.logger.log(`Withdrawal approved: ${event.withdrawalId}`);

      await this.notificationService.sendNotification({
        userId: event.userId,
        type: NOTIFICATION_TYPES.TRANSACTIONAL,
        channels: [NOTIFICATION_CHANNELS.IN_APP],
        subject: 'Withdrawal Approved',
        content: `Your withdrawal of ${event.amount} ${event.asset} has been approved and will be processed shortly.`,
        data: {
          withdrawalId: event.withdrawalId,
          asset: event.asset,
          amount: event.amount,
          address: event.address,
          network: event.network,
          approvedBy: event.approvedBy,
        },
      });
    } catch (error) {
      this.logger.error(`Error handling WithdrawalApprovedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Handle withdrawal completed event
   */
  private async handleWithdrawalCompleted(event: WithdrawalCompletedEvent): Promise<void> {
    try {
      this.logger.log(`Withdrawal completed: ${event.withdrawalId}`);

      await this.notificationService.sendNotification({
        userId: event.userId,
        type: NOTIFICATION_TYPES.TRANSACTIONAL,
        channels: [NOTIFICATION_CHANNELS.IN_APP,NOTIFICATION_CHANNELS.PUSH,NOTIFICATION_CHANNELS.EMAIL],
        subject: 'Withdrawal Completed',
        content: `Your withdrawal of ${event.amount} ${event.asset} has been completed successfully.`,
        data: {
          withdrawalId: event.withdrawalId,
          asset: event.asset,
          amount: event.amount,
          txHash: event.txHash,
          network: event.network,
        },
      });
    } catch (error) {
      this.logger.error(`Error handling WithdrawalCompletedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Handle withdrawal rejected event
   */
  private async handleWithdrawalRejected(event: WithdrawalRejectedEvent): Promise<void> {
    try {
      this.logger.log(`Withdrawal rejected: ${event.withdrawalId}`);

      await this.notificationService.sendNotification({
        userId: event.userId,
        type: NOTIFICATION_TYPES.TRANSACTIONAL,
        channels: [NOTIFICATION_CHANNELS.IN_APP,NOTIFICATION_CHANNELS.PUSH,NOTIFICATION_CHANNELS.EMAIL],
        subject: 'Withdrawal Rejected',
        content: `Your withdrawal of ${event.amount} ${event.asset} has been rejected. Reason: ${event.reason}`,
        data: {
          withdrawalId: event.withdrawalId,
          asset: event.asset,
          amount: event.amount,
          reason: event.reason,
          rejectedBy: event.rejectedBy,
        },
      });
    } catch (error) {
      this.logger.error(`Error handling WithdrawalRejectedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Handle withdrawal failed event
   */
  private async handleWithdrawalFailed(event: WithdrawalFailedEvent): Promise<void> {
    try {
      this.logger.log(`Withdrawal failed: ${event.withdrawalId}`);

      await this.notificationService.sendNotification({
        userId: event.userId,
        type: NOTIFICATION_TYPES.TRANSACTIONAL,
        channels: [NOTIFICATION_CHANNELS.IN_APP,NOTIFICATION_CHANNELS.PUSH,NOTIFICATION_CHANNELS.EMAIL],
        subject: 'Withdrawal Failed',
        content: `Your withdrawal of ${event.amount} ${event.asset} has failed. Reason: ${event.reason}. Your funds have been refunded.`,
        data: {
          withdrawalId: event.withdrawalId,
          asset: event.asset,
          amount: event.amount,
          reason: event.reason,
        },
      });
    } catch (error) {
      this.logger.error(`Error handling WithdrawalFailedEvent: ${(error as Error).message}`);
    }
  }
}
