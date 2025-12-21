import { Component, ChangeDetectionStrategy, input, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  depth: number; // 0-100 for depth visualization
}

@Component({
  selector: 'app-order-book',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="orderbook">
      <div class="orderbook-header">
        <span class="orderbook-title">Order Book</span>
        <div class="orderbook-controls">
          <button 
            class="view-btn" 
            [class.active]="viewMode() === 'both'"
            (click)="viewMode.set('both')"
            title="Both"
          >
            <svg viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="2" width="12" height="5" rx="1"/>
              <rect x="2" y="9" width="12" height="5" rx="1"/>
            </svg>
          </button>
          <button 
            class="view-btn" 
            [class.active]="viewMode() === 'bids'"
            (click)="viewMode.set('bids')"
            title="Bids only"
          >
            <svg viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="2" width="12" height="12" rx="1" fill="var(--color-success)"/>
            </svg>
          </button>
          <button 
            class="view-btn" 
            [class.active]="viewMode() === 'asks'"
            (click)="viewMode.set('asks')"
            title="Asks only"
          >
            <svg viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="2" width="12" height="12" rx="1" fill="var(--color-danger)"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="orderbook-columns">
        <span>Price (USDT)</span>
        <span>Amount (BTC)</span>
        <span>Total</span>
      </div>

      <div class="orderbook-content">
        <!-- Asks (Sell orders) - reversed so lowest is at bottom -->
        @if (viewMode() !== 'bids') {
          <div class="asks-section">
            @for (ask of asks(); track ask.price) {
              <div class="orderbook-row ask">
                <div class="depth-bar ask-bar" [style.width.%]="ask.depth"></div>
                <span class="price">{{ ask.price | number:'1.2-2' }}</span>
                <span class="amount">{{ ask.amount | number:'1.4-4' }}</span>
                <span class="total">{{ ask.total | number:'1.4-4' }}</span>
              </div>
            }
          </div>
        }

        <!-- Spread -->
        <div class="spread-row">
          <span class="spread-price">{{ lastPrice() | number:'1.2-2' }}</span>
          <span class="spread-label">Spread: {{ spread() | number:'1.2-2' }} ({{ spreadPercent() | number:'1.2-2' }}%)</span>
        </div>

        <!-- Bids (Buy orders) -->
        @if (viewMode() !== 'asks') {
          <div class="bids-section">
            @for (bid of bids(); track bid.price) {
              <div class="orderbook-row bid">
                <div class="depth-bar bid-bar" [style.width.%]="bid.depth"></div>
                <span class="price">{{ bid.price | number:'1.2-2' }}</span>
                <span class="amount">{{ bid.amount | number:'1.4-4' }}</span>
                <span class="total">{{ bid.total | number:'1.4-4' }}</span>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .orderbook {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .orderbook-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-3);
      border-bottom: 1px solid var(--color-border-primary);
    }

    .orderbook-title {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
    }

    .orderbook-controls {
      display: flex;
      gap: var(--spacing-1);
    }

    .view-btn {
      width: 24px;
      height: 24px;
      padding: 4px;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-sm);
      cursor: pointer;
      color: var(--color-text-tertiary);
    }

    .view-btn:hover {
      background: var(--color-bg-card-hover);
    }

    .view-btn.active {
      border-color: var(--color-accent-500);
      color: var(--color-accent-500);
    }

    .view-btn svg {
      width: 100%;
      height: 100%;
    }

    .orderbook-columns {
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

    .orderbook-content {
      flex: 1;
      overflow-y: auto;
      font-family: var(--font-family-mono);
    }

    .asks-section {
      display: flex;
      flex-direction: column-reverse;
    }

    .orderbook-row {
      position: relative;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: var(--spacing-2);
      padding: var(--spacing-1) var(--spacing-3);
      font-size: var(--font-size-xs);
      cursor: pointer;
    }

    .orderbook-row:hover {
      background: var(--color-bg-card-hover);
    }

    .depth-bar {
      position: absolute;
      top: 0;
      bottom: 0;
      right: 0;
      opacity: 0.15;
    }

    .ask-bar {
      background: var(--color-danger);
    }

    .bid-bar {
      background: var(--color-success);
    }

    .orderbook-row.ask .price {
      color: var(--color-danger);
    }

    .orderbook-row.bid .price {
      color: var(--color-success);
    }

    .amount, .total {
      color: var(--color-text-secondary);
      text-align: right;
    }

    .spread-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-2) var(--spacing-3);
      background: var(--color-bg-tertiary);
      border-top: 1px solid var(--color-border-primary);
      border-bottom: 1px solid var(--color-border-primary);
    }

    .spread-price {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      color: var(--color-success);
      font-family: var(--font-family-mono);
    }

    .spread-label {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderBookComponent {
  pair = input.required<string>();

  viewMode = signal<'both' | 'bids' | 'asks'>('both');

  // Mock data - would come from WebSocket in production
  asks = signal<OrderBookEntry[]>([
    { price: 43280.50, amount: 0.5234, total: 0.5234, depth: 35 },
    { price: 43275.00, amount: 1.2345, total: 1.7579, depth: 65 },
    { price: 43270.25, amount: 0.8765, total: 2.6344, depth: 45 },
    { price: 43265.00, amount: 2.1234, total: 4.7578, depth: 85 },
    { price: 43260.75, amount: 0.4321, total: 5.1899, depth: 25 },
    { price: 43258.00, amount: 1.5678, total: 6.7577, depth: 55 },
    { price: 43255.50, amount: 0.9876, total: 7.7453, depth: 40 },
  ]);

  bids = signal<OrderBookEntry[]>([
    { price: 43250.00, amount: 1.8765, total: 1.8765, depth: 70 },
    { price: 43245.25, amount: 0.6543, total: 2.5308, depth: 30 },
    { price: 43240.00, amount: 2.3456, total: 4.8764, depth: 90 },
    { price: 43235.50, amount: 0.7890, total: 5.6654, depth: 35 },
    { price: 43230.75, amount: 1.2345, total: 6.8999, depth: 50 },
    { price: 43225.00, amount: 0.5678, total: 7.4677, depth: 25 },
    { price: 43220.25, amount: 1.8901, total: 9.3578, depth: 75 },
  ]);

  lastPrice = computed(() => 43256.78);
  
  spread = computed(() => {
    const lowestAsk = this.asks()[this.asks().length - 1]?.price ?? 0;
    const highestBid = this.bids()[0]?.price ?? 0;
    return lowestAsk - highestBid;
  });

  spreadPercent = computed(() => {
    const lowestAsk = this.asks()[this.asks().length - 1]?.price ?? 0;
    return (this.spread() / lowestAsk) * 100;
  });
}
