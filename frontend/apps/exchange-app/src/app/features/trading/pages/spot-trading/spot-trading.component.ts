import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
  OnDestroy,
  computed,
  effect,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CardComponent } from '@/components/card/card.component';
import { ButtonComponent } from '@/components/button/button.component';
import { BadgeComponent } from '@/components/badge/badge.component';
import { OrderBookComponent } from '../../components/order-book/order-book.component';
import { TradeFormComponent } from '../../components/trade-form/trade-form.component';
import { TradingPairSelectorComponent } from '../../components/trading-pair-selector/trading-pair-selector.component';
import { RecentTradesComponent } from '../../components/recent-trades/recent-trades.component';
import { TradingChartComponent } from '../../components/trading-chart/trading-chart.component';
import { MarketDataService } from '../../../../core/services/market-data.service';
import { TradingService, Order } from '../../../../core/services/trading.service';

interface TradingPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

@Component({
  selector: 'app-spot-trading',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    CardComponent,
    ButtonComponent,
    BadgeComponent,
    OrderBookComponent,
    TradeFormComponent,
    TradingPairSelectorComponent,
    RecentTradesComponent,
    TradingChartComponent,
  ],
  template: `
    <div class="trading-page">
      <!-- Top Bar: Pair Selector + Price Info -->
      <div class="trading-header">
        <app-trading-pair-selector
          [selectedPair]="selectedPair()"
          (pairChange)="onPairChange($event)"
        />

        <div class="price-stats">
          <!-- Live Price Display -->
          <div class="stat-item primary">
            <span class="stat-label">Last Price</span>
            <span
              class="stat-value"
              [class.positive]="isPriceUp()"
              [class.negative]="!isPriceUp()"
              [class.tick-up]="priceTickDirection() === 'up'"
              [class.tick-down]="priceTickDirection() === 'down'"
            >
              {{ lastPrice() | number: '1.2-2' }}
              <span class="change-badge"
                >{{ priceChange() >= 0 ? '+' : '' }}{{ priceChange() | number: '1.2-2' }}%</span
              >
            </span>
          </div>

          <div class="stat-item">
            <span class="stat-label">24h High</span>
            <span class="stat-value">{{ high24h() | number: '1.2-2' }}</span>
          </div>

          <div class="stat-item">
            <span class="stat-label">24h Low</span>
            <span class="stat-value">{{ low24h() | number: '1.2-2' }}</span>
          </div>

          <div class="stat-item">
            <span class="stat-label">24h Volume</span>
            <span class="stat-value">{{ formatVolume(volume24h()) }}</span>
          </div>

          <!-- Connection Status -->
          <div class="connection-status" [class.connected]="isConnected()">
            <span class="status-dot"></span>
            <span class="status-text">{{ isConnected() ? 'Real-time' : 'Connecting...' }}</span>
          </div>
        </div>
      </div>

      <!-- Main Trading Grid -->
      <div class="trading-grid">
        <!-- Chart Area - TradingView Lightweight Charts -->
        <div class="chart-area">
          <app-trading-chart [symbol]="currentSymbol()" [data]="candleData()" />
        </div>

        <!-- Order Book - Real-time updates -->
        <div class="orderbook-area">
          <app-order-book [pair]="currentSymbol()" />
        </div>

        <!-- Trade Form -->
        <div class="trade-form-area">
          <app-trade-form [pair]="selectedPair()" (orderSubmit)="onOrderSubmit($event)" />
        </div>

        <!-- Recent Trades - Real-time updates -->
        <div class="recent-trades-area">
          <app-recent-trades [pair]="currentSymbol()" />
        </div>
      </div>

      <!-- Bottom: Open Orders / Order History -->
      <div class="orders-section">
        <ui-card variant="elevated" title="Open Orders">
          <div class="orders-tabs">
            <button
              class="orders-tab"
              [class.active]="ordersTab() === 'open'"
              (click)="ordersTab.set('open')"
            >
              Open Orders ({{ openOrders().length }})
            </button>
            <button
              class="orders-tab"
              [class.active]="ordersTab() === 'history'"
              (click)="ordersTab.set('history')"
            >
              Order History
            </button>
            <button
              class="orders-tab"
              [class.active]="ordersTab() === 'trades'"
              (click)="ordersTab.set('trades')"
            >
              Trade History
            </button>
          </div>

          <div class="orders-content">
            @if (ordersTab() === 'open') {
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Pair</th>
                    <th>Type</th>
                    <th>Side</th>
                    <th>Price</th>
                    <th>Amount</th>
                    <th>Filled</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for (order of openOrders(); track order.id) {
                    <tr>
                      <td>{{ order.createdAt | date: 'yyyy-MM-dd HH:mm' }}</td>
                      <td>{{ currentSymbol() }}</td>
                      <td>{{ order.type | titlecase }}</td>
                      <td
                        [class.text-success]="order.side === 'buy'"
                        [class.text-danger]="order.side === 'sell'"
                      >
                        {{ order.side | titlecase }}
                      </td>
                      <td>{{ order.price ? (order.price | number: '1.2-2') : 'Market' }}</td>
                      <td>{{ order.quantity | number: '1.4-4' }} {{ baseAsset() }}</td>
                       <td>
                         {{
                           (Number(order.filledQuantity) / Number(order.quantity)) * 100
                             | number: '1.0-0'
                         }}%
                       </td>
                      <td>
                        <button class="cancel-btn" (click)="cancelOrder(order.id)">Cancel</button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="8" class="empty-state">No open orders</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        </ui-card>
      </div>
    </div>
  `,
  styles: [
    `
      .trading-page {
        display: flex;
        flex-direction: column;
        height: calc(100vh - 64px);
        background: var(--color-bg-primary);
      }

      .trading-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-6);
        padding: var(--spacing-3) var(--spacing-4);
        background: var(--color-bg-secondary);
        border-bottom: 1px solid var(--color-border-primary);
        overflow-x: auto;
      }

      .price-stats {
        display: flex;
        gap: var(--spacing-6);
        align-items: center;
      }

      .stat-item {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .stat-item.primary .stat-value {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-bold);
      }

      .stat-label {
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .stat-value {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
        font-family: var(--font-family-mono);
        transition: color 0.1s ease;
      }

      .stat-value.positive {
        color: var(--color-success);
      }

      .stat-value.negative {
        color: var(--color-danger);
      }

      /* Price tick animation */
      .stat-value.tick-up {
        animation: tickUp 0.3s ease-out;
      }

      .stat-value.tick-down {
        animation: tickDown 0.3s ease-out;
      }

      @keyframes tickUp {
        0% {
          background: rgba(34, 197, 94, 0.3);
        }
        100% {
          background: transparent;
        }
      }

      @keyframes tickDown {
        0% {
          background: rgba(239, 68, 68, 0.3);
        }
        100% {
          background: transparent;
        }
      }

      .change-badge {
        font-size: var(--font-size-sm);
        margin-left: var(--spacing-2);
      }

      .connection-status {
        display: flex;
        align-items: center;
        gap: var(--spacing-1);
        padding: var(--spacing-1) var(--spacing-2);
        background: var(--color-bg-tertiary);
        border-radius: var(--radius-full);
      }

      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--color-warning);
        animation: pulse 1.5s infinite;
      }

      .connection-status.connected .status-dot {
        background: var(--color-success);
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      .status-text {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-text-tertiary);
      }

      .trading-grid {
        flex: 1;
        display: grid;
        grid-template-columns: 1fr 280px 320px;
        grid-template-rows: 1fr auto;
        gap: 1px;
        background: var(--color-border-primary);
        min-height: 0;
      }

      .chart-area {
        grid-row: span 2;
        background: var(--color-bg-secondary);
        min-height: 400px;
      }

      .orderbook-area {
        background: var(--color-bg-secondary);
        overflow: hidden;
      }

      .trade-form-area {
        background: var(--color-bg-secondary);
      }

      .recent-trades-area {
        background: var(--color-bg-secondary);
      }

      .orders-section {
        padding: var(--spacing-4);
        background: var(--color-bg-primary);
      }

      .orders-tabs {
        display: flex;
        gap: var(--spacing-4);
        margin-bottom: var(--spacing-4);
        border-bottom: 1px solid var(--color-border-primary);
      }

      .orders-tab {
        padding: var(--spacing-2) 0;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-tertiary);
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        transition: all var(--transition-fast);
      }

      .orders-tab:hover {
        color: var(--color-text-secondary);
      }

      .orders-tab.active {
        color: var(--color-text-primary);
        border-bottom-color: var(--color-accent-500);
      }

      .cancel-btn {
        padding: var(--spacing-1) var(--spacing-2);
        font-size: var(--font-size-xs);
        color: var(--color-danger);
        background: var(--color-danger-soft);
        border: none;
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: all var(--transition-fast);
      }

      .cancel-btn:hover {
        background: var(--color-danger);
        color: white;
      }

      .empty-state {
        text-align: center;
        padding: var(--spacing-4);
        color: var(--color-text-tertiary);
      }

      .text-danger {
        color: var(--color-danger);
      }

      .text-success {
        color: var(--color-success);
      }

      @media (max-width: 1200px) {
        .trading-grid {
          grid-template-columns: 1fr 280px;
        }

        .trade-form-area {
          grid-column: span 2;
        }
      }

      @media (max-width: 768px) {
        .trading-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpotTradingComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly marketData = inject(MarketDataService);
  private readonly tradingService = inject(TradingService);

  // Local state
  ordersTab = signal<'open' | 'history' | 'trades'>('open');
  private lastPriceValue = 0;
  priceTickDirection = signal<'up' | 'down' | null>(null);
  openOrders = signal<Order[]>([]);

  // Selected pair for the trade form
  selectedPair = signal<TradingPair>({
    symbol: 'BTCUSDT',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    price: 43256.78,
    change24h: 2.34,
    high24h: 44120.0,
    low24h: 42180.5,
    volume24h: 1234567890,
  });

  // Computed from MarketDataService
  readonly currentSymbol = computed(() => this.marketData.currentSymbol());
  readonly isConnected = computed(() => this.marketData.isConnected());
  readonly candleData = computed(() => this.marketData.candleData());
  readonly isLoading = computed(() => this.marketData.isLoading());

  // Market summary data
  readonly lastPrice = computed(() => this.marketData.lastPrice());

  private priceTickEffect = effect(() => {
    const price = this.lastPrice();
    this.detectPriceTick(price);
  });

  readonly priceChange = computed(() => {
    const ticker = this.marketData.ticker();
    return ticker?.priceChangePercent ?? 0;
  });

  readonly isPriceUp = computed(() => this.marketData.isPriceUp());

  readonly high24h = computed(() => {
    const ticker = this.marketData.ticker();
    return ticker?.high24h ?? 0;
  });

  readonly low24h = computed(() => {
    const ticker = this.marketData.ticker();
    return ticker?.low24h ?? 0;
  });

  readonly volume24h = computed(() => {
    const ticker = this.marketData.ticker();
    return ticker?.volume24h ?? 0;
  });

  readonly baseAsset = computed(() => {
    const pair = this.currentSymbol();
    if (pair.endsWith('USDT')) return pair.slice(0, -4);
    if (pair.endsWith('BTC')) return pair.slice(0, -3);
    return pair;
  });

  ngOnInit(): void {
    // Get pair from route params
    const pair = this.route.snapshot.paramMap.get('pair') || 'BTCUSDT';

    // Initialize market data with the trading pair
    this.marketData.initializeSymbol(pair, '1H');

    // Update the selected pair
    const [base, quote] = this.parseSymbol(pair);
    this.selectedPair.set({
      symbol: pair,
      baseAsset: base,
      quoteAsset: quote,
      price: 0,
      change24h: 0,
      high24h: 0,
      low24h: 0,
      volume24h: 0,
    });

    // Load open orders
    this.loadOpenOrders();
  }

  private loadOpenOrders(): void {
    const symbol = this.currentSymbol();
    this.tradingService.getOpenOrders(symbol).subscribe({
      next: (orders) => {
        this.openOrders.set(orders);
      },
      error: (error) => {
        console.error('Failed to load open orders:', error);
      },
    });
  }

  ngOnDestroy(): void {
    // Cleanup is handled by MarketDataService
  }

  onPairChange(pair: TradingPair): void {
    // Update local state
    this.selectedPair.set(pair);

    // Update market data
    this.marketData.initializeSymbol(pair.symbol, '1H');

    // Update URL
    this.router.navigate(['/trade', pair.symbol], { replaceUrl: true });
  }

  onOrderSubmit(order: {
    side: 'buy' | 'sell';
    type: 'limit' | 'market';
    amount: number;
    price?: number;
  }): void {
    const symbol = this.currentSymbol();
    const orderData = {
      symbol: symbol.replace('USDT', '/USDT'), // Convert BTCUSDT to BTC/USDT format
      side: order.side,
      type: order.type,
      quantity: order.amount.toString(),
      ...(order.type === 'limit' && order.price ? { price: order.price.toString() } : {}),
    };

    this.tradingService.createOrder(orderData).subscribe({
      next: (createdOrder) => {
        console.log('Order created:', createdOrder);
        // Reload open orders
        this.loadOpenOrders();
      },
      error: (error) => {
        console.error('Failed to create order:', error);
        alert(error.error?.message || 'Failed to create order');
      },
    });
  }

  formatVolume(volume: number): string {
    if (volume >= 1_000_000_000) {
      return `${(volume / 1_000_000_000).toFixed(2)}B`;
    }
    if (volume >= 1_000_000) {
      return `${(volume / 1_000_000).toFixed(2)}M`;
    }
    if (volume >= 1_000) {
      return `${(volume / 1_000).toFixed(2)}K`;
    }
    return volume.toFixed(2);
  }

  private parseSymbol(symbol: string): [string, string] {
    const quoteAssets = ['USDT', 'USDC', 'BTC', 'ETH', 'BNB'];
    for (const quote of quoteAssets) {
      if (symbol.endsWith(quote)) {
        return [symbol.slice(0, -quote.length), quote];
      }
    }
    return [symbol, 'USDT'];
  }

  private detectPriceTick(newPrice: number): void {
    if (this.lastPriceValue !== 0 && newPrice !== this.lastPriceValue) {
      this.priceTickDirection.set(newPrice > this.lastPriceValue ? 'up' : 'down');

      // Reset tick direction after animation
      setTimeout(() => {
        this.priceTickDirection.set(null);
      }, 300);
    }
    this.lastPriceValue = newPrice;
  }

  cancelOrder(orderId: string): void {
    const symbol = this.currentSymbol().replace('USDT', '/USDT');
    this.tradingService.cancelOrder(orderId, symbol).subscribe({
      next: () => {
        console.log('Order cancelled');
        this.loadOpenOrders();
      },
      error: (error) => {
        console.error('Failed to cancel order:', error);
        alert(error.error?.message || 'Failed to cancel order');
      },
    });
  }
}
