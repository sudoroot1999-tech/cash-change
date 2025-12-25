import { Observable } from 'rxjs';

export interface TickerResponse {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  high24h: string;
  low24h: string;
  volume24h: string;
  quoteVolume24h: string;
  openPrice: string;
  closePrice: string;
  bidPrice: string;
  askPrice: string;
  timestamp: string;
}

export interface AllTickersResponse {
  tickers: TickerResponse[];
}

export interface GetTickerRequest {
  symbol: string;
}

export interface MarketOrderBookLevel {
  price: string;
  quantity: string;
}

export interface OrderBookResponse {
  symbol: string;
  bids: MarketOrderBookLevel[];
  asks: MarketOrderBookLevel[];
  timestamp: string;
}

export interface GetOrderBookRequest {
  symbol: string;
  depth: number;
}

export interface MarketTrade {
  id: string;
  symbol: string;
  price: string;
  quantity: string;
  side: string;
  timestamp: string;
}

export interface RecentTradesResponse {
  trades: MarketTrade[];
}

export interface GetRecentTradesRequest {
  symbol: string;
  limit: number;
}

export interface Kline {
  openTime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: string;
  quoteVolume: string;
  trades: number;
}

export interface KlinesResponse {
  klines: Kline[];
}

export interface GetKlinesRequest {
  symbol: string;
  interval: string;
  limit: number;
}

export interface MarketService {
  getTicker(request: GetTickerRequest): Observable<TickerResponse>;
  getAllTickers(empty: {}): Observable<AllTickersResponse>;
  getOrderBook(request: GetOrderBookRequest): Observable<OrderBookResponse>;
  getRecentTrades(request: GetRecentTradesRequest): Observable<RecentTradesResponse>;
  getKlines(request: GetKlinesRequest): Observable<KlinesResponse>;
}
