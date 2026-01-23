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
  templateUrl:'./spot-trading.component.html',
  styleUrls:['./spot-trading.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpotTradingComponent implements OnInit, OnDestroy {
  protected readonly Number = Number;
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
