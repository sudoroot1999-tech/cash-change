import { Component, ChangeDetectionStrategy, input, signal, computed, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MarketDataService } from '../../../../core/services/market-data.service';
import { OrderBook, OrderBookLevel } from '../../../../core/services/websocket.service';

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
            <svg viewBox="0 0 16 16">
              <rect x="2" y="2" width="12" height="12" rx="1" fill="#22c55e"/>
            </svg>
          </button>
          <button 
            class="view-btn" 
            [class.active]="viewMode() === 'asks'"
            (click)="viewMode.set('asks')"
            title="Asks only"
          >
            <svg viewBox="0 0 16 16">
              <rect x="2" y="2" width="12" height="12" rx="1" fill="#ef4444"/>
            </svg>
          </button>
        </div>
        
        <!-- Precision selector -->
        <select class="precision-select" [value]="precision()" (change)="onPrecisionChange($event)">
          <option value="2">0.01</option>
          <option value="1">0.1</option>
          <option value="0">1</option>
        </select>
      </div>

      <div class="orderbook-columns">
        <span>Price ({{ quoteAsset() }})</span>
        <span class="text-right">Amount ({{ baseAsset() }})</span>
        <span class="text-right">Total</span>
      </div>

      <div class="orderbook-content">
        <!-- Asks (Sell orders) - reversed so lowest is at bottom -->
        @if (viewMode() !== 'bids') {
          <div class="asks-section">
            @for (ask of displayedAsks(); track ask.price) {
              <div class="orderbook-row ask" (click)="onPriceClick(ask.price)">
                <div class="depth-bar ask-bar" [style.width.%]="ask.depth"></div>
                <span class="price">{{ ask.price | number:priceFormat() }}</span>
                <span class="amount">{{ ask.amount | number:'1.4-4' }}</span>
                <span class="total">{{ ask.total | number:'1.4-4' }}</span>
              </div>
            }
          </div>
        }

        <!-- Spread indicator -->
        <div class="spread-row">
          <div class="spread-price" [class.up]="isPriceUp()" [class.down]="!isPriceUp()">
            <span class="price-value">{{ lastPrice() | number:priceFormat() }}</span>
            @if (isPriceUp()) {
              <svg class="price-arrow" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" transform="rotate(180 10 10)"/>
              </svg>
            } @else {
              <svg class="price-arrow" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            }
          </div>
          <span class="spread-label">
            Spread: {{ spread() | number:'1.2-2' }} ({{ spreadPercent() | number:'1.3-3' }}%)
          </span>
        </div>

        <!-- Bids (Buy orders) -->
        @if (viewMode() !== 'asks') {
          <div class="bids-section">
            @for (bid of displayedBids(); track bid.price) {
              <div class="orderbook-row bid" (click)="onPriceClick(bid.price)">
                <div class="depth-bar bid-bar" [style.width.%]="bid.depth"></div>
                <span class="price">{{ bid.price | number:priceFormat() }}</span>
                <span class="amount">{{ bid.amount | number:'1.4-4' }}</span>
                <span class="total">{{ bid.total | number:'1.4-4' }}</span>
              </div>
            }
          </div>
        }
      </div>

      <!-- Connection status -->
      @if (!isConnected()) {
        <div class="connection-status">
          <span class="status-dot disconnected"></span>
          Reconnecting...
        </div>
      }
    </div>
  `,
  styles: [`
    .orderbook {
      height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .orderbook-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-3);
      border-bottom: 1px solid var(--color-border-primary);
      gap: var(--spacing-2);
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
      transition: all var(--transition-fast);
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

    .precision-select {
      padding: var(--spacing-1) var(--spacing-2);
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      background: var(--color-bg-card);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-sm);
      cursor: pointer;
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

    .text-right {
      text-align: right;
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
      transition: background var(--transition-fast);
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
      transition: width var(--transition-fast);
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
      display: flex;
      align-items: center;
      gap: var(--spacing-1);
    }

    .price-value {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      font-family: var(--font-family-mono);
    }

    .spread-price.up .price-value,
    .spread-price.up .price-arrow {
      color: var(--color-success);
    }

    .spread-price.down .price-value,
    .spread-price.down .price-arrow {
      color: var(--color-danger);
    }

    .price-arrow {
      width: 16px;
      height: 16px;
    }

    .spread-label {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }

    .connection-status {
      position: absolute;
      bottom: var(--spacing-2);
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: var(--spacing-1);
      padding: var(--spacing-1) var(--spacing-2);
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
      background: var(--color-bg-elevated);
      border-radius: var(--radius-full);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }

    .status-dot.disconnected {
      background: var(--color-warning);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderBookComponent implements OnInit, OnDestroy {
  private readonly marketData = inject(MarketDataService);
  
  // Inputs
  pair = input.required<string>();
  
  // Local state
  viewMode = signal<'both' | 'bids' | 'asks'>('both');
  precision = signal<number>(2);
  maxRows = signal<number>(15);
  
  // Computed from market data service
  readonly orderBook = computed(() => this.marketData.orderBook());
  readonly lastPrice = computed(() => this.marketData.lastPrice());
  readonly isPriceUp = computed(() => this.marketData.isPriceUp());
  readonly isConnected = computed(() => this.marketData.isConnected());
  
  readonly displayedBids = computed(() => {
    const ob = this.orderBook();
    if (!ob) return [];
    return ob.bids.slice(0, this.maxRows());
  });
  
  readonly displayedAsks = computed(() => {
    const ob = this.orderBook();
    if (!ob) return [];
    return ob.asks.slice(0, this.maxRows());
  });
  
  readonly spread = computed(() => this.orderBook()?.spread ?? 0);
  readonly spreadPercent = computed(() => this.orderBook()?.spreadPercent ?? 0);
  
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
  
  constructor() {
    // React to pair changes
    effect(() => {
      const currentPair = this.pair();
      // Market data initialization is handled by the parent trading component
    });
  }
  
  ngOnInit(): void {
    // Component initialization
  }
  
  ngOnDestroy(): void {
    // Cleanup handled by parent component
  }
  
  onPrecisionChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.precision.set(parseInt(select.value, 10));
  }
  
  onPriceClick(price: number): void {
    // Emit price to trade form
    console.log('Price selected:', price);
    // Could use an output or a shared state service
  }
}
