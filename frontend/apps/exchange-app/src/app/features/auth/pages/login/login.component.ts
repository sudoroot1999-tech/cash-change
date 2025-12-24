import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CardComponent } from '@/core-components/card/card.component';
import { ButtonComponent } from '@/core-components/button/button.component';
import { InputComponent } from '@/core-components/input/input.component';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, CardComponent, ButtonComponent, InputComponent, FormsModule],
  template: `
    <div class="auth-page">
      <div class="auth-container">
        <!-- Logo -->
        <div class="auth-logo">
          <div class="logo-icon">CX</div>
          <span class="logo-text">CryptoX</span>
        </div>

        <!-- Login Card -->
        <ui-card variant="elevated">
          <div class="auth-content">
            <div class="auth-header">
              <h1 class="auth-title">Sign in</h1>
              <p class="auth-subtitle">Your blockchain wallet in one-click</p>
            </div>

            <!-- Social Login -->
            <div class="social-buttons">
              <button class="social-btn google">
                <svg class="social-icon" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </div>

            <div class="divider">
              <span>or</span>
            </div>

            <!-- Email Login Form -->
            <form class="auth-form" (ngSubmit)="onSubmit()">
              <ui-input
                type="email"
                label="Email"
                placeholder="Enter your email"
                [ngModel]="email"
                (ngModelChange)="email = $event"
                name="email"
                [error]="emailError()"
              />
              
              <ui-input
                type="password"
                label="Password"
                placeholder="Enter your password"
                [ngModel]="password"
                (ngModelChange)="password = $event"
                name="password"
                [error]="passwordError()"
              />

              <div class="form-options">
                <label class="remember-me">
                  <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe" />
                  <span>Remember me</span>
                </label>
                <a href="#" class="forgot-link">Forgot password?</a>
              </div>

              <ui-button 
                type="submit" 
                variant="primary" 
                [fullWidth]="true"
                [loading]="isLoading()"
              >
                Sign In
              </ui-button>
            </form>

            @if (error()) {
              <div class="error-message">{{ error() }}</div>
            }

            <div class="auth-footer">
              <span>Don't have an account?</span>
              <a routerLink="/auth/register" class="auth-link">Sign up</a>
            </div>
          </div>
        </ui-card>

        <!-- Footer Links -->
        <div class="page-footer">
          <a href="#">Terms of Service</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Support</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-6);
      background: var(--color-bg-primary);
      background-image: var(--gradient-glow);
    }

    .auth-container {
      width: 100%;
      max-width: 420px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-6);
    }

    .auth-logo {
      display: flex;
      align-items: center;
      gap: var(--spacing-2);
    }

    .logo-icon {
      width: 40px;
      height: 40px;
      background: var(--gradient-primary);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      color: white;
    }

    .logo-text {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-primary);
    }

    .auth-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-4);
    }

    .auth-header {
      text-align: center;
    }

    .auth-title {
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-primary);
      margin: 0 0 var(--spacing-1) 0;
    }

    .auth-subtitle {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      margin: 0;
    }

    .social-buttons {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-2);
    }

    .social-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-2);
      padding: var(--spacing-3);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
      background: var(--color-bg-tertiary);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .social-btn:hover {
      background: var(--color-bg-elevated);
      border-color: var(--color-border-secondary);
    }

    .social-icon {
      width: 20px;
      height: 20px;
    }

    .divider {
      display: flex;
      align-items: center;
      gap: var(--spacing-3);
      color: var(--color-text-tertiary);
      font-size: var(--font-size-sm);
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--color-border-primary);
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-4);
    }

    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: var(--font-size-sm);
    }

    .remember-me {
      display: flex;
      align-items: center;
      gap: var(--spacing-2);
      color: var(--color-text-secondary);
      cursor: pointer;
    }

    .forgot-link {
      color: var(--color-accent-400);
      text-decoration: none;
    }

    .forgot-link:hover {
      text-decoration: underline;
    }

    .error-message {
      padding: var(--spacing-3);
      font-size: var(--font-size-sm);
      color: var(--color-danger);
      background: var(--color-danger-soft);
      border-radius: var(--radius-md);
      text-align: center;
    }

    .auth-footer {
      display: flex;
      justify-content: center;
      gap: var(--spacing-2);
      padding-top: var(--spacing-4);
      border-top: 1px solid var(--color-border-primary);
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    .auth-link {
      color: var(--color-accent-400);
      text-decoration: none;
      font-weight: var(--font-weight-medium);
    }

    .auth-link:hover {
      text-decoration: underline;
    }

    .page-footer {
      display: flex;
      gap: var(--spacing-4);
    }

    .page-footer a {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
      text-decoration: none;
    }

    .page-footer a:hover {
      color: var(--color-text-secondary);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  rememberMe = false;

  emailError = signal('');
  passwordError = signal('');
  error = signal('');
  isLoading = signal(false);

  onSubmit(): void {
    this.emailError.set('');
    this.passwordError.set('');
    this.error.set('');

    if (!this.email) {
      this.emailError.set('Email is required');
      return;
    }

    if (!this.password) {
      this.passwordError.set('Password is required');
      return;
    }

    this.isLoading.set(true);

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.router.navigate(['/trade']);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Login failed. Please try again.');
        this.isLoading.set(false);
      }
    });
  }
}
