import { BaseEvent } from './base.event';

/**
 * Deposit detected event
 */
export interface DepositDetectedEvent extends BaseEvent {
  userId: string;
  asset: string;
  amount: string;
  txHash: string;
  confirmations: number;
  requiredConfirmations: number;
  network: string;
}

/**
 * Deposit confirmed event
 */
export interface DepositConfirmedEvent extends BaseEvent {
  userId: string;
  asset: string;
  amount: string;
  txHash: string;
  confirmations: number;
  network: string;
}

/**
 * Withdrawal requested event
 */
export interface WithdrawalRequestedEvent extends BaseEvent {
  withdrawalId: string;
  userId: string;
  asset: string;
  amount: string;
  fee: string;
  address: string;
  network: string;
  memo?: string;
}

/**
 * Withdrawal approved event
 */
export interface WithdrawalApprovedEvent extends BaseEvent {
  withdrawalId: string;
  userId: string;
  asset: string;
  amount: string;
  address: string;
  network: string;
  approvedBy: string;
  approvedAt: Date;
}

/**
 * Withdrawal rejected event
 */
export interface WithdrawalRejectedEvent extends BaseEvent {
  withdrawalId: string;
  userId: string;
  asset: string;
  amount: string;
  reason: string;
  rejectedBy: string;
}

/**
 * Withdrawal completed event
 */
export interface WithdrawalCompletedEvent extends BaseEvent {
  withdrawalId: string;
  userId: string;
  asset: string;
  amount: string;
  txHash: string;
  network: string;
  completedAt: Date;
}

/**
 * Withdrawal failed event
 */
export interface WithdrawalFailedEvent extends BaseEvent {
  withdrawalId: string;
  userId: string;
  asset: string;
  amount: string;
  reason: string;
  failedAt: Date;
}

/**
 * Balance updated event
 */
export interface BalanceUpdatedEvent extends BaseEvent {
  userId: string;
  asset: string;
  balance: string;
  locked: string;
  available: string;
  reason: string;
  referenceId?: string;
}

/**
 * Wallet created event
 */
export interface WalletCreatedEvent extends BaseEvent {
  userId: string;
  asset: string;
  address?: string;
  network?: string;
}

/**
 * Transfer between users event
 */
export interface InternalTransferEvent extends BaseEvent {
  transferId: string;
  fromUserId: string;
  toUserId: string;
  asset: string;
  amount: string;
  fee: string;
  note?: string;
}
