import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardComponent } from '@/core-components/card/card.component';
import { InputComponent } from '@/core-components/input/input.component';
import { CryptoPriceComponent } from '@/core-components/crypto-price/crypto-price.component';
import { BadgeComponent } from '@/core-components/badge/badge.component';
import { FormsModule } from '@angular/forms';

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
}

@Component({
  selector: 'app-markets-overview',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink, CardComponent, InputComponent, CryptoPriceComponent, BadgeComponent, FormsModule],
  template: `
    <div class="markets-page">
      <div class="page-header">
        <h1 class="page-title">Markets</h1>
        <p class="page-subtitle">Explore cryptocurrency prices, market cap, and trading volume</p>
      </div>

      <!-- Market Stats -->
      <div class="market-stats">
        <ui-card variant="elevated">
          <div class="stat-grid">
            <div class="stat-item">
              <span class="stat-value">$2.34T</span>
              <span class="stat-label">Total Market Cap</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">$78.5B</span>
              <span class="stat-label">24h Trading Volume</span>
            </div>
            <div class="stat-item">
              <span class="stat-value positive">+2.34%</span>
              <span class="stat-label">BTC Dominance</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">326</span>
              <span class="stat-label">Active Markets</span>
            </div>
          </div>
        </ui-card>
      </div>

      <!-- Filters and Search -->
      <div class="filters-section">
        <div class="filter-tabs">
          @for (tab of tabs; track tab) {
            <button 
              class="filter-tab" 
              [class.active]="activeTab() === tab"
              (click)="activeTab.set(tab)"
            >
              {{ tab }}
            </button>
          }
        </div>
        
        <div class="search-container">
          <ui-input 
            type="search" 
            placeholder="Search markets..."
            prefix="🔍"
          />
        </div>
      </div>

      <!-- Markets Table -->
      <ui-card variant="elevated" [noPadding]="true">
        <div class="table-container">
          <table class="markets-table">
            <thead>
              <tr>
                <th class="sortable" (click)="sort('rank')">#</th>
                <th class="sortable" (click)="sort('name')">Name</th>
                <th class="sortable text-right" (click)="sort('price')">Price</th>
                <th class="sortable text-right" (click)="sort('change24h')">24h Change</th>
                <th class="sortable text-right" (click)="sort('volume24h')">24h Volume</th>
                <th class="sortable text-right" (click)="sort('marketCap')">Market Cap</th>
                <th class="text-right">Last 7 Days</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (market of markets(); track market.symbol; let i = $index) {
                <tr class="market-row">
                  <td class="rank">{{ i + 1 }}</td>
                  <td>
                    <div class="coin-info">
                      <div class="coin-icon" [style.background]="getCoinColor(market.symbol)">
                        {{ market.symbol.charAt(0) }}
                      </div>
                      <div class="coin-details">
                        <span class="coin-name">{{ market.name }}</span>
                        <span class="coin-symbol">{{ market.symbol }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="text-right price">{{ market.price | number:'1.2-2' }}</td>
                  <td class="text-right">
                    <span 
                      class="change"
                      [class.positive]="market.change24h >= 0"
                      [class.negative]="market.change24h < 0"
                    >
                      {{ market.change24h >= 0 ? '+' : '' }}{{ market.change24h | number:'1.2-2' }}%
                    </span>
                  </td>
                  <td class="text-right volume">{{ formatVolume(market.volume24h) }}</td>
                  <td class="text-right market-cap">{{ formatVolume(market.marketCap) }}</td>
                  <td class="text-right">
                    <div class="mini-chart" [class.up]="market.change24h >= 0">
                      <!-- Mini sparkline placeholder -->
                      <svg viewBox="0 0 100 30" class="sparkline">
                        <polyline 
                          fill="none" 
                          stroke="currentColor" 
                          stroke-width="2"
                          points="0,20 20,15 40,22 60,10 80,18 100,8"
                        />
                      </svg>
                    </div>
                  </td>
                  <td class="text-right">
                    <a [routerLink]="['/trade', market.symbol + 'USDT']" class="trade-btn">Trade</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </ui-card>
    </div>
  `,
  styles: [`
    .markets-page {
      padding: var(--spacing-6);
      max-width: 1440px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: var(--spacing-6);
    }

    .page-title {
      font-size: var(--font-size-3xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-primary);
      margin: 0 0 var(--spacing-2) 0;
    }

    .page-subtitle {
      font-size: var(--font-size-base);
      color: var(--color-text-secondary);
      margin: 0;
    }

    .market-stats {
      margin-bottom: var(--spacing-6);
    }

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--spacing-6);
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-1);
    }

    .stat-value {
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-primary);
    }

    .stat-value.positive {
      color: var(--color-success);
    }

    .stat-label {
      font-size: var(--font-size-sm);
      color: var(--color-text-tertiary);
    }

    .filters-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-4);
      gap: var(--spacing-4);
    }

    .filter-tabs {
      display: flex;
      gap: var(--spacing-1);
      background: var(--color-bg-tertiary);
      padding: 2px;
      border-radius: var(--radius-lg);
    }

    .filter-tab {
      padding: var(--spacing-2) var(--spacing-4);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-tertiary);
      background: transparent;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .filter-tab:hover {
      color: var(--color-text-secondary);
    }

    .filter-tab.active {
      color: var(--color-text-primary);
      background: var(--color-bg-elevated);
    }

    .search-container {
      width: 280px;
    }

    .table-container {
      overflow-x: auto;
    }

    .markets-table {
      width: 100%;
      border-collapse: collapse;
    }

    .markets-table th {
      padding: var(--spacing-3) var(--spacing-4);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-align: left;
      border-bottom: 1px solid var(--color-border-primary);
      background: var(--color-bg-tertiary);
    }

    .markets-table th.sortable {
      cursor: pointer;
    }

    .markets-table th.sortable:hover {
      color: var(--color-text-secondary);
    }

    .markets-table td {
      padding: var(--spacing-3) var(--spacing-4);
      border-bottom: 1px solid var(--color-border-primary);
    }

    .market-row:hover {
      background: var(--color-bg-card-hover);
    }

    .text-right {
      text-align: right;
    }

    .rank {
      color: var(--color-text-tertiary);
      font-size: var(--font-size-sm);
    }

    .coin-info {
      display: flex;
      align-items: center;
      gap: var(--spacing-3);
    }

    .coin-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      color: white;
    }

    .coin-details {
      display: flex;
      flex-direction: column;
    }

    .coin-name {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
    }

    .coin-symbol {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }

    .price {
      font-family: var(--font-family-mono);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
    }

    .change {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
    }

    .change.positive {
      color: var(--color-success);
    }

    .change.negative {
      color: var(--color-danger);
    }

    .volume, .market-cap {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    .mini-chart {
      width: 100px;
      height: 30px;
      margin-left: auto;
    }

    .sparkline {
      width: 100%;
      height: 100%;
    }

    .mini-chart.up {
      color: var(--color-success);
    }

    .mini-chart:not(.up) {
      color: var(--color-danger);
    }

    .trade-btn {
      padding: var(--spacing-1) var(--spacing-3);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-accent-400);
      background: var(--color-bg-card);
      border: 1px solid var(--color-accent-400);
      border-radius: var(--radius-md);
      text-decoration: none;
      transition: all var(--transition-fast);
    }

    .trade-btn:hover {
      background: var(--color-accent-500);
      color: white;
    }

    @media (max-width: 1024px) {
      .stat-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .markets-page {
        padding: var(--spacing-4);
      }

      .filters-section {
        flex-direction: column;
        align-items: stretch;
      }

      .search-container {
        width: 100%;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketsOverviewComponent {
  activeTab = signal('All');
  tabs = ['All', 'Spot', 'Favorites', 'Gainers', 'Losers'];

  markets = signal<MarketData[]>([
    { symbol: 'BTC', name: 'Bitcoin', price: 43256.78, change24h: 2.34, volume24h: 28500000000, marketCap: 847000000000, high24h: 44120, low24h: 42180 },
    { symbol: 'ETH', name: 'Ethereum', price: 2256.45, change24h: -1.23, volume24h: 15200000000, marketCap: 271000000000, high24h: 2320, low24h: 2180 },
    { symbol: 'BNB', name: 'BNB', price: 312.45, change24h: 0.89, volume24h: 1890000000, marketCap: 47000000000, high24h: 318, low24h: 305 },
    { symbol: 'SOL', name: 'Solana', price: 98.76, change24h: 5.67, volume24h: 3450000000, marketCap: 42000000000, high24h: 102, low24h: 92 },
    { symbol: 'XRP', name: 'XRP', price: 0.5678, change24h: -2.45, volume24h: 2340000000, marketCap: 30000000000, high24h: 0.59, low24h: 0.55 },
    { symbol: 'ADA', name: 'Cardano', price: 0.4523, change24h: 3.21, volume24h: 890000000, marketCap: 15000000000, high24h: 0.47, low24h: 0.43 },
    { symbol: 'DOGE', name: 'Dogecoin', price: 0.0823, change24h: -0.56, volume24h: 1230000000, marketCap: 11000000000, high24h: 0.085, low24h: 0.08 },
    { symbol: 'MATIC', name: 'Polygon', price: 0.7845, change24h: 4.32, volume24h: 567000000, marketCap: 7000000000, high24h: 0.82, low24h: 0.74 },
  ]);

  getCoinColor(symbol: string): string {
    const colors: Record<string, string> = {
      'BTC': '#F7931A',
      'ETH': '#627EEA',
      'BNB': '#F3BA2F',
      'SOL': '#9945FF',
      'XRP': '#23292F',
      'ADA': '#0033AD',
      'DOGE': '#C2A633',
      'MATIC': '#8247E5',
    };
    return colors[symbol] || '#6366f1';
  }

  formatVolume(volume: number): string {
    if (volume >= 1_000_000_000) return `$${(volume / 1_000_000_000).toFixed(2)}B`;
    if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(2)}M`;
    if (volume >= 1_000) return `$${(volume / 1_000).toFixed(2)}K`;
    return `$${volume}`;
  }

  sort(column: string): void {
    console.log('Sort by:', column);
  }
}
