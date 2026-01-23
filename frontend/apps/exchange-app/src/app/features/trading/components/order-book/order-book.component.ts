import { Component, ChangeDetectionStrategy, input, signal, computed, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MarketDataService } from '../../../../core/services/market-data.service';
import { OrderBook, OrderBookLevel } from '../../../../core/services/websocket.service';

@Component({
  selector: 'app-order-book',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: `./order-book.component.html`,
  styleUrls: ['./order-book.component.css'],
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
