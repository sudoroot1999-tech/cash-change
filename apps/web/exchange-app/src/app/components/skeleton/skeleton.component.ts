import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'rounded';

@Component({
  selector: 'ui-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="skeleton"
      [class]="variantClasses()"
      [style.width]="width()"
      [style.height]="height()"
    ></div>
  `,
  styles: [`
    .skeleton {
      background: linear-gradient(
        90deg,
        var(--color-bg-tertiary) 25%,
        var(--color-bg-elevated) 50%,
        var(--color-bg-tertiary) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    .text {
      border-radius: var(--radius-sm);
      height: 1em;
    }
    
    .circular {
      border-radius: 50%;
    }
    
    .rectangular {
      border-radius: 0;
    }
    
    .rounded {
      border-radius: var(--radius-lg);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkeletonComponent {
  variant = input<SkeletonVariant>('text');
  width = input<string>('100%');
  height = input<string>('');

  variantClasses(): string {
    return this.variant();
  }
}
