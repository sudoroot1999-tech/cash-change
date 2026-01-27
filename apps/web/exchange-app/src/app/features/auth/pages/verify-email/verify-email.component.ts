import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { UserService } from '@/app/core/services/user.service';

@Component({
    selector: 'app-verify-email',
    standalone: true,
    templateUrl: './verify-email.component.html',
    styleUrls: ['./verify-email.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailComponent {

    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private userService = inject(UserService);

    error = signal('');
    isLoading = signal(false);

    queryParamMap = toSignal(this.route.queryParamMap);
    token = computed(() => this.queryParamMap()?.get('token'));

    verifyEmail() {
        const token = this.token();
        if (!token) return;

        this.isLoading.set(true);

        this.userService.verifyEmail(token).subscribe({
            next: () => this.router.navigate(['/trade']),
            error: err => {
                this.error.set(err.error?.message || 'verification failed');
                this.isLoading.set(false);
            }
        });
    }
}
