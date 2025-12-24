import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '@/components/card/card.component';
import { ButtonComponent } from '@/components/button/button.component';
import { BadgeComponent } from '@/components/badge/badge.component';
import { AuthService } from '../../../../core/services/auth.service';

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
  template: `
    <div class="verification-page">
      <div class="page-header">
        <h1 class="page-title">Identity Verification</h1>
        <p class="page-subtitle">Complete KYC to unlock higher limits and features</p>
      </div>

      <!-- Current Status -->
      <ui-card variant="elevated" class="status-card">
        <div class="status-content">
          <div class="status-icon" [class]="currentStatus()">
            @switch (currentStatus()) {
              @case ('verified') {
                ✓
              }
              @case ('pending') {
                ⏳
              }
              @case ('rejected') {
                ✗
              }
              @default {
                ?
              }
            }
          </div>
          <div class="status-info">
            <h2 class="status-title">{{ statusTitle() }}</h2>
            <p class="status-desc">{{ statusDescription() }}</p>
          </div>
          <ui-badge [variant]="statusBadge().variant">{{ statusBadge().label }}</ui-badge>
        </div>
      </ui-card>

      <!-- Verification Tiers -->
      <div class="tiers-section">
        <h3 class="section-title">Verification Tiers</h3>
        <div class="tiers-grid">
          @for (tier of tiers; track tier.level) {
            <div class="tier-card" [class.active]="currentTier() >= tier.level">
              <div class="tier-header">
                <span class="tier-level">Level {{ tier.level }}</span>
                <span class="tier-name">{{ tier.name }}</span>
                @if (currentTier() >= tier.level) {
                  <ui-badge variant="success">Unlocked</ui-badge>
                }
              </div>
              <div class="tier-limits">
                <div class="limit">
                  <span class="limit-label">Daily Withdraw</span>
                  <span class="limit-value">{{ tier.limits.dailyWithdraw }}</span>
                </div>
                <div class="limit">
                  <span class="limit-label">Daily Deposit</span>
                  <span class="limit-value">{{ tier.limits.dailyDeposit }}</span>
                </div>
              </div>
              <div class="tier-requirements">
                @for (req of tier.requirements; track req) {
                  <div class="requirement">
                    <span class="requirement-check">
                      @if (currentTier() >= tier.level) {
                        ✓
                      } @else {
                        ○
                      }
                    </span>
                    {{ req }}
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Verification Steps -->
      @if (currentStatus() !== 'verified') {
        <ui-card variant="elevated" title="Complete Verification">
          <div class="steps-progress">
            @for (step of steps; track step.id; let i = $index) {
              <div
                class="step"
                [class.completed]="isStepCompleted(step.id)"
                [class.current]="currentStep() === step.id"
              >
                <div class="step-number">
                  @if (isStepCompleted(step.id)) {
                    ✓
                  } @else {
                    {{ i + 1 }}
                  }
                </div>
                <div class="step-info">
                  <span class="step-name">{{ step.name }}</span>
                  <span class="step-desc">{{ step.description }}</span>
                </div>
              </div>
              @if (i < steps.length - 1) {
                <div class="step-connector" [class.completed]="isStepCompleted(step.id)"></div>
              }
            }
          </div>

          <!-- Step Content -->
          @switch (currentStep()) {
            @case ('personal') {
              <div class="step-content">
                <h4>Personal Information</h4>
                <p>
                  Please provide your legal name and date of birth as they appear on your
                  government-issued ID.
                </p>
                <div class="form-row">
                  <div class="form-field">
                    <label>First Name</label>
                    <input type="text" class="form-input" placeholder="Enter first name" />
                  </div>
                  <div class="form-field">
                    <label>Last Name</label>
                    <input type="text" class="form-input" placeholder="Enter last name" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-field">
                    <label>Date of Birth</label>
                    <input type="date" class="form-input" />
                  </div>
                  <div class="form-field">
                    <label>Nationality</label>
                    <select class="form-input">
                      <option value="">Select country</option>
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                      <option value="SG">Singapore</option>
                    </select>
                  </div>
                </div>
                <ui-button variant="primary" (click)="nextStep()">Continue</ui-button>
              </div>
            }

            @case ('identity') {
              <div class="step-content">
                <h4>Identity Document</h4>
                <p>
                  Upload a clear photo of your government-issued ID (passport, driver's license, or
                  national ID).
                </p>

                <div class="document-options">
                  <button
                    class="document-option"
                    [class.selected]="selectedDocType() === 'passport'"
                    (click)="selectedDocType.set('passport')"
                  >
                    🛂 Passport
                  </button>
                  <button
                    class="document-option"
                    [class.selected]="selectedDocType() === 'license'"
                    (click)="selectedDocType.set('license')"
                  >
                    🪪 Driver's License
                  </button>
                  <button
                    class="document-option"
                    [class.selected]="selectedDocType() === 'id'"
                    (click)="selectedDocType.set('id')"
                  >
                    🆔 National ID
                  </button>
                </div>

                <div class="upload-area">
                  <div class="upload-icon">📷</div>
                  <p>Drag and drop or click to upload</p>
                  <span class="upload-hint">JPG, PNG, or PDF (max 10MB)</span>
                </div>

                <div class="step-actions">
                  <ui-button variant="secondary" (click)="prevStep()">Back</ui-button>
                  <ui-button variant="primary" (click)="nextStep()">Continue</ui-button>
                </div>
              </div>
            }

            @case ('address') {
              <div class="step-content">
                <h4>Proof of Address</h4>
                <p>
                  Upload a document showing your current address (utility bill, bank statement,
                  etc.) dated within the last 3 months.
                </p>

                <div class="upload-area">
                  <div class="upload-icon">📄</div>
                  <p>Drag and drop or click to upload</p>
                  <span class="upload-hint">JPG, PNG, or PDF (max 10MB)</span>
                </div>

                <div class="step-actions">
                  <ui-button variant="secondary" (click)="prevStep()">Back</ui-button>
                  <ui-button variant="primary" (click)="submitVerification()"
                    >Submit for Review</ui-button
                  >
                </div>
              </div>
            }

            @case ('complete') {
              <div class="step-content complete">
                <div class="complete-icon">🎉</div>
                <h4>Verification Submitted</h4>
                <p>
                  Your documents have been submitted for review. This usually takes 1-3 business
                  days.
                </p>
                <p class="complete-note">We'll notify you by email once the review is complete.</p>
              </div>
            }
          }
        </ui-card>
      }
    </div>
  `,
  styles: [
    `
      .verification-page {
        padding: var(--spacing-6);
        max-width: 900px;
        margin: 0 auto;
      }

      .page-header {
        margin-bottom: var(--spacing-6);
      }

      .page-title {
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-primary);
        margin: 0 0 var(--spacing-2) 0;
      }

      .page-subtitle {
        font-size: var(--font-size-base);
        color: var(--color-text-secondary);
        margin: 0;
      }

      .status-card {
        margin-bottom: var(--spacing-6);
      }

      .status-content {
        display: flex;
        align-items: center;
        gap: var(--spacing-4);
      }

      .status-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--font-size-xl);
        font-weight: bold;
      }

      .status-icon.verified {
        background: var(--color-success) / 20;
        color: var(--color-success);
      }

      .status-icon.pending {
        background: var(--color-warning) / 20;
        color: var(--color-warning);
      }

      .status-icon.rejected {
        background: var(--color-danger) / 20;
        color: var(--color-danger);
      }

      .status-icon.unverified {
        background: var(--color-bg-tertiary);
        color: var(--color-text-tertiary);
      }

      .status-info {
        flex: 1;
      }

      .status-title {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
        margin: 0 0 var(--spacing-1) 0;
      }

      .status-desc {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        margin: 0;
      }

      .tiers-section {
        margin-bottom: var(--spacing-6);
      }

      .section-title {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
        margin: 0 0 var(--spacing-4) 0;
      }

      .tiers-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--spacing-4);
      }

      .tier-card {
        padding: var(--spacing-4);
        background: var(--color-bg-card);
        border: 1px solid var(--color-border-primary);
        border-radius: var(--radius-lg);
        opacity: 0.6;
      }

      .tier-card.active {
        opacity: 1;
        border-color: var(--color-accent-500);
      }

      .tier-header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--spacing-2);
        margin-bottom: var(--spacing-3);
      }

      .tier-level {
        font-size: var(--font-size-xs);
        color: var(--color-accent-400);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .tier-name {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
      }

      .tier-limits {
        display: flex;
        gap: var(--spacing-4);
        margin-bottom: var(--spacing-3);
        padding-bottom: var(--spacing-3);
        border-bottom: 1px solid var(--color-border-primary);
      }

      .limit {
        display: flex;
        flex-direction: column;
      }

      .limit-label {
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
      }

      .limit-value {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      .tier-requirements {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-1);
      }

      .requirement {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
      }

      .requirement-check {
        color: var(--color-success);
      }

      .steps-progress {
        display: flex;
        align-items: flex-start;
        margin-bottom: var(--spacing-6);
      }

      .step {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
        flex: 1;
      }

      .step-number {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-bold);
        background: var(--color-bg-tertiary);
        color: var(--color-text-tertiary);
        flex-shrink: 0;
      }

      .step.completed .step-number {
        background: var(--color-success);
        color: white;
      }

      .step.current .step-number {
        background: var(--color-accent-500);
        color: white;
      }

      .step-info {
        display: flex;
        flex-direction: column;
      }

      .step-name {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      .step-desc {
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
      }

      .step-connector {
        flex: 1;
        height: 2px;
        background: var(--color-border-primary);
        margin: 15px var(--spacing-3);
      }

      .step-connector.completed {
        background: var(--color-success);
      }

      .step-content {
        padding-top: var(--spacing-4);
        border-top: 1px solid var(--color-border-primary);
      }

      .step-content h4 {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
        margin: 0 0 var(--spacing-2) 0;
      }

      .step-content > p {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        margin: 0 0 var(--spacing-4) 0;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-4);
        margin-bottom: var(--spacing-4);
      }

      .form-field {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2);
      }

      .form-field label {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-secondary);
      }

      .form-input {
        padding: var(--spacing-3);
        font-size: var(--font-size-sm);
        color: var(--color-text-primary);
        background: var(--color-bg-tertiary);
        border: 1px solid var(--color-border-primary);
        border-radius: var(--radius-lg);
      }

      .form-input:focus {
        outline: none;
        border-color: var(--color-accent-500);
      }

      .document-options {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--spacing-3);
        margin-bottom: var(--spacing-4);
      }

      .document-option {
        padding: var(--spacing-4);
        text-align: center;
        background: var(--color-bg-tertiary);
        border: 2px solid var(--color-border-primary);
        border-radius: var(--radius-lg);
        cursor: pointer;
        transition: all var(--transition-fast);
      }

      .document-option:hover {
        border-color: var(--color-border-secondary);
      }

      .document-option.selected {
        border-color: var(--color-accent-500);
        background: var(--color-accent-500) / 10;
      }

      .upload-area {
        padding: var(--spacing-8);
        text-align: center;
        background: var(--color-bg-tertiary);
        border: 2px dashed var(--color-border-primary);
        border-radius: var(--radius-lg);
        cursor: pointer;
        margin-bottom: var(--spacing-4);
      }

      .upload-area:hover {
        border-color: var(--color-accent-500);
      }

      .upload-icon {
        font-size: 32px;
        margin-bottom: var(--spacing-2);
      }

      .upload-area p {
        color: var(--color-text-secondary);
        margin: 0;
      }

      .upload-hint {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
      }

      .step-actions {
        display: flex;
        gap: var(--spacing-3);
      }

      .step-content.complete {
        text-align: center;
        padding: var(--spacing-8);
      }

      .complete-icon {
        font-size: 48px;
        margin-bottom: var(--spacing-4);
      }

      .complete-note {
        color: var(--color-text-tertiary);
        font-size: var(--font-size-sm);
      }

      @media (max-width: 768px) {
        .tiers-grid {
          grid-template-columns: 1fr;
        }

        .form-row {
          grid-template-columns: 1fr;
        }

        .document-options {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
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

  currentStatus = computed(() => {
    const user = this.authService.user();
    return user?.kycStatus || 'unverified';
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
