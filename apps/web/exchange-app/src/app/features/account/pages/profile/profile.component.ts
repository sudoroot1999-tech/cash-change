import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '@/app/core/services/auth.service';
import { UserService, UserProfile } from '@/app/core/services/user.service';
import { CardComponent } from '@/components/card/card.component';
import { ButtonComponent } from '@/components/button/button.component';
import { BadgeComponent } from '@/components/badge/badge.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, CardComponent, ButtonComponent, BadgeComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  readonly user = computed(() => this.authService.user());
  readonly profile = signal<UserProfile | null>(null);
  readonly isLoading = signal(false);

  readonly userInitials = computed(() => {
    const u = this.user();
    if (!u?.username) {
      const email = u?.email || '';
      return email.slice(0, 2).toUpperCase();
    }
    return u.username.slice(0, 2).toUpperCase();
  });

  readonly verificationStatus = computed(() => {
    const u = this.user();
    if (!u) return { label: 'Unverified', variant: 'default' as const };

    const kycLevel = u.kycLevel || 0;
    if (kycLevel >= 3) {
      return { label: 'Verified', variant: 'success' as const };
    } else if (kycLevel > 0) {
      return { label: 'Pending', variant: 'warning' as const };
    }
    return { label: 'Unverified', variant: 'default' as const };
  });

  readonly tradingVolume = signal('$0.00');
  readonly recentActivity = signal<any[]>([]);

  ngOnInit(): void {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.isLoading.set(true);
    this.userService.getProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load profile:', error);
        this.isLoading.set(false);
      },
    });
  }
}
