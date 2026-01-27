import { Component, ChangeDetectionStrategy, input, inject, computed, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { MarketDataService, RecentTrade } from '@/app/core/services/market-data.service';

@Component({
  selector: 'app-recent-trades',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  templateUrl: './recent-trades.component.html',
  styleUrls: ['./recent-trades.component.css'],
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
