import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, switchMap, map, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, TokenPair, User } from '@/libs/types';
import { UserService } from './user.service';
import { SecurityService } from './security.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_KEY = 'refresh_token';
  private readonly USER_KEY = 'user';

  // dependencis
  private readonly http = inject(HttpClient);
  private readonly securityService = inject(SecurityService);

  // Signals for reactive state
  private readonly _user = signal<User | null>(null);
  private readonly _isLoading = signal(false);

  readonly user = this._user.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isAuthenticated = computed(() => !!this._user());
  readonly username = computed(() => this._user()?.username ?? 'Guest');

  /**
  * Login And Get User
  */
  login(email: string, password: string): Observable<User> {
    this._isLoading.set(true);
    return this.http.post<ApiResponse<User>>(`${this.API_URL}/auth/login`, { email, password }).pipe(
      map((response) => response.data),
      tap(() => {
        this._isLoading.set(false);
      }),
      catchError((error) => {
        this._isLoading.set(false);
        throw error;
      }),
    );
  }

  /**
   * Get Tokens
   */
  completeLogin(user: User): Observable<TokenPair> {
    this._isLoading.set(true);
    return this.http.post<ApiResponse<TokenPair>>(`${this.API_URL}/auth/complete-login`, user).pipe(
      map((response) => response.data),
      tap((data) => {
        this.storeTokens(data.accessToken, data.refreshToken);
        this._isLoading.set(false);
      }),
      catchError((error) => {
        this._isLoading.set(false);
        throw error;
      }),
    );
  }

  /**
  * Log Out User
  */
  logout(): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.API_URL}/auth/logout`, {}).pipe(
      map((response) => response.data)
    )
  }

  /**
  * Log Out And Kill Session
  */
  logoutAndKillSession(): Observable<string> {
    return this.logout().pipe(
      switchMap(() => this.securityService.killCurrentSession()),
      catchError(() => this.securityService.killCurrentSession()),
      finalize(() => {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_KEY);
        localStorage.removeItem(this.USER_KEY);
        this._user.set(null);
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
  * Refresh Access Token
  */
  refreshToken(): Observable<TokenPair | null> {
    return this.http.post<ApiResponse<TokenPair>>(`${this.API_URL}/auth/refresh`, {}).pipe(
      map(response => response.data),
      tap((data) => {
        this.storeTokens(data.accessToken, data.refreshToken);
      }),
    );
  }

  storeTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_KEY, refreshToken);
  }

  storeUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }
}
