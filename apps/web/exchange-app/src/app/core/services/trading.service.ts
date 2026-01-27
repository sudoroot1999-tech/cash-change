import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CreateOrderRequest {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  price?: string;
  quantity: string;
  stopPrice?: string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  clientOrderId?: string;
}

export interface Order {
  id: string;
  userId: string;
  pairId: string;
  symbol?: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  status: 'PENDING' | 'OPEN' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED';
  price: string | null;
  quantity: string;
  filledQuantity: string;
  remainingQuantity: string;
  stopPrice: string | null;
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  clientOrderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Trade {
  id: string;
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  price: string;
  quantity: string;
  fee: string;
  feeAsset: string;
  createdAt: string;
}

export interface OrdersResponse {
  data: Order[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface TradesResponse {
  data: Trade[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class TradingService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/orders`;

  /**
   * Create a new order
   */
  createOrder(order: CreateOrderRequest): Observable<Order> {
    return this.http.post<Order>(this.API_URL, order);
  }

  /**
   * Get user orders with optional filters
   */
  getOrders(params?: {
    status?: 'PENDING' | 'OPEN' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED';
    symbol?: string;
    page?: number;
    limit?: number;
  }): Observable<OrdersResponse> {
    let httpParams = new HttpParams();
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.symbol) {
      httpParams = httpParams.set('symbol', params.symbol);
    }
    if (params?.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get<OrdersResponse>(this.API_URL, { params: httpParams });
  }

  /**
   * Get open orders
   */
  getOpenOrders(symbol?: string): Observable<Order[]> {
    let httpParams = new HttpParams();
    if (symbol) {
      httpParams = httpParams.set('symbol', symbol);
    }
    return this.http
      .get<{ data: Order[] }>(`${this.API_URL}/open`, { params: httpParams })
      .pipe(map((response) => response.data));
  }

  /**
   * Get order by ID
   */
  getOrder(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.API_URL}/${orderId}`);
  }

  /**
   * Cancel an order
   */
  cancelOrder(orderId: string, symbol: string): Observable<Order> {
    return this.http.delete<Order>(`${this.API_URL}/${orderId}`, {
      params: { symbol },
    });
  }

  /**
   * Get trade history
   */
  getTradeHistory(params?: {
    symbol?: string;
    page?: number;
    limit?: number;
  }): Observable<TradesResponse> {
    let httpParams = new HttpParams();
    if (params?.symbol) {
      httpParams = httpParams.set('symbol', params.symbol);
    }
    if (params?.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get<TradesResponse>(`${this.API_URL}/history/trades`, { params: httpParams });
  }
}
