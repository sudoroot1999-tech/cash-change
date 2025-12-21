import { Component, ChangeDetectionStrategy, input, inject, computed, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { MarketDataService, RecentTrade } from '../../../../core/services/market-data.service';

@Component({
  selector: 'app-recent-trades',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  template: `
    <div class="recent-trades">
      <div class="trades-header">
        <span class="trades-title">Recent Trades</span>
        <span class="trades-pair">{{ pair() }}</span>
      </div>
      
      <div class="trades-columns">
        <span>Price ({{ quoteAsset() }})</span>
        <span class="text-right">Amount ({{ baseAsset() }})</span>
        <span class="text-right">Time</span>
      </div>
      
      <div class="trades-content">
        @for (trade of displayedTrades(); track trade.id) {
          <div 
            class="trade-row animate-in" 
            [class.buy]="trade.side === 'buy'"
            [class.sell]="trade.side === 'sell'"
          >
            <span class="trade-price">{{ trade.price | number:priceFormat() }}</span>
            <span class="trade-amount">{{ trade.amount | number:'1.4-4' }}</span>
            <span class="trade-time">{{ trade.timestamp | date:'HH:mm:ss' }}</span>
          </div>
        } @empty {
          <div class="empty-state">
            <span class="empty-icon">📊</span>
            <span class="empty-text">Waiting for trades...</span>
          </div>
        }
      </div>
      
      <!-- Live indicator -->
      <div class="live-indicator">
        <span class="live-dot" [class.connected]="isConnected()"></span>
        <span class="live-text">{{ isConnected() ? 'Live' : 'Connecting...' }}</span>
      </div>
    </div>
  `,
  styles: [`
    .recent-trades {
      height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .trades-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-3);
      border-bottom: 1px solid var(--color-border-primary);
    }

    .trades-title {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
    }

    .trades-pair {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }

    .trades-columns {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: var(--spacing-2);
      padding: var(--spacing-2) var(--spacing-3);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-tertiary);
      border-bottom: 1px solid var(--color-border-primary);
    }

    .text-right {
      text-align: right;
    }

    .trades-content {
      flex: 1;
      overflow-y: auto;
      font-family: var(--font-family-mono);
    }

    .trade-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: var(--spacing-2);
      padding: var(--spacing-1) var(--spacing-3);
      font-size: var(--font-size-xs);
      transition: background var(--transition-fast);
    }

    .trade-row:hover {
      background: var(--color-bg-card-hover);
    }

    .trade-row.animate-in {
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-10px);
        background: rgba(99, 102, 241, 0.2);
      }
      to {
        opacity: 1;
        transform: translateX(0);
        background: transparent;
      }
    }

    .trade-row.buy .trade-price {
      color: var(--color-success);
    }

    .trade-row.sell .trade-price {
      color: var(--color-danger);
    }

    .trade-amount, .trade-time {
      color: var(--color-text-secondary);
      text-align: right;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-8);
      gap: var(--spacing-2);
    }

    .empty-icon {
      font-size: var(--font-size-2xl);
      opacity: 0.5;
    }

    .empty-text {
      font-size: var(--font-size-sm);
      color: var(--color-text-tertiary);
    }

    .live-indicator {
      position: absolute;
      top: var(--spacing-3);
      right: var(--spacing-3);
      display: flex;
      align-items: center;
      gap: var(--spacing-1);
      padding: 2px var(--spacing-2);
      background: var(--color-bg-tertiary);
      border-radius: var(--radius-full);
    }

    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-text-muted);
    }

    .live-dot.connected {
      background: var(--color-success);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .live-text {
      font-size: 10px;
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentTradesComponent {
  private readonly marketData = inject(MarketDataService);
  
  // Inputs
  pair = input.required<string>();
  
  // Local state
  maxTrades = signal(20);
  precision = signal(2);
  
  // Computed from market data
  readonly isConnected = computed(() => this.marketData.isConnected());
  readonly displayedTrades = computed(() => {
    return this.marketData.recentTrades().slice(0, this.maxTrades());
  });
  
  readonly baseAsset = computed(() => {
    const p = this.pair();
    if (p.endsWith('USDT')) return p.slice(0, -4);
    if (p.endsWith('BTC')) return p.slice(0, -3);
    return p;
  });
  
  readonly quoteAsset = computed(() => {
    const p = this.pair();
    if (p.endsWith('USDT')) return 'USDT';
    if (p.endsWith('BTC')) return 'BTC';
    return 'USDT';
  });
  
  priceFormat(): string {
    return `1.${this.precision()}-${this.precision()}`;
  }
}
