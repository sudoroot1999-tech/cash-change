import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { OrderBookComponent } from '../../components/order-book/order-book.component';
import { TradeFormComponent } from '../../components/trade-form/trade-form.component';
import { TradingPairSelectorComponent } from '../../components/trading-pair-selector/trading-pair-selector.component';
import { RecentTradesComponent } from '../../components/recent-trades/recent-trades.component';

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
    InputComponent,
    BadgeComponent,
    SkeletonComponent,
    OrderBookComponent,
    TradeFormComponent,
    TradingPairSelectorComponent,
    RecentTradesComponent
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
          <div class="stat-item primary">
            <span class="stat-label">Last Price</span>
            <span class="stat-value" [class.positive]="selectedPair().change24h >= 0" [class.negative]="selectedPair().change24h < 0">
              {{ selectedPair().price | number:'1.2-2' }}
              <span class="change-badge">{{ selectedPair().change24h >= 0 ? '+' : '' }}{{ selectedPair().change24h | number:'1.2-2' }}%</span>
            </span>
          </div>
          
          <div class="stat-item">
            <span class="stat-label">24h High</span>
            <span class="stat-value">{{ selectedPair().high24h | number:'1.2-2' }}</span>
          </div>
          
          <div class="stat-item">
            <span class="stat-label">24h Low</span>
            <span class="stat-value">{{ selectedPair().low24h | number:'1.2-2' }}</span>
          </div>
          
          <div class="stat-item">
            <span class="stat-label">24h Volume</span>
            <span class="stat-value">{{ formatVolume(selectedPair().volume24h) }}</span>
          </div>
        </div>
      </div>

      <!-- Main Trading Grid -->
      <div class="trading-grid">
        <!-- Chart Area -->
        <div class="chart-area">
          <ui-card variant="elevated" [noPadding]="true">
            <div class="chart-placeholder">
              <div class="chart-toolbar">
                <div class="timeframe-selector">
                  @for (tf of timeframes; track tf) {
                    <button 
                      class="timeframe-btn" 
                      [class.active]="tf === selectedTimeframe()"
                      (click)="selectTimeframe(tf)"
                    >
                      {{ tf }}
                    </button>
                  }
                </div>
                <div class="chart-tools">
                  <button class="tool-btn">📊 Indicators</button>
                  <button class="tool-btn">📏 Drawing</button>
                </div>
              </div>
              <div class="chart-canvas">
                <!-- TradingView or custom chart will go here -->
                <div class="chart-loading">
                  <span>Chart Loading...</span>
                  <span class="chart-hint">TradingView integration pending</span>
                </div>
              </div>
            </div>
          </ui-card>
        </div>

        <!-- Order Book -->
        <div class="orderbook-area">
          <app-order-book [pair]="selectedPair().symbol" />
        </div>

        <!-- Trade Form -->
        <div class="trade-form-area">
          <app-trade-form 
            [pair]="selectedPair()"
            (orderSubmit)="onOrderSubmit($event)"
          />
        </div>

        <!-- Recent Trades -->
        <div class="recent-trades-area">
          <app-recent-trades [pair]="selectedPair().symbol" />
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
              Open Orders (3)
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
                  <tr>
                    <td>2024-01-15 14:32</td>
                    <td>BTC/USDT</td>
                    <td>Limit</td>
                    <td class="text-success">Buy</td>
                    <td>42,500.00</td>
                    <td>0.5 BTC</td>
                    <td>0%</td>
                    <td><button class="cancel-btn">Cancel</button></td>
                  </tr>
                </tbody>
              </table>
            }
          </div>
        </ui-card>
      </div>
    </div>
  `,
  styles: [`
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
    }

    .stat-value.positive {
      color: var(--color-success);
    }

    .stat-value.negative {
      color: var(--color-danger);
    }

    .change-badge {
      font-size: var(--font-size-sm);
      margin-left: var(--spacing-2);
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

    .chart-placeholder {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .chart-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-2) var(--spacing-3);
      border-bottom: 1px solid var(--color-border-primary);
    }

    .timeframe-selector {
      display: flex;
      gap: var(--spacing-1);
    }

    .timeframe-btn {
      padding: var(--spacing-1) var(--spacing-2);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-tertiary);
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .timeframe-btn:hover {
      color: var(--color-text-secondary);
      background: var(--color-bg-card);
    }

    .timeframe-btn.active {
      color: var(--color-text-primary);
      background: var(--color-bg-tertiary);
    }

    .chart-tools {
      display: flex;
      gap: var(--spacing-2);
    }

    .tool-btn {
      padding: var(--spacing-1) var(--spacing-2);
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      background: var(--color-bg-card);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    .chart-canvas {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .chart-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-2);
      color: var(--color-text-tertiary);
    }

    .chart-hint {
      font-size: var(--font-size-xs);
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpotTradingComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  selectedPair = signal<TradingPair>({
    symbol: 'BTCUSDT',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    price: 43256.78,
    change24h: 2.34,
    high24h: 44120.00,
    low24h: 42180.50,
    volume24h: 1234567890
  });

  selectedTimeframe = signal('1H');
  ordersTab = signal<'open' | 'history' | 'trades'>('open');

  timeframes = ['1m', '5m', '15m', '1H', '4H', '1D', '1W'];

  ngOnInit(): void {
    const pair = this.route.snapshot.paramMap.get('pair');
    if (pair) {
      // Load pair data
      console.log('Loading pair:', pair);
    }
  }

  onPairChange(pair: TradingPair): void {
    this.selectedPair.set(pair);
  }

  selectTimeframe(tf: string): void {
    this.selectedTimeframe.set(tf);
  }

  onOrderSubmit(order: any): void {
    console.log('Order submitted:', order);
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
    return volume.toString();
  }
}
