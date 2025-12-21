import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';

interface Trade {
  id: string;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  time: Date;
}

@Component({
  selector: 'app-recent-trades',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  template: `
    <div class="recent-trades">
      <div class="trades-header">
        <span class="trades-title">Recent Trades</span>
      </div>

      <div class="trades-columns">
        <span>Price (USDT)</span>
        <span>Amount (BTC)</span>
        <span>Time</span>
      </div>

      <div class="trades-list">
        @for (trade of trades(); track trade.id) {
          <div class="trade-row" [class.buy]="trade.side === 'buy'" [class.sell]="trade.side === 'sell'">
            <span class="trade-price">{{ trade.price | number:'1.2-2' }}</span>
            <span class="trade-amount">{{ trade.amount | number:'1.4-4' }}</span>
            <span class="trade-time">{{ trade.time | date:'HH:mm:ss' }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .recent-trades {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .trades-header {
      padding: var(--spacing-3);
      border-bottom: 1px solid var(--color-border-primary);
    }

    .trades-title {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
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

    .trades-list {
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
    }

    .trade-row.buy .trade-price {
      color: var(--color-success);
    }

    .trade-row.sell .trade-price {
      color: var(--color-danger);
    }

    .trade-amount {
      color: var(--color-text-secondary);
      text-align: right;
    }

    .trade-time {
      color: var(--color-text-tertiary);
      text-align: right;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentTradesComponent {
  pair = input.required<string>();

  // Mock trades - would come from WebSocket
  trades = signal<Trade[]>([
    { id: '1', price: 43256.78, amount: 0.1234, side: 'buy', time: new Date() },
    { id: '2', price: 43254.50, amount: 0.0567, side: 'sell', time: new Date(Date.now() - 1000) },
    { id: '3', price: 43255.25, amount: 0.2345, side: 'buy', time: new Date(Date.now() - 2000) },
    { id: '4', price: 43253.00, amount: 0.0890, side: 'sell', time: new Date(Date.now() - 3000) },
    { id: '5', price: 43256.00, amount: 0.4567, side: 'buy', time: new Date(Date.now() - 4000) },
    { id: '6', price: 43257.50, amount: 0.0234, side: 'buy', time: new Date(Date.now() - 5000) },
    { id: '7', price: 43255.75, amount: 0.1789, side: 'sell', time: new Date(Date.now() - 6000) },
    { id: '8', price: 43254.25, amount: 0.3456, side: 'sell', time: new Date(Date.now() - 7000) },
    { id: '9', price: 43256.50, amount: 0.0678, side: 'buy', time: new Date(Date.now() - 8000) },
    { id: '10', price: 43258.00, amount: 0.1234, side: 'buy', time: new Date(Date.now() - 9000) },
  ]);
}
