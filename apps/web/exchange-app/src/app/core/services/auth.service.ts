import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, switchMap, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, AuthenticatedUser, TokenPair } from '@/libs/types';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_KEY = 'refresh_token';
  private readonly USER_KEY = 'exchange_user';

  // dependencis
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  // private readonly userService = inject(UserService);

  // Signals for reactive state
  private readonly _user = signal<AuthenticatedUser | null>(this.loadUser());
  private readonly _isLoading = signal(false);

  readonly user = this._user.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isAuthenticated = computed(() => !!this._user());
  readonly username = computed(() => this._user()?.username ?? 'Guest');

  /**
   * Update user data (used by UserService)
   */
  updateUser(user: AuthenticatedUser): void {
    this.storeUser(user);
    this._user.set(user);
  }

  login(email: string, password: string): Observable<TokenPair> {
    this._isLoading.set(true);
    return this.http.post<ApiResponse<TokenPair>>(`${this.API_URL}/login`, { email, password }).pipe(
      map((response) => response.data),
      tap((data) => {
        this.storeTokens(data.accessToken, data.refreshToken);
        this._isLoading.set(false);
      }),
      // this.storeTokens(response.accessToken, response.refreshToken);
      // Fetch current user from GET /users endpoint
      // return this.getCurrentUserFromServer().pipe(
      //   tap((user) => {
      //     console.log(user);
      //     this.storeUser(user);
      //     this._user.set(user);
      //     this._isLoading.set(false);
      //   }),
      //   switchMap(() => of(response)),
      // );
      // }),
      catchError((error) => {
        this._isLoading.set(false);
        throw error;
      }),
    );
  }

  register(data: { email: string; password: string; username: string }): Observable<AuthenticatedUser> {
    this._isLoading.set(true);

    return this.http.post<ApiResponse<AuthenticatedUser>>(`${this.API_URL}/register`, data).pipe(
      map((response) => response.data),
      tap((data) => {
        this.storeUser(data);
        this._user.set(data);
        this._isLoading.set(false);
      }),
      // this.storeTokens(response.accessToken, response.refreshToken);
      // Fetch current user from GET /users endpoint
      // return this.getCurrentUserFromServer().pipe(
      //   tap((user) => {
      //     this.storeUser(user);
      //     this._user.set(user);
      //     this._isLoading.set(false);
      //   }),
      //   switchMap(() => of(response)),
      // );
      // }),
      catchError((error) => {
        this._isLoading.set(false);
        throw error;
      }),
    );
  }

  logout(): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.API_URL}/register`, {}).pipe(
      tap((response) => {
        if (response.success) {
          localStorage.removeItem(this.TOKEN_KEY);
          localStorage.removeItem(this.REFRESH_KEY);
          localStorage.removeItem(this.USER_KEY);
          this._user.set(null);
          this.router.navigate(['/auth/login']);
        }
      }),
      map((response) => response.data)
    )
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  refreshToken(): Observable<TokenPair | null> {
    const refreshToken = localStorage.getItem(this.REFRESH_KEY);
    if (!refreshToken) {
      return of(null);
    }

    return this.http.post<ApiResponse<TokenPair>>(`${this.API_URL}/refresh`, { refreshToken }).pipe(
      map(response => response.data),
      tap((data) => {
        this.storeTokens(data.accessToken, data.refreshToken);
      }),
    );
  }

  private storeTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_KEY, refreshToken);
  }

  private storeUser(user: AuthenticatedUser): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private loadUser(): AuthenticatedUser | null {
    const stored = localStorage.getItem(this.USER_KEY);
    return stored ? JSON.parse(stored) : null;
  }
}
