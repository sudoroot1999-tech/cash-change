import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CardComponent } from '@/components/card/card.component';
import { ButtonComponent } from '@/components/button/button.component';
import { InputComponent } from '@/components/input/input.component';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-register',
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

        <!-- Register Card -->
        <ui-card variant="elevated">
          <div class="auth-content">
            <div class="auth-header">
              <h1 class="auth-title">Create Account</h1>
              <p class="auth-subtitle">Start trading crypto in minutes</p>
            </div>

            <!-- Registration Form -->
            <form class="auth-form" (ngSubmit)="onSubmit()">
              <ui-input
                type="text"
                label="Username"
                placeholder="Choose a username"
                [ngModel]="username"
                (ngModelChange)="username = $event"
                name="username"
                [error]="usernameError()"
              />

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
                placeholder="Create a password"
                [ngModel]="password"
                (ngModelChange)="password = $event"
                name="password"
                hint="Min. 8 characters with uppercase, lowercase and number"
                [error]="passwordError()"
              />

              <ui-input
                type="password"
                label="Confirm Password"
                placeholder="Confirm your password"
                [ngModel]="confirmPassword"
                (ngModelChange)="confirmPassword = $event"
                name="confirmPassword"
                [error]="confirmPasswordError()"
              />

              <label class="terms-checkbox">
                <input
                  type="checkbox"
                  [ngModel]="acceptTerms"
                  (ngModelChange)="acceptTerms = $event"
                  name="acceptTerms"
                />
                <span
                  >I agree to the <a href="#">Terms of Service</a> and
                  <a href="#">Privacy Policy</a></span
                >
              </label>

              <ui-button
                type="submit"
                variant="primary"
                [fullWidth]="true"
                [loading]="isLoading()"
                [disabled]="!acceptTerms"
              >
                Create Account
              </ui-button>
            </form>

            @if (error()) {
              <div class="error-message">{{ error() }}</div>
            }

            <div class="auth-footer">
              <span>Already have an account?</span>
              <a routerLink="/auth/login" class="auth-link">Sign in</a>
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
  styles: [
    `
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

      .auth-form {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-4);
      }

      .terms-checkbox {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-2);
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        cursor: pointer;
      }

      .terms-checkbox a {
        color: var(--color-accent-400);
        text-decoration: none;
      }

      .terms-checkbox a:hover {
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  acceptTerms = false;

  usernameError = signal('');
  emailError = signal('');
  passwordError = signal('');
  confirmPasswordError = signal('');
  error = signal('');
  isLoading = signal(false);

  onSubmit(): void {
    this.usernameError.set('');
    this.emailError.set('');
    this.passwordError.set('');
    this.confirmPasswordError.set('');
    this.error.set('');

    if (!this.username) {
      this.usernameError.set('Username is required');
      return;
    }

    if (!this.email) {
      this.emailError.set('Email is required');
      return;
    }

    if (!this.password) {
      this.passwordError.set('Password is required');
      return;
    }

    if (this.password.length < 8) {
      this.passwordError.set('Password must be at least 8 characters');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.confirmPasswordError.set('Passwords do not match');
      return;
    }

    this.isLoading.set(true);

    this.authService
      .register({
        email: this.email,
        password: this.password,
        username: this.username,
      })
      .subscribe({
        next: () => {
          this.router.navigate(['/trade']);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Registration failed. Please try again.');
          this.isLoading.set(false);
        },
      });
  }
}
