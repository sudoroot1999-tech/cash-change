import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, interval, combineLatest } from 'rxjs';
import { takeUntil, tap, map, switchMap, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { 
  WebSocketService, 
  TickerUpdate, 
  KlineUpdate, 
  DepthUpdate, 
  TradeUpdate,
  OrderBook
} from './websocket.service';
import { environment } from '../../../environments/environment';

export interface MarketSummary {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
}

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface RecentTrade {
  id: string;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class MarketDataService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly ws = inject(WebSocketService);
  private readonly destroy$ = new Subject<void>();
  
  // Current symbol being tracked
  private readonly _currentSymbol = signal<string>('BTCUSDT');
  private readonly _currentInterval = signal<string>('1H');
  
  // Market data signals
  private readonly _ticker = signal<TickerUpdate | null>(null);
  private readonly _orderBook = signal<OrderBook | null>(null);
  private readonly _recentTrades = signal<RecentTrade[]>([]);
  private readonly _candleData = signal<OHLCV[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  
  // Public readonly signals
  readonly currentSymbol = this._currentSymbol.asReadonly();
  readonly currentInterval = this._currentInterval.asReadonly();
  readonly ticker = this._ticker.asReadonly();
  readonly orderBook = this._orderBook.asReadonly();
  readonly recentTrades = this._recentTrades.asReadonly();
  readonly candleData = this._candleData.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isConnected = this.ws.isConnected;
  
  // Computed values
  readonly lastPrice = computed(() => this._ticker()?.price ?? 0);
  readonly priceChange = computed(() => this._ticker()?.priceChangePercent ?? 0);
  readonly isPriceUp = computed(() => (this._ticker()?.priceChange ?? 0) >= 0);
  
  // Market summary for display
  readonly marketSummary = computed<MarketSummary | null>(() => {
    const t = this._ticker();
    if (!t) return null;
    
    const symbol = this._currentSymbol();
    const [base, quote] = this.parseSymbol(symbol);
    
    return {
      symbol,
      baseAsset: base,
      quoteAsset: quote,
      price: t.price,
      priceChange24h: t.priceChange,
      priceChangePercent24h: t.priceChangePercent,
      high24h: t.high24h,
      low24h: t.low24h,
      volume24h: t.volume24h,
      quoteVolume24h: t.quoteVolume24h
    };
  });
  
  constructor() {
    // Connect WebSocket on service init
    this.ws.connect();
    
    // Subscribe to WebSocket streams
    this.setupWebSocketSubscriptions();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Initialize market data for a trading pair
   */
  async initializeSymbol(symbol: string, interval: string = '1H'): Promise<void> {
    const upperSymbol = symbol.toUpperCase();
    const prevSymbol = this._currentSymbol();
    
    // Unsubscribe from previous symbol
    if (prevSymbol !== upperSymbol) {
      this.unsubscribeFromSymbol(prevSymbol);
    }
    
    this._currentSymbol.set(upperSymbol);
    this._currentInterval.set(interval);
    this._isLoading.set(true);
    
    try {
      // Load historical data
      await this.loadHistoricalCandles(upperSymbol, interval);
      
      // Subscribe to real-time updates
      this.subscribeToSymbol(upperSymbol, interval);
      
    } catch (error) {
      console.error('Failed to initialize symbol:', error);
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * Change the candle interval
   */
  async changeInterval(interval: string): Promise<void> {
    const symbol = this._currentSymbol();
    const prevInterval = this._currentInterval();
    
    // Unsubscribe from old interval
    this.ws.unsubscribeKline(symbol, this.mapInterval(prevInterval));
    
    this._currentInterval.set(interval);
    this._isLoading.set(true);
    
    try {
      await this.loadHistoricalCandles(symbol, interval);
      this.ws.subscribeKline(symbol, this.mapInterval(interval));
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * Get multiple tickers for market overview
   */
  getMarketTickers(symbols: string[]): Observable<Map<string, TickerUpdate>> {
    symbols.forEach(s => this.ws.subscribeTicker(s));
    return this.ws.tickers$;
  }
  
  // Private methods
  
  private setupWebSocketSubscriptions(): void {
    // Handle ticker updates
    this.ws.tickers$.pipe(
      takeUntil(this.destroy$),
      map(tickers => tickers.get(this._currentSymbol()))
    ).subscribe(ticker => {
      if (ticker) {
        this._ticker.set(ticker);
      }
    });
    
    // Handle kline updates
    this.ws.klines$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(kline => {
      if (kline.symbol === this._currentSymbol()) {
        this.updateCandle(kline);
      }
    });
    
    // Handle depth updates
    this.ws.depth$.pipe(
      takeUntil(this.destroy$),
      map(depths => depths.get(this._currentSymbol()))
    ).subscribe(depth => {
      if (depth) {
        this._orderBook.set(WebSocketService.formatOrderBook(depth));
      }
    });
    
    // Handle trade updates
    this.ws.trades$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(trade => {
      if (trade.symbol === this._currentSymbol()) {
        this.addRecentTrade(trade);
      }
    });
    
    // Simulate data if WebSocket not available (dev mode)
    if (!environment.production) {
      this.startMockDataStream();
    }
  }
  
  private subscribeToSymbol(symbol: string, interval: string): void {
    this.ws.subscribeTicker(symbol);
    this.ws.subscribeKline(symbol, this.mapInterval(interval));
    this.ws.subscribeDepth(symbol);
    this.ws.subscribeTrades(symbol);
  }
  
  private unsubscribeFromSymbol(symbol: string): void {
    this.ws.unsubscribeTicker(symbol);
    this.ws.unsubscribeKline(symbol, this.mapInterval(this._currentInterval()));
    this.ws.unsubscribeDepth(symbol);
    this.ws.unsubscribeTrades(symbol);
  }
  
  private async loadHistoricalCandles(symbol: string, interval: string): Promise<void> {
    try {
      // In production, this would be an API call
      // const candles = await this.http.get<OHLCV[]>(
      //   `${environment.apiUrl}/market/klines`,
      //   { params: { symbol, interval, limit: '500' } }
      // ).toPromise();
      
      // For now, generate mock data
      const candles = this.generateMockCandles(symbol, interval, 200);
      this._candleData.set(candles);
      
    } catch (error) {
      console.error('Failed to load historical candles:', error);
      // Fall back to mock data
      const candles = this.generateMockCandles(symbol, interval, 200);
      this._candleData.set(candles);
    }
  }
  
  private updateCandle(kline: KlineUpdate): void {
    const candles = [...this._candleData()];
    const lastIndex = candles.length - 1;
    
    const newCandle: OHLCV = {
      time: kline.time,
      open: kline.open,
      high: kline.high,
      low: kline.low,
      close: kline.close,
      volume: kline.volume
    };
    
    if (lastIndex >= 0 && candles[lastIndex].time === kline.time) {
      // Update existing candle
      candles[lastIndex] = newCandle;
    } else if (kline.isClosed) {
      // Add new candle
      candles.push(newCandle);
      // Keep only last 500 candles
      if (candles.length > 500) {
        candles.shift();
      }
    }
    
    this._candleData.set(candles);
  }
  
  private addRecentTrade(trade: TradeUpdate): void {
    const trades = [...this._recentTrades()];
    
    trades.unshift({
      id: trade.id,
      price: trade.price,
      amount: trade.quantity,
      side: trade.side,
      timestamp: new Date(trade.timestamp)
    });
    
    // Keep only last 50 trades
    if (trades.length > 50) {
      trades.pop();
    }
    
    this._recentTrades.set(trades);
  }
  
  private mapInterval(interval: string): string {
    // Map UI intervals to WebSocket intervals
    const map: Record<string, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1H': '1h',
      '4H': '4h',
      '1D': '1d',
      '1W': '1w',
      '1M': '1M'
    };
    return map[interval] || '1h';
  }
  
  private parseSymbol(symbol: string): [string, string] {
    // Parse trading pair (e.g., BTCUSDT -> ['BTC', 'USDT'])
    const quoteAssets = ['USDT', 'USDC', 'BTC', 'ETH', 'BNB'];
    for (const quote of quoteAssets) {
      if (symbol.endsWith(quote)) {
        return [symbol.slice(0, -quote.length), quote];
      }
    }
    return [symbol, 'USDT'];
  }
  
  // Mock data generators for development
  
  private generateMockCandles(symbol: string, interval: string, count: number): OHLCV[] {
    const candles: OHLCV[] = [];
    const now = Date.now();
    
    const intervalMs: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1H': 60 * 60 * 1000,
      '4H': 4 * 60 * 60 * 1000,
      '1D': 24 * 60 * 60 * 1000,
      '1W': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000
    };
    
    let basePrice = this.getBasePrice(symbol);
    const volatility = basePrice * 0.02;
    
    for (let i = count; i >= 0; i--) {
      const time = Math.floor((now - i * intervalMs[interval]) / 1000);
      const change = (Math.random() - 0.48) * volatility;
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      const volume = Math.random() * 1000 + 100;
      
      candles.push({ time, open, high, low, close, volume });
      basePrice = close;
    }
    
    return candles;
  }
  
  private getBasePrice(symbol: string): number {
    const prices: Record<string, number> = {
      'BTC': 43000,
      'ETH': 2300,
      'SOL': 98,
      'BNB': 310,
      'XRP': 0.57,
      'ADA': 0.45,
      'DOGE': 0.08,
      'MATIC': 0.78
    };
    
    const [base] = this.parseSymbol(symbol);
    return prices[base] || 100;
  }
  
  private startMockDataStream(): void {
    // Simulate ticker updates every 2 seconds
    interval(2000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      const symbol = this._currentSymbol();
      const currentPrice = this.lastPrice() || this.getBasePrice(symbol);
      const change = (Math.random() - 0.5) * currentPrice * 0.001;
      const newPrice = currentPrice + change;
      
      const mockTicker: TickerUpdate = {
        symbol,
        price: newPrice,
        priceChange: newPrice - currentPrice,
        priceChangePercent: ((newPrice - currentPrice) / currentPrice) * 100,
        high24h: newPrice * 1.02,
        low24h: newPrice * 0.98,
        volume24h: Math.random() * 1000000000,
        quoteVolume24h: Math.random() * 50000000000,
        timestamp: Date.now()
      };
      
      this._ticker.set(mockTicker);
      
      // Update the last candle
      const candles = [...this._candleData()];
      if (candles.length > 0) {
        const lastCandle = { ...candles[candles.length - 1] };
        lastCandle.close = newPrice;
        lastCandle.high = Math.max(lastCandle.high, newPrice);
        lastCandle.low = Math.min(lastCandle.low, newPrice);
        candles[candles.length - 1] = lastCandle;
        this._candleData.set(candles);
      }
    });
    
    // Simulate trade updates every 500ms
    interval(500).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      const symbol = this._currentSymbol();
      const price = this.lastPrice() || this.getBasePrice(symbol);
      const variation = (Math.random() - 0.5) * price * 0.0005;
      
      const mockTrade: RecentTrade = {
        id: Math.random().toString(36).substr(2, 9),
        price: price + variation,
        amount: Math.random() * 2,
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        timestamp: new Date()
      };
      
      const trades = [mockTrade, ...this._recentTrades()].slice(0, 50);
      this._recentTrades.set(trades);
    });
    
    // Simulate order book updates every 1 second
    interval(1000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      const price = this.lastPrice() || this.getBasePrice(this._currentSymbol());
      this._orderBook.set(this.generateMockOrderBook(price));
    });
  }
  
  private generateMockOrderBook(midPrice: number): OrderBook {
    const levels = 15;
    const bids: Array<{ price: number; amount: number; total: number; depth: number }> = [];
    const asks: Array<{ price: number; amount: number; total: number; depth: number }> = [];
    
    let bidTotal = 0;
    let askTotal = 0;
    
    for (let i = 0; i < levels; i++) {
      const bidPrice = midPrice - (i + 1) * midPrice * 0.0002;
      const askPrice = midPrice + (i + 1) * midPrice * 0.0002;
      const bidAmount = Math.random() * 5 + 0.5;
      const askAmount = Math.random() * 5 + 0.5;
      
      bidTotal += bidAmount;
      askTotal += askAmount;
      
      bids.push({
        price: bidPrice,
        amount: bidAmount,
        total: bidTotal,
        depth: 0
      });
      
      asks.push({
        price: askPrice,
        amount: askAmount,
        total: askTotal,
        depth: 0
      });
    }
    
    // Calculate depth percentages
    const maxBidTotal = bidTotal;
    const maxAskTotal = askTotal;
    bids.forEach(b => b.depth = (b.total / maxBidTotal) * 100);
    asks.forEach(a => a.depth = (a.total / maxAskTotal) * 100);
    
    const spread = asks[0].price - bids[0].price;
    const spreadPercent = (spread / asks[0].price) * 100;
    
    return { bids, asks, spread, spreadPercent };
  }
}
