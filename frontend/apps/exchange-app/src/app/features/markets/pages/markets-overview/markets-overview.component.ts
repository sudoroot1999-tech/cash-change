import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardComponent } from '@/components/card/card.component';
import { InputComponent } from '@/components/input/input.component';
import { CryptoPriceComponent } from '@/components/crypto-price/crypto-price.component';
import { BadgeComponent } from '@/components/badge/badge.component';
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
  imports: [
    CommonModule,
    DecimalPipe,
    RouterLink,
    CardComponent,
    InputComponent,
    CryptoPriceComponent,
    BadgeComponent,
    FormsModule,
  ],
  templateUrl: './markets-overview.component.html',
  styleUrls: ['./markets-overview.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketsOverviewComponent {
  activeTab = signal('All');
  tabs = ['All', 'Spot', 'Favorites', 'Gainers', 'Losers'];

  markets = signal<MarketData[]>([
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: 43256.78,
      change24h: 2.34,
      volume24h: 28500000000,
      marketCap: 847000000000,
      high24h: 44120,
      low24h: 42180,
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      price: 2256.45,
      change24h: -1.23,
      volume24h: 15200000000,
      marketCap: 271000000000,
      high24h: 2320,
      low24h: 2180,
    },
    {
      symbol: 'BNB',
      name: 'BNB',
      price: 312.45,
      change24h: 0.89,
      volume24h: 1890000000,
      marketCap: 47000000000,
      high24h: 318,
      low24h: 305,
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      price: 98.76,
      change24h: 5.67,
      volume24h: 3450000000,
      marketCap: 42000000000,
      high24h: 102,
      low24h: 92,
    },
    {
      symbol: 'XRP',
      name: 'XRP',
      price: 0.5678,
      change24h: -2.45,
      volume24h: 2340000000,
      marketCap: 30000000000,
      high24h: 0.59,
      low24h: 0.55,
    },
    {
      symbol: 'ADA',
      name: 'Cardano',
      price: 0.4523,
      change24h: 3.21,
      volume24h: 890000000,
      marketCap: 15000000000,
      high24h: 0.47,
      low24h: 0.43,
    },
    {
      symbol: 'DOGE',
      name: 'Dogecoin',
      price: 0.0823,
      change24h: -0.56,
      volume24h: 1230000000,
      marketCap: 11000000000,
      high24h: 0.085,
      low24h: 0.08,
    },
    {
      symbol: 'MATIC',
      name: 'Polygon',
      price: 0.7845,
      change24h: 4.32,
      volume24h: 567000000,
      marketCap: 7000000000,
      high24h: 0.82,
      low24h: 0.74,
    },
  ]);

  getCoinColor(symbol: string): string {
    const colors: Record<string, string> = {
      BTC: '#F7931A',
      ETH: '#627EEA',
      BNB: '#F3BA2F',
      SOL: '#9945FF',
      XRP: '#23292F',
      ADA: '#0033AD',
      DOGE: '#C2A633',
      MATIC: '#8247E5',
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
