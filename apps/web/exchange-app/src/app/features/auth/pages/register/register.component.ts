import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CardComponent } from '@components/card/card.component';
import { ButtonComponent } from '@components/button/button.component';
import { InputComponent } from '@components/input/input.component';
import { AuthService } from '@/app/core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, CardComponent, ButtonComponent, InputComponent, FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
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
        next: (data) => {
          if (data.emailVerified) {
            this.router.navigate(['/trade']);
          }
          this.router.navigate([`/verify-email?token=${data.emailVerificationToken}`]);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Registration failed. Please try again.');
          this.isLoading.set(false);
        },
      });
  }
}
