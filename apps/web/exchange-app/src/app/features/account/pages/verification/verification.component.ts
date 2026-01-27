import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '@/components/card/card.component';
import { ButtonComponent } from '@/components/button/button.component';
import { BadgeComponent } from '@/components/badge/badge.component';
import { AuthService } from '@/app/core/services/auth.service';

type VerificationStep = 'personal' | 'identity' | 'address' | 'complete';

interface VerificationTier {
  level: number;
  name: string;
  limits: {
    dailyWithdraw: string;
    dailyDeposit: string;
  };
  requirements: string[];
}

@Component({
  selector: 'app-verification',
  standalone: true,
  imports: [CommonModule, CardComponent, ButtonComponent, BadgeComponent],
  templateUrl: './verification.component.html',
  styleUrls: ['./verification.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationComponent {
  private readonly authService = inject(AuthService);

  currentStep = signal<VerificationStep>('personal');
  selectedDocType = signal<string>('passport');
  completedSteps = signal<VerificationStep[]>([]);

  steps = [
    { id: 'personal' as const, name: 'Personal Info', description: 'Name & DOB' },
    { id: 'identity' as const, name: 'Identity', description: 'Upload ID' },
    { id: 'address' as const, name: 'Address', description: 'Proof of address' },
  ];

  tiers: VerificationTier[] = [
    {
      level: 1,
      name: 'Basic',
      limits: { dailyWithdraw: '$2,000', dailyDeposit: '$5,000' },
      requirements: ['Email verification', 'Phone verification'],
    },
    {
      level: 2,
      name: 'Intermediate',
      limits: { dailyWithdraw: '$50,000', dailyDeposit: '$100,000' },
      requirements: ['Personal information', 'Identity document'],
    },
    {
      level: 3,
      name: 'Advanced',
      limits: { dailyWithdraw: 'Unlimited', dailyDeposit: 'Unlimited' },
      requirements: ['Proof of address', 'Source of funds'],
    },
  ];

  currentStatus = computed<'verified' | 'pending' | 'unverified' | 'rejected'>(() => {
    const user = this.authService.user();
    const kycLevel = user?.kycLevel || 0;
    if (kycLevel >= 3) return 'verified';
    if (kycLevel > 0) return 'pending';
    return 'unverified';
  });

  currentTier = computed(() => {
    const status = this.currentStatus();
    switch (status) {
      case 'verified':
        return 3;
      case 'pending':
        return 1;
      default:
        return 1;
    }
  });

  statusTitle = computed(() => {
    switch (this.currentStatus()) {
      case 'verified':
        return 'Fully Verified';
      case 'pending':
        return 'Verification Pending';
      case 'rejected':
        return 'Verification Rejected';
      default:
        return 'Not Verified';
    }
  });

  statusDescription = computed(() => {
    switch (this.currentStatus()) {
      case 'verified':
        return 'You have full access to all platform features.';
      case 'pending':
        return 'We are reviewing your documents. This usually takes 1-3 business days.';
      case 'rejected':
        return 'Please re-submit your documents with the required corrections.';
      default:
        return 'Complete verification to unlock higher limits and features.';
    }
  });

  statusBadge = computed(() => {
    switch (this.currentStatus()) {
      case 'verified':
        return { label: 'Verified', variant: 'success' as const };
      case 'pending':
        return { label: 'Pending', variant: 'warning' as const };
      case 'rejected':
        return { label: 'Rejected', variant: 'danger' as const };
      default:
        return { label: 'Unverified', variant: 'default' as const };
    }
  });

  isStepCompleted(step: VerificationStep): boolean {
    return this.completedSteps().includes(step);
  }

  nextStep(): void {
    const stepOrder: VerificationStep[] = ['personal', 'identity', 'address', 'complete'];
    const currentIndex = stepOrder.indexOf(this.currentStep());

    this.completedSteps.update((steps: VerificationStep[]) => [...steps, this.currentStep()]);
    this.currentStep.set(stepOrder[currentIndex + 1]);
  }

  prevStep(): void {
    const stepOrder: VerificationStep[] = ['personal', 'identity', 'address', 'complete'];
    const currentIndex = stepOrder.indexOf(this.currentStep());

    if (currentIndex > 0) {
      this.currentStep.set(stepOrder[currentIndex - 1]);
    }
  }

  submitVerification(): void {
    this.completedSteps.update((steps: VerificationStep[]) => [...steps, 'address']);
    this.currentStep.set('complete');
  }
}
