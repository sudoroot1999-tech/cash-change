import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CardComponent } from '@/components/card/card.component';
import { ButtonComponent } from '@/components/button/button.component';
import { InputComponent } from '@/components/input/input.component';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, CardComponent, ButtonComponent, InputComponent, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
      },
    });
  }
}
