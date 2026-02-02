import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CardComponent } from '@components/card/card.component';
import { ButtonComponent } from '@components/button/button.component';
import { InputComponent } from '@components/input/input.component';

import { AuthService } from '@/app/core/services/auth.service';
import { z } from 'zod';
import { ZodSchemas } from '@/libs/utils/validation.schema';
import { zodValidator } from '@/libs/utils/validation.factory';
import { EMPTY, finalize, map, switchMap, tap } from 'rxjs';
import { SecurityService } from '@/app/core/services/security.service';
import { UserFacade } from '@/app/core/store/user/user.facade';
import { USER_STATUS } from '@/libs/constants';

type LoginFormValue = z.infer<typeof ZodSchemas.login>;
type LoginFormKeys = Extract<keyof LoginFormValue, string>;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    CardComponent,
    ButtonComponent,
    InputComponent,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly securityService = inject(SecurityService);
  private readonly userFacade = inject(UserFacade);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group(
    {
      email: '',
      password: '',
      rememberMe: false,
    },
    {
      validators: zodValidator(ZodSchemas.login),
    }
  );

  submit(): void {
    this.error.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue() as LoginFormValue;

    this.isLoading.set(true);

    this.authService
      .login(email, password)
      .pipe(
        switchMap(loginRes =>
          this.securityService.createSession(loginRes.antiPhishingCode).pipe(
            map(sessionRes => ({
              loginRes,
              sessionRes,
            }))
          )
        ),
        tap(({ loginRes, sessionRes }) => {
          if ("requires2FA" in loginRes) {
            this.router.navigate(['/verify-2fa']);
          }
          this.userFacade.setUser(loginRes);
          this.authService.storeUser(loginRes);
        }),
        switchMap(({ loginRes }) => {
          if (loginRes.status === USER_STATUS.ACTIVE) {
            return this.authService.completeLogin(loginRes)
          }
          return EMPTY;
        }),
        tap((data) => this.userFacade.loadProfile()),
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        error: (err) => {
          this.error.set(err.error?.message ?? 'Login failed');
        },
      });
  }

  /** helper for read error */
  fieldError(field: LoginFormKeys): string | null {
    const errors = this.form.errors as Partial<Record<LoginFormKeys, string>> | null;
    return errors?.[field] ?? null;
  }
}
