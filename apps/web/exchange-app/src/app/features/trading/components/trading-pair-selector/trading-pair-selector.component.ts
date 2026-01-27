import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CryptoPriceComponent } from '@/components/crypto-price/crypto-price.component';

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
  templateUrl: './trading-pair-selector.component.html',
  styleUrls: ['./trading-pair-selector.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    {
      symbol: 'BTCUSDT',
      baseAsset: 'BTC',
      quoteAsset: 'USDT',
      price: 43256.78,
      change24h: 2.34,
      high24h: 44120,
      low24h: 42180,
      volume24h: 1234567890,
    },
    {
      symbol: 'ETHUSDT',
      baseAsset: 'ETH',
      quoteAsset: 'USDT',
      price: 2256.45,
      change24h: -1.23,
      high24h: 2320,
      low24h: 2180,
      volume24h: 987654321,
    },
    {
      symbol: 'SOLUSDT',
      baseAsset: 'SOL',
      quoteAsset: 'USDT',
      price: 98.76,
      change24h: 5.67,
      high24h: 102,
      low24h: 92,
      volume24h: 456789123,
    },
    {
      symbol: 'BNBUSDT',
      baseAsset: 'BNB',
      quoteAsset: 'USDT',
      price: 312.45,
      change24h: 0.89,
      high24h: 318,
      low24h: 305,
      volume24h: 234567891,
    },
    {
      symbol: 'XRPUSDT',
      baseAsset: 'XRP',
      quoteAsset: 'USDT',
      price: 0.5678,
      change24h: -2.45,
      high24h: 0.59,
      low24h: 0.55,
      volume24h: 345678912,
    },
    {
      symbol: 'ADAUSDT',
      baseAsset: 'ADA',
      quoteAsset: 'USDT',
      price: 0.4523,
      change24h: 3.21,
      high24h: 0.47,
      low24h: 0.43,
      volume24h: 123456789,
    },
  ];

  filteredPairs = signal(this.pairs);

  toggleDropdown(): void {
    this.isOpen.update((v) => !v);
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
