import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-header">
          <div class="logo">
            <span class="logo-icon">⚡</span>
            <span class="logo-text">CryptoX</span>
          </div>
          <h1>Admin Portal</h1>
          <p>Sign in to access the admin dashboard</p>
        </div>
        
        <form (ngSubmit)="onSubmit()" class="login-form">
          @if (error()) {
            <div class="error-message">{{ error() }}</div>
          }
          
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email" 
              [(ngModel)]="email" 
              name="email"
              placeholder="admin@cryptox.com"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              [(ngModel)]="password"
              name="password" 
              placeholder="••••••••"
              required
            />
          </div>
          
          <button type="submit" class="login-btn" [disabled]="loading()">
            @if (loading()) {
              <span class="spinner"></span>
              Signing in...
            } @else {
              Sign In
            }
          </button>
        </form>
        
        <div class="login-footer">
          <p>Protected area. Authorized personnel only.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--color-bg-primary), var(--color-bg-secondary));
    }
    
    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 40px;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 16px;
    }
    
    .login-header {
      text-align: center;
      margin-bottom: 32px;
    }
    
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 24px;
    }
    
    .logo-icon {
      font-size: 32px;
    }
    
    .logo-text {
      font-size: 28px;
      font-weight: 700;
      background: linear-gradient(135deg, var(--color-accent), #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    h1 {
      font-size: 24px;
      margin-bottom: 8px;
    }
    
    p {
      color: var(--color-text-secondary);
      font-size: 14px;
    }
    
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .error-message {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: var(--color-error);
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    label {
      font-size: 14px;
      font-weight: 500;
      color: var(--color-text-secondary);
    }
    
    input {
      padding: 14px 16px;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      color: var(--color-text-primary);
      font-size: 14px;
      transition: border-color 0.2s;
      
      &:focus {
        outline: none;
        border-color: var(--color-accent);
      }
      
      &::placeholder {
        color: var(--color-text-muted);
      }
    }
    
    .login-btn {
      padding: 14px;
      background: linear-gradient(135deg, var(--color-accent), #8b5cf6);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 16px;
      font-weight: 600;
      transition: opacity 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      
      &:hover:not(:disabled) {
        opacity: 0.9;
      }
      
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
    
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .login-footer {
      margin-top: 24px;
      text-align: center;
      
      p {
        font-size: 12px;
        color: var(--color-text-muted);
      }
    }
  `],
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  email = '';
  password = '';
  error = signal<string | null>(null);
  loading = this.authService.loading;
  
  onSubmit(): void {
    this.error.set(null);
    
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Invalid credentials');
      },
    });
  }
}
