import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, interval, map, takeUntil, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface OHLCData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1H' | '4H' | '1D' | '1W' | '1M';

@Injectable({
  providedIn: 'root'
})
export class ChartService {
  private readonly API_URL = `${environment.apiUrl}/market`;
  private ws: WebSocket | null = null;
  private destroy$ = new Subject<void>();

  // Reactive state
  private readonly _currentSymbol = signal<string>('BTCUSDT');
  private readonly _currentTimeframe = signal<Timeframe>('1H');
  private readonly _candleData = signal<OHLCData[]>([]);
  private readonly _ticker = signal<TickerData | null>(null);
  private readonly _isConnected = signal<boolean>(false);
  private readonly _isLoading = signal<boolean>(false);

  // Public readonly signals
  readonly currentSymbol = this._currentSymbol.asReadonly();
  readonly currentTimeframe = this._currentTimeframe.asReadonly();
  readonly candleData = this._candleData.asReadonly();
  readonly ticker = this._ticker.asReadonly();
  readonly isConnected = this._isConnected.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  // Computed
  readonly lastCandle = computed(() => {
    const data = this._candleData();
    return data.length > 0 ? data[data.length - 1] : null;
  });

  readonly priceChange = computed(() => {
    const data = this._candleData();
    if (data.length < 2) return 0;
    const first = data[0].close;
    const last = data[data.length - 1].close;
    return ((last - first) / first) * 100;
  });

  constructor(private readonly http: HttpClient) {}

  /**
   * Initialize chart for a trading pair
   */
  initializeChart(symbol: string, timeframe: Timeframe = '1H'): void {
    this._currentSymbol.set(symbol);
    this._currentTimeframe.set(timeframe);
    this.loadHistoricalData(symbol, timeframe);
    this.connectWebSocket(symbol);
  }

  /**
   * Change timeframe
   */
  changeTimeframe(timeframe: Timeframe): void {
    this._currentTimeframe.set(timeframe);
    this.loadHistoricalData(this._currentSymbol(), timeframe);
  }

  /**
   * Change trading pair
   */
  changeSymbol(symbol: string): void {
    this._currentSymbol.set(symbol);
    this.loadHistoricalData(symbol, this._currentTimeframe());
    this.reconnectWebSocket(symbol);
  }

  /**
   * Load historical OHLC data
   */
  loadHistoricalData(symbol: string, timeframe: Timeframe): void {
    this._isLoading.set(true);

    // For now, generate mock data since backend isn't connected
    // In production, this would be an API call
    const mockData = this.generateMockOHLCData(symbol, timeframe, 200);
    this._candleData.set(mockData);
    this._isLoading.set(false);

    // Real API call would look like:
    // this.http.get<OHLCData[]>(`${this.API_URL}/klines`, {
    //   params: { symbol, interval: timeframe, limit: '500' }
    // }).subscribe({
    //   next: (data) => {
    //     this._candleData.set(data);
    //     this._isLoading.set(false);
    //   },
    //   error: (err) => {
    //     console.error('Failed to load chart data:', err);
    //     this._isLoading.set(false);
    //   }
    // });
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  private connectWebSocket(symbol: string): void {
    if (this.ws) {
      this.ws.close();
    }

    try {
      this.ws = new WebSocket(`${environment.wsUrl}/market/${symbol.toLowerCase()}`);

      this.ws.onopen = () => {
        this._isConnected.set(true);
        console.log('WebSocket connected for', symbol);
        
        // Subscribe to kline stream
        this.ws?.send(JSON.stringify({
          type: 'subscribe',
          channel: 'kline',
          symbol: symbol,
          interval: this._currentTimeframe()
        }));
      };

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.handleWebSocketMessage(message);
      };

      this.ws.onclose = () => {
        this._isConnected.set(false);
        console.log('WebSocket disconnected');
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this._isConnected.set(false);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      // Fall back to polling if WebSocket fails
      this.startPolling(symbol);
    }
  }

  private reconnectWebSocket(symbol: string): void {
    this.connectWebSocket(symbol);
  }

  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'kline':
        this.updateCandle(message.data);
        break;
      case 'ticker':
        this.updateTicker(message.data);
        break;
    }
  }

  private updateCandle(candle: OHLCData): void {
    const data = [...this._candleData()];
    const lastIndex = data.length - 1;

    if (lastIndex >= 0 && data[lastIndex].time === candle.time) {
      // Update existing candle
      data[lastIndex] = candle;
    } else {
      // Add new candle
      data.push(candle);
      // Keep only last 500 candles
      if (data.length > 500) {
        data.shift();
      }
    }

    this._candleData.set(data);
  }

  private updateTicker(ticker: TickerData): void {
    this._ticker.set(ticker);
  }

  /**
   * Fallback polling for real-time updates
   */
  private startPolling(symbol: string): void {
    interval(5000).pipe(
      takeUntil(this.destroy$),
      tap(() => {
        // Simulate real-time update
        this.simulateTickUpdate();
      })
    ).subscribe();
  }

  private simulateTickUpdate(): void {
    const data = [...this._candleData()];
    if (data.length === 0) return;

    const lastCandle = { ...data[data.length - 1] };
    const change = (Math.random() - 0.5) * 50;
    lastCandle.close = lastCandle.close + change;
    lastCandle.high = Math.max(lastCandle.high, lastCandle.close);
    lastCandle.low = Math.min(lastCandle.low, lastCandle.close);

    data[data.length - 1] = lastCandle;
    this._candleData.set(data);
  }

  /**
   * Generate mock OHLC data for testing
   */
  private generateMockOHLCData(symbol: string, timeframe: Timeframe, count: number): OHLCData[] {
    const data: OHLCData[] = [];
    const now = new Date();
    
    // Base price depends on symbol
    let basePrice = 43000;
    if (symbol.startsWith('ETH')) basePrice = 2300;
    else if (symbol.startsWith('SOL')) basePrice = 98;
    else if (symbol.startsWith('BNB')) basePrice = 310;

    // Timeframe in milliseconds
    const timeframeMs: Record<Timeframe, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1H': 60 * 60 * 1000,
      '4H': 4 * 60 * 60 * 1000,
      '1D': 24 * 60 * 60 * 1000,
      '1W': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000,
    };

    let price = basePrice;
    const volatility = basePrice * 0.02; // 2% volatility

    for (let i = count; i >= 0; i--) {
      const time = Math.floor((now.getTime() - i * timeframeMs[timeframe]) / 1000);
      
      const change = (Math.random() - 0.48) * volatility; // Slight upward bias
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      const volume = Math.random() * 1000 + 100;

      data.push({ time, open, high, low, close, volume });
      price = close;
    }

    return data;
  }

  /**
   * Cleanup
   */
  disconnect(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.ws?.close();
    this.ws = null;
  }
}
