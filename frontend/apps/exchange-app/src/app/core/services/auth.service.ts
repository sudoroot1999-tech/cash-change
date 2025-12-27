import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  username: string;
  kycLevel: 'NONE' | 'BASIC' | 'ADVANCED' | 'CORPORATE';
  kycStatus?: string;
  feeTier?: string;
  isTwoFactorEnabled?: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'exchange_access_token';
  private readonly REFRESH_KEY = 'exchange_refresh_token';
  private readonly USER_KEY = 'exchange_user';

  // Signals for reactive state
  private readonly _user = signal<User | null>(this.loadUser());
  private readonly _isLoading = signal(false);

  readonly user = this._user.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isAuthenticated = computed(() => !!this._user());
  readonly username = computed(() => this._user()?.username ?? 'Guest');

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  login(email: string, password: string): Observable<AuthResponse> {
    this._isLoading.set(true);

    return this.http.post<AuthResponse>(`${this.API_URL}/login`, { email, password }).pipe(
      switchMap((response) => {
        this.storeTokens(response.accessToken, response.refreshToken);
        // Fetch current user from GET /users endpoint
        return this.getCurrentUserFromServer().pipe(
          tap((user) => {
            console.log(user)
            this.storeUser(user);
            this._user.set(user);
            this._isLoading.set(false);
          }),
          switchMap(() => of(response)),
        );
      }),
      catchError((error) => {
        this._isLoading.set(false);
        throw error;
      }),
    );
  }

  register(data: { email: string; password: string; username: string }): Observable<AuthResponse> {
    this._isLoading.set(true);

    return this.http.post<AuthResponse>(`${this.API_URL}/register`, data).pipe(
      switchMap((response) => {
        this.storeTokens(response.accessToken, response.refreshToken);
        // Fetch current user from GET /users endpoint
        return this.getCurrentUserFromServer().pipe(
          tap((user) => {
            this.storeUser(user);
            this._user.set(user);
            this._isLoading.set(false);
          }),
          switchMap(() => of(response)),
        );
      }),
      catchError((error) => {
        this._isLoading.set(false);
        throw error;
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._user.set(null);
    this.router.navigate(['/auth/login']);
  }

  /**
   * Fetch current user from GET /users endpoint
   */
  private getCurrentUserFromServer(): Observable<User> {
    const usersApiUrl = `${environment.apiUrl}/users`;
    return this.http.get<User>(usersApiUrl);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  refreshToken(): Observable<AuthResponse | null> {
    const refreshToken = localStorage.getItem(this.REFRESH_KEY);
    if (!refreshToken) {
      return of(null);
    }

    return this.http.post<AuthResponse>(`${this.API_URL}/refresh`, { refreshToken }).pipe(
      tap((response) => {
        this.storeTokens(response.accessToken, response.refreshToken);
      }),
    );
  }

  private storeTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_KEY, refreshToken);
  }

  private storeUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private loadUser(): User | null {
    const stored = localStorage.getItem(this.USER_KEY);
    return stored ? JSON.parse(stored) : null;
  }
}
