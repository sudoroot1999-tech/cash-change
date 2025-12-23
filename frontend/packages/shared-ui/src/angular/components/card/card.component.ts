import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'interactive';

@Component({
  selector: 'ui-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="cardClasses()">
      @if (title() || subtitle()) {
        <div class="card-header">
          @if (title()) {
            <h3 class="card-title">{{ title() }}</h3>
          }
          @if (subtitle()) {
            <p class="card-subtitle">{{ subtitle() }}</p>
          }
        </div>
      }
      <div [class]="contentClasses()">
        <ng-content />
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .card-header {
      padding: var(--spacing-4);
      border-bottom: 1px solid var(--color-border-primary);
    }
    
    .card-title {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      margin: 0;
    }
    
    .card-subtitle {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      margin: var(--spacing-1) 0 0 0;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardComponent {
  variant = input<CardVariant>('default');
  title = input<string>('');
  subtitle = input<string>('');
  noPadding = input(false);

  cardClasses = computed(() => {
    const base = 'rounded-xl overflow-hidden transition-all duration-200';
    
    const variants: Record<CardVariant, string> = {
      default: 'bg-bg-card border border-border-primary',
      elevated: 'bg-bg-elevated border border-border-primary shadow-lg',
      outlined: 'bg-transparent border border-border-secondary',
      interactive: 'bg-bg-card border border-border-primary hover:bg-bg-card-hover hover:border-border-secondary cursor-pointer'
    };

    return `${base} ${variants[this.variant()]}`;
  });

  contentClasses = computed(() => {
    return this.noPadding() ? '' : 'p-4';
  });
}
