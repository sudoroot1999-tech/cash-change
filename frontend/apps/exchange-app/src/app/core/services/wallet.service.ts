import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, finalize, map, tap, catchError, throwError, timeout, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Wallet {
  id: string;
  userId: string;
  assetId: string;
  availableBalance: string;
  lockedBalance: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletBalance {
  asset: string;
  name: string;
  available: number;
  locked: number;
  usdValue: number;
  change24h: number;
}

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'TRADE';
  assetId: string;
  amount: string;
  fee: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  txHash?: string;
  toAddress?: string;
  fromAddress?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionsResponse {
  data: Transaction[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/wallets`;
  private readonly TRANSACTIONS_URL = `${environment.apiUrl}/transactions`;

  // State
  private readonly _wallets = signal<Wallet[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly wallets = this._wallets.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  /**
   * Get all user wallets with balances
   */
  getUserWallets(refresh = false): Observable<Wallet[]> {
    // Return cached data if available and not refreshing
    if (!refresh && this._wallets().length > 0) {
      console.log('[WalletService] Returning cached wallets');
      return of(this._wallets());
    }

    console.log('[WalletService] Fetching wallets from API...');
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.get<{ data: Wallet[] } | Wallet[]>(this.API_URL).pipe(
      timeout(10000), // 10 second timeout
      map((response) => {
        console.log('[WalletService] Raw response:', response);
        
        // Handle different response formats
        if (Array.isArray(response)) {
          return response;
        } else if (response && 'data' in response && Array.isArray(response.data)) {
          return response.data;
        } else {
          console.warn('[WalletService] Unexpected response format:', response);
          return [];
        }
      }),
      tap((wallets) => {
        console.log('[WalletService] Processed wallets:', wallets);
        this._wallets.set(wallets);
      }),
      catchError((error: HttpErrorResponse) => {
        const errorMessage = this.getErrorMessage(error);
        console.error('[WalletService] Error loading wallets:', errorMessage, error);
        this._error.set(errorMessage);
        this._wallets.set([]);
        return throwError(() => new Error(errorMessage));
      }),
      finalize(() => {
        console.log('[WalletService] Request completed');
        this._isLoading.set(false);
      }),
    );
  }

  /**
   * Get wallet balance for a specific asset
   */
  getBalance(assetId: string): Observable<{ available: string; locked: string }> {
    return this.getUserWallets().pipe(
      map((wallets) => {
        const wallet = wallets.find((w) => w.assetId === assetId);
        if (!wallet) {
          return { available: '0', locked: '0' };
        }
        return {
          available: wallet.availableBalance,
          locked: wallet.lockedBalance,
        };
      }),
    );
  }

  /**
   * Get transaction history
   */
  getTransactions(params?: {
    page?: number;
    limit?: number;
  }): Observable<TransactionsResponse> {
    let httpParams = new HttpParams();
    if (params?.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    console.log('[WalletService] Fetching transactions...');
    
    return this.http.get<TransactionsResponse>(this.TRANSACTIONS_URL, { params: httpParams }).pipe(
      timeout(10000),
      catchError((error: HttpErrorResponse) => {
        const errorMessage = this.getErrorMessage(error);
        console.error('[WalletService] Error loading transactions:', errorMessage);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  /**
   * Refresh wallet balances
   */
  refreshWallets(): Observable<Wallet[]> {
    console.log('[WalletService] Refreshing wallets...');
    return this.getUserWallets(true);
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    console.log('[WalletService] Clearing cache');
    this._wallets.set([]);
    this._error.set(null);
  }

  /**
   * Get error message from HTTP error
   */
  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      return `Network error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.status === 0) {
        return 'Unable to connect to server. Please check your connection.';
      } else if (error.status === 401) {
        return 'Authentication failed. Please login again.';
      } else if (error.status === 403) {
        return 'Access denied.';
      } else if (error.status === 404) {
        return 'Wallets not found.';
      } else if (error.status >= 500) {
        return 'Server error. Please try again later.';
      } else {
        return error.error?.message || `Error: ${error.status} ${error.statusText}`;
      }
    }
  }
}