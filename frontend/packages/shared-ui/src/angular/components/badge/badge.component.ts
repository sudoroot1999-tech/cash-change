import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info';
type BadgeSize = 'sm' | 'md';

@Component({
  selector: 'ui-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="badgeClasses()">
      <ng-content />
    </span>
  `,
  styles: [`
    :host {
      display: inline-flex;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BadgeComponent {
  variant = input<BadgeVariant>('default');
  size = input<BadgeSize>('md');

  badgeClasses = computed(() => {
    const base = 'inline-flex items-center font-medium rounded-full';
    
    const variants: Record<BadgeVariant, string> = {
      default: 'bg-bg-tertiary text-text-secondary',
      success: 'bg-success-soft text-success',
      danger: 'bg-danger-soft text-danger',
      warning: 'bg-warning-soft text-warning',
      info: 'bg-info-soft text-info'
    };

    const sizes: Record<BadgeSize, string> = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm'
    };

    return `${base} ${variants[this.variant()]} ${sizes[this.size()]}`;
  });
}
