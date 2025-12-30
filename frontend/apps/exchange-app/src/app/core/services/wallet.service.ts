import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, finalize, map, tap } from 'rxjs';
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

  readonly wallets = this._wallets.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  /**
   * Get all user wallets with balances
   */
  getUserWallets(refresh = false): Observable<Wallet[]> {
    if (!refresh && this._wallets().length > 0) {
      return new Observable((observer) => {
        observer.next(this._wallets());
        observer.complete();
      });
    }

    this._isLoading.set(true);
    return this.http.get<{ data: Wallet[] }>(this.API_URL).pipe(
      map((res) => res.data),
      tap((wallets) => this._wallets.set(wallets)),
      finalize(() => this._isLoading.set(false)),
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

    return this.http.get<TransactionsResponse>(this.TRANSACTIONS_URL, { params: httpParams });
  }

  /**
   * Refresh wallet balances
   */
  refreshWallets(): Observable<Wallet[]> {
    return this.getUserWallets(true);
  }
}

