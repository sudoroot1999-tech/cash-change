import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';

export interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'support' | 'viewer';
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AdminUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = '/api/v1/admin/auth';
  
  private readonly _user = signal<AdminUser | null>(null);
  private readonly _token = signal<string | null>(null);
  private readonly _loading = signal(false);
  
  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());
  readonly isAdmin = computed(() => 
    this._user()?.role === 'super_admin' || this._user()?.role === 'admin'
  );

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const token = localStorage.getItem('admin_token');
    const user = localStorage.getItem('admin_user');
    
    if (token && user) {
      this._token.set(token);
      this._user.set(JSON.parse(user));
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    this._loading.set(true);
    
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((response) => {
        this._token.set(response.accessToken);
        this._user.set(response.user);
        
        localStorage.setItem('admin_token', response.accessToken);
        localStorage.setItem('admin_refresh_token', response.refreshToken);
        localStorage.setItem('admin_user', JSON.stringify(response.user));
        
        this._loading.set(false);
      }),
      catchError((error) => {
        this._loading.set(false);
        throw error;
      }),
    );
  }

  logout(): void {
    this._token.set(null);
    this._user.set(null);
    
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user');
    
    this.router.navigate(['/login']);
  }

  hasPermission(permission: string): boolean {
    const user = this._user();
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return user.permissions.includes(permission);
  }

  refreshToken(): Observable<{ accessToken: string }> {
    const refreshToken = localStorage.getItem('admin_refresh_token');
    
    return this.http.post<{ accessToken: string }>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      tap((response) => {
        this._token.set(response.accessToken);
        localStorage.setItem('admin_token', response.accessToken);
      }),
    );
  }
}
