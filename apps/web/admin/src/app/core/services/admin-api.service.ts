import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// Types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  status: 'active' | 'suspended' | 'banned';
  kycLevel: number;
  tier: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface KycSubmission {
  id: string;
  userId: string;
  user?: User;
  documentType: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  comments?: string;
}

export interface Order {
  id: string;
  userId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: string;
  status: string;
  price: string;
  quantity: string;
  filledQuantity: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal';
  currency: string;
  amount: string;
  status: string;
  txHash?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  newUsersToday: number;
  pendingKyc: number;
  activeOrders: number;
  volume24h: string;
  revenue24h: string;
}

export interface SystemHealth {
  services: { name: string; status: 'healthy' | 'degraded' | 'down' }[];
  uptime: number;
  lastIncident?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly apiUrl = '/api/v1/admin';

  constructor(private http: HttpClient) {}

  // Dashboard
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard/stats`);
  }

  getSystemHealth(): Observable<SystemHealth> {
    return this.http.get<SystemHealth>(`${this.apiUrl}/system/health`);
  }

  getRecentActivity(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/activity/recent`);
  }

  // Users
  getUsers(params: { page?: number; limit?: number; search?: string; status?: string }): Observable<PaginatedResponse<User>> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.status) httpParams = httpParams.set('status', params.status);
    
    return this.http.get<PaginatedResponse<User>>(`${this.apiUrl}/users`, { params: httpParams });
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }

  updateUserStatus(id: string, status: string): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${id}/status`, { status });
  }

  // KYC
  getKycSubmissions(params: { page?: number; status?: string }): Observable<PaginatedResponse<KycSubmission>> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.status) httpParams = httpParams.set('status', params.status);
    
    return this.http.get<PaginatedResponse<KycSubmission>>(`${this.apiUrl}/kyc/submissions`, { params: httpParams });
  }

  reviewKyc(id: string, action: 'approve' | 'reject', comments?: string): Observable<KycSubmission> {
    return this.http.post<KycSubmission>(`${this.apiUrl}/kyc/submissions/${id}/review`, { action, comments });
  }

  // Orders
  getOrders(params: { page?: number; status?: string; symbol?: string }): Observable<PaginatedResponse<Order>> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.symbol) httpParams = httpParams.set('symbol', params.symbol);
    
    return this.http.get<PaginatedResponse<Order>>(`${this.apiUrl}/orders`, { params: httpParams });
  }

  cancelOrder(id: string, reason: string): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/orders/${id}/cancel`, { reason });
  }

  // Transactions
  getTransactions(params: { page?: number; type?: string; status?: string }): Observable<PaginatedResponse<Transaction>> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.status) httpParams = httpParams.set('status', params.status);
    
    return this.http.get<PaginatedResponse<Transaction>>(`${this.apiUrl}/transactions`, { params: httpParams });
  }

  reviewTransaction(id: string, action: 'approve' | 'reject'): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.apiUrl}/transactions/${id}/review`, { action });
  }

  // Settings
  getTradingPairs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/settings/trading-pairs`);
  }

  updateTradingPair(symbol: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/settings/trading-pairs/${symbol}`, data);
  }

  getFeeTiers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/settings/fee-tiers`);
  }

  toggleMaintenanceMode(enabled: boolean): Observable<{ enabled: boolean }> {
    return this.http.post<{ enabled: boolean }>(`${this.apiUrl}/settings/maintenance`, { enabled });
  }
}
