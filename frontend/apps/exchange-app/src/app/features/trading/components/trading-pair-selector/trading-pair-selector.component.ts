import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CryptoPriceComponent } from '@/core-components/crypto-price/crypto-price.component';

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
  selector: 'app-trading-pair-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, CryptoPriceComponent],
  template: `
    <div class="pair-selector">
      <button class="selected-pair" (click)="toggleDropdown()">
        <div class="pair-icon">{{ selectedPair().baseAsset.charAt(0) }}</div>
        <span class="pair-name">{{ selectedPair().baseAsset }}/{{ selectedPair().quoteAsset }}</span>
        <svg class="dropdown-arrow" [class.open]="isOpen()" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
      </button>

      @if (isOpen()) {
        <div class="dropdown-panel">
          <div class="search-box">
            <svg class="search-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
            </svg>
            <input 
              type="text" 
              class="search-input"
              placeholder="Search pairs..."
              [(ngModel)]="searchQuery"
            />
          </div>

          <div class="pair-tabs">
            @for (tab of tabs; track tab) {
              <button 
                class="tab-btn" 
                [class.active]="activeTab() === tab"
                (click)="activeTab.set(tab)"
              >
                {{ tab }}
              </button>
            }
          </div>

          <div class="pairs-list">
            @for (pair of filteredPairs(); track pair.symbol) {
              <button 
                class="pair-item"
                [class.selected]="pair.symbol === selectedPair().symbol"
                (click)="selectPair(pair)"
              >
                <div class="pair-info">
                  <div class="pair-icon-small">{{ pair.baseAsset.charAt(0) }}</div>
                  <div class="pair-details">
                    <span class="pair-symbol">{{ pair.baseAsset }}/{{ pair.quoteAsset }}</span>
                    <span class="pair-volume">Vol: {{ formatVolume(pair.volume24h) }}</span>
                  </div>
                </div>
                <div class="pair-price-info">
                  <span class="pair-price">{{ pair.price | number:'1.2-2' }}</span>
                  <span 
                    class="pair-change"
                    [class.positive]="pair.change24h >= 0"
                    [class.negative]="pair.change24h < 0"
                  >
                    {{ pair.change24h >= 0 ? '+' : '' }}{{ pair.change24h | number:'1.2-2' }}%
                  </span>
                </div>
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .pair-selector {
      position: relative;
    }

    .selected-pair {
      display: flex;
      align-items: center;
      gap: var(--spacing-2);
      padding: var(--spacing-2) var(--spacing-3);
      background: var(--color-bg-card);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .selected-pair:hover {
      background: var(--color-bg-card-hover);
      border-color: var(--color-border-secondary);
    }

    .pair-icon {
      width: 28px;
      height: 28px;
      background: #F7931A;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      color: white;
    }

    .pair-name {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
    }

    .dropdown-arrow {
      width: 16px;
      height: 16px;
      color: var(--color-text-tertiary);
      transition: transform var(--transition-fast);
    }

    .dropdown-arrow.open {
      transform: rotate(180deg);
    }

    .dropdown-panel {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      width: 340px;
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      z-index: var(--z-dropdown);
      overflow: hidden;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: var(--spacing-2);
      padding: var(--spacing-3);
      border-bottom: 1px solid var(--color-border-primary);
    }

    .search-icon {
      width: 16px;
      height: 16px;
      color: var(--color-text-tertiary);
    }

    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--color-text-primary);
      font-size: var(--font-size-sm);
      outline: none;
    }

    .search-input::placeholder {
      color: var(--color-text-muted);
    }

    .pair-tabs {
      display: flex;
      gap: var(--spacing-1);
      padding: var(--spacing-2) var(--spacing-3);
      border-bottom: 1px solid var(--color-border-primary);
    }

    .tab-btn {
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

    .tab-btn:hover {
      color: var(--color-text-secondary);
    }

    .tab-btn.active {
      color: var(--color-text-primary);
      background: var(--color-bg-tertiary);
    }

    .pairs-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .pair-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding: var(--spacing-2) var(--spacing-3);
      background: transparent;
      border: none;
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .pair-item:hover {
      background: var(--color-bg-card);
    }

    .pair-item.selected {
      background: var(--color-bg-tertiary);
    }

    .pair-info {
      display: flex;
      align-items: center;
      gap: var(--spacing-2);
    }

    .pair-icon-small {
      width: 24px;
      height: 24px;
      background: #F7931A;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: var(--font-weight-bold);
      color: white;
    }

    .pair-details {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .pair-symbol {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }

    .pair-volume {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }

    .pair-price-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .pair-price {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
      font-family: var(--font-family-mono);
    }

    .pair-change {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
    }

    .pair-change.positive {
      color: var(--color-success);
    }

    .pair-change.negative {
      color: var(--color-danger);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TradingPairSelectorComponent {
  selectedPair = input.required<TradingPair>();
  pairChange = output<TradingPair>();

  isOpen = signal(false);
  activeTab = signal('USDT');
  searchQuery = '';

  tabs = ['USDT', 'BTC', 'ETH', 'Favorites'];

  // Mock pairs - would come from API
  pairs: TradingPair[] = [
    { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', price: 43256.78, change24h: 2.34, high24h: 44120, low24h: 42180, volume24h: 1234567890 },
    { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', price: 2256.45, change24h: -1.23, high24h: 2320, low24h: 2180, volume24h: 987654321 },
    { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT', price: 98.76, change24h: 5.67, high24h: 102, low24h: 92, volume24h: 456789123 },
    { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT', price: 312.45, change24h: 0.89, high24h: 318, low24h: 305, volume24h: 234567891 },
    { symbol: 'XRPUSDT', baseAsset: 'XRP', quoteAsset: 'USDT', price: 0.5678, change24h: -2.45, high24h: 0.59, low24h: 0.55, volume24h: 345678912 },
    { symbol: 'ADAUSDT', baseAsset: 'ADA', quoteAsset: 'USDT', price: 0.4523, change24h: 3.21, high24h: 0.47, low24h: 0.43, volume24h: 123456789 },
  ];

  filteredPairs = signal(this.pairs);

  toggleDropdown(): void {
    this.isOpen.update(v => !v);
  }

  selectPair(pair: TradingPair): void {
    this.pairChange.emit(pair);
    this.isOpen.set(false);
  }

  formatVolume(volume: number): string {
    if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(2)}B`;
    if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`;
    if (volume >= 1_000) return `${(volume / 1_000).toFixed(2)}K`;
    return volume.toString();
  }
}
