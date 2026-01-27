import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, Observable, interval, retry, timer } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { takeUntil, tap, switchMap, filter, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Message Types
export type MessageType = 
  | 'subscribe' 
  | 'unsubscribe' 
  | 'ticker' 
  | 'kline' 
  | 'depth' 
  | 'trade' 
  | 'ping' 
  | 'pong'
  | 'error';

export interface WebSocketMessage<T = any> {
  type: MessageType;
  channel?: string;
  symbol?: string;
  data?: T;
  timestamp?: number;
}

// Data Types
export interface TickerUpdate {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
  timestamp: number;
}

export interface KlineUpdate {
  symbol: string;
  interval: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

export interface DepthUpdate {
  symbol: string;
  bids: [number, number][]; // [price, quantity][]
  asks: [number, number][]; // [price, quantity][]
  timestamp: number;
}

export interface TradeUpdate {
  symbol: string;
  id: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

export interface OrderBookLevel {
  price: number;
  amount: number;
  total: number;
  depth: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPercent: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private ws$: WebSocketSubject<WebSocketMessage> | null = null;
  private destroy$ = new Subject<void>();
  private reconnect$ = new Subject<void>();
  
  // Connection state
  private readonly _isConnected = signal<boolean>(false);
  private readonly _isConnecting = signal<boolean>(false);
  private readonly _connectionError = signal<string | null>(null);
  private readonly _reconnectAttempts = signal<number>(0);
  
  // Stream subjects for different data types
  private tickerSubject = new BehaviorSubject<Map<string, TickerUpdate>>(new Map());
  private klineSubject = new Subject<KlineUpdate>();
  private depthSubject = new BehaviorSubject<Map<string, DepthUpdate>>(new Map());
  private tradeSubject = new Subject<TradeUpdate>();
  
  // Active subscriptions tracking
  private activeSubscriptions = new Set<string>();
  
  // Heartbeat
  private lastPong = 0;
  private heartbeatInterval: any;
  
  // Public readonly signals
  readonly isConnected = this._isConnected.asReadonly();
  readonly isConnecting = this._isConnecting.asReadonly();
  readonly connectionError = this._connectionError.asReadonly();
  readonly reconnectAttempts = this._reconnectAttempts.asReadonly();
  
  // Observables
  readonly tickers$ = this.tickerSubject.asObservable();
  readonly klines$ = this.klineSubject.asObservable();
  readonly depth$ = this.depthSubject.asObservable();
  readonly trades$ = this.tradeSubject.asObservable();
  
  constructor() {
    // Auto-reconnect logic
    this.reconnect$.pipe(
      takeUntil(this.destroy$),
      switchMap(() => timer(this.getReconnectDelay())),
      tap(() => this.connect())
    ).subscribe();
  }
  
  ngOnDestroy(): void {
    this.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this._isConnected() || this._isConnecting()) {
      return;
    }
    
    this._isConnecting.set(true);
    this._connectionError.set(null);
    
    try {
      this.ws$ = webSocket<WebSocketMessage>({
        url: environment.wsUrl,
        openObserver: {
          next: () => {
            console.log('[WebSocket] Connected');
            this._isConnected.set(true);
            this._isConnecting.set(false);
            this._reconnectAttempts.set(0);
            this._connectionError.set(null);
            this.startHeartbeat();
            this.resubscribeAll();
          }
        },
        closeObserver: {
          next: (event) => {
            console.log('[WebSocket] Disconnected', event);
            this._isConnected.set(false);
            this._isConnecting.set(false);
            this.stopHeartbeat();
            
            // Trigger reconnect
            if (!event.wasClean) {
              this._reconnectAttempts.update(n => n + 1);
              this.reconnect$.next();
            }
          }
        }
      });
      
      // Handle incoming messages
      this.ws$.pipe(
        takeUntil(this.destroy$),
        tap(message => this.handleMessage(message))
      ).subscribe({
        error: (error) => {
          console.error('[WebSocket] Error:', error);
          this._connectionError.set(error.message || 'Connection failed');
          this._isConnected.set(false);
          this._isConnecting.set(false);
          this._reconnectAttempts.update(n => n + 1);
          this.reconnect$.next();
        }
      });
      
    } catch (error: any) {
      console.error('[WebSocket] Failed to connect:', error);
      this._connectionError.set(error.message || 'Failed to connect');
      this._isConnecting.set(false);
      this._reconnectAttempts.update(n => n + 1);
      this.reconnect$.next();
    }
  }
  
  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.ws$?.complete();
    this.ws$ = null;
    this._isConnected.set(false);
    this._isConnecting.set(false);
    this.activeSubscriptions.clear();
  }
  
  /**
   * Subscribe to ticker updates for a symbol
   */
  subscribeTicker(symbol: string): void {
    const channel = `ticker:${symbol}`;
    if (this.activeSubscriptions.has(channel)) return;
    
    this.send({
      type: 'subscribe',
      channel: 'ticker',
      symbol: symbol.toUpperCase()
    });
    
    this.activeSubscriptions.add(channel);
  }
  
  /**
   * Unsubscribe from ticker
   */
  unsubscribeTicker(symbol: string): void {
    const channel = `ticker:${symbol}`;
    if (!this.activeSubscriptions.has(channel)) return;
    
    this.send({
      type: 'unsubscribe',
      channel: 'ticker',
      symbol: symbol.toUpperCase()
    });
    
    this.activeSubscriptions.delete(channel);
  }
  
  /**
   * Subscribe to kline/candlestick updates
   */
  subscribeKline(symbol: string, interval: string = '1m'): void {
    const channel = `kline:${symbol}:${interval}`;
    if (this.activeSubscriptions.has(channel)) return;
    
    this.send({
      type: 'subscribe',
      channel: 'kline',
      symbol: symbol.toUpperCase(),
      data: { interval }
    });
    
    this.activeSubscriptions.add(channel);
  }
  
  /**
   * Unsubscribe from kline
   */
  unsubscribeKline(symbol: string, interval: string = '1m'): void {
    const channel = `kline:${symbol}:${interval}`;
    if (!this.activeSubscriptions.has(channel)) return;
    
    this.send({
      type: 'unsubscribe',
      channel: 'kline',
      symbol: symbol.toUpperCase(),
      data: { interval }
    });
    
    this.activeSubscriptions.delete(channel);
  }
  
  /**
   * Subscribe to order book depth updates
   */
  subscribeDepth(symbol: string): void {
    const channel = `depth:${symbol}`;
    if (this.activeSubscriptions.has(channel)) return;
    
    this.send({
      type: 'subscribe',
      channel: 'depth',
      symbol: symbol.toUpperCase()
    });
    
    this.activeSubscriptions.add(channel);
  }
  
  /**
   * Unsubscribe from depth
   */
  unsubscribeDepth(symbol: string): void {
    const channel = `depth:${symbol}`;
    if (!this.activeSubscriptions.has(channel)) return;
    
    this.send({
      type: 'unsubscribe',
      channel: 'depth',
      symbol: symbol.toUpperCase()
    });
    
    this.activeSubscriptions.delete(channel);
  }
  
  /**
   * Subscribe to trade updates
   */
  subscribeTrades(symbol: string): void {
    const channel = `trade:${symbol}`;
    if (this.activeSubscriptions.has(channel)) return;
    
    this.send({
      type: 'subscribe',
      channel: 'trade',
      symbol: symbol.toUpperCase()
    });
    
    this.activeSubscriptions.add(channel);
  }
  
  /**
   * Unsubscribe from trades
   */
  unsubscribeTrades(symbol: string): void {
    const channel = `trade:${symbol}`;
    if (!this.activeSubscriptions.has(channel)) return;
    
    this.send({
      type: 'unsubscribe',
      channel: 'trade',
      symbol: symbol.toUpperCase()
    });
    
    this.activeSubscriptions.delete(channel);
  }
  
  /**
   * Get ticker observable for specific symbol
   */
  getTicker$(symbol: string): Observable<TickerUpdate | undefined> {
    return this.tickers$.pipe(
      map(tickers => tickers.get(symbol.toUpperCase()))
    );
  }
  
  /**
   * Get kline observable for specific symbol
   */
  getKline$(symbol: string): Observable<KlineUpdate> {
    return this.klines$.pipe(
      filter(kline => kline.symbol === symbol.toUpperCase())
    );
  }
  
  /**
   * Get depth observable for specific symbol
   */
  getDepth$(symbol: string): Observable<DepthUpdate | undefined> {
    return this.depth$.pipe(
      map(depths => depths.get(symbol.toUpperCase()))
    );
  }
  
  /**
   * Get trades observable for specific symbol
   */
  getTrades$(symbol: string): Observable<TradeUpdate> {
    return this.trades$.pipe(
      filter(trade => trade.symbol === symbol.toUpperCase())
    );
  }
  
  /**
   * Convert raw depth to order book format
   */
  static formatOrderBook(depth: DepthUpdate): OrderBook {
    let bidTotal = 0;
    let askTotal = 0;
    const maxBidTotal = depth.bids.reduce((sum, [, qty]) => sum + qty, 0);
    const maxAskTotal = depth.asks.reduce((sum, [, qty]) => sum + qty, 0);
    
    const bids: OrderBookLevel[] = depth.bids.map(([price, amount]) => {
      bidTotal += amount;
      return {
        price,
        amount,
        total: bidTotal,
        depth: (bidTotal / maxBidTotal) * 100
      };
    });
    
    const asks: OrderBookLevel[] = depth.asks.map(([price, amount]) => {
      askTotal += amount;
      return {
        price,
        amount,
        total: askTotal,
        depth: (askTotal / maxAskTotal) * 100
      };
    });
    
    const lowestAsk = asks[0]?.price ?? 0;
    const highestBid = bids[0]?.price ?? 0;
    const spread = lowestAsk - highestBid;
    const spreadPercent = lowestAsk > 0 ? (spread / lowestAsk) * 100 : 0;
    
    return { bids, asks, spread, spreadPercent };
  }
  
  // Private methods
  
  private send(message: WebSocketMessage): void {
    if (this._isConnected() && this.ws$) {
      this.ws$.next(message);
    }
  }
  
  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'ticker':
        this.handleTicker(message.data as TickerUpdate);
        break;
      case 'kline':
        this.handleKline(message.data as KlineUpdate);
        break;
      case 'depth':
        this.handleDepth(message.data as DepthUpdate);
        break;
      case 'trade':
        this.handleTrade(message.data as TradeUpdate);
        break;
      case 'pong':
        this.lastPong = Date.now();
        break;
      case 'error':
        console.error('[WebSocket] Server error:', message.data);
        break;
    }
  }
  
  private handleTicker(ticker: TickerUpdate): void {
    const current = this.tickerSubject.getValue();
    current.set(ticker.symbol, ticker);
    this.tickerSubject.next(new Map(current));
  }
  
  private handleKline(kline: KlineUpdate): void {
    this.klineSubject.next(kline);
  }
  
  private handleDepth(depth: DepthUpdate): void {
    const current = this.depthSubject.getValue();
    current.set(depth.symbol, depth);
    this.depthSubject.next(new Map(current));
  }
  
  private handleTrade(trade: TradeUpdate): void {
    this.tradeSubject.next(trade);
  }
  
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastPong = Date.now();
    
    this.heartbeatInterval = setInterval(() => {
      if (Date.now() - this.lastPong > 30000) {
        // No pong received in 30 seconds, reconnect
        console.warn('[WebSocket] Heartbeat timeout, reconnecting...');
        this.disconnect();
        this.reconnect$.next();
        return;
      }
      
      this.send({ type: 'ping', timestamp: Date.now() });
    }, 15000);
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  private resubscribeAll(): void {
    // Re-send all active subscriptions after reconnect
    this.activeSubscriptions.forEach(channel => {
      const [type, symbol, interval] = channel.split(':');
      this.send({
        type: 'subscribe',
        channel: type,
        symbol,
        data: interval ? { interval } : undefined
      });
    });
  }
  
  private getReconnectDelay(): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    const attempts = this._reconnectAttempts();
    return Math.min(1000 * Math.pow(2, attempts), 30000);
  }
}
