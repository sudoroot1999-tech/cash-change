import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'ui-crypto-price',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="price-container" [class]="containerClasses()">
      @if (showSymbol()) {
        <div class="symbol-container">
          <div class="symbol-icon" [style.background-color]="symbolColor()">
            {{ symbolInitial() }}
          </div>
          <div class="symbol-info">
            <span class="symbol-name">{{ symbol() }}</span>
            @if (name()) {
              <span class="symbol-full-name">{{ name() }}</span>
            }
          </div>
        </div>
      }
      
      <div class="price-info">
        <span class="price" [class.font-mono]="true">
          {{ currencyPrefix() }}{{ price() | number:'1.2-2' }}
        </span>
        
        @if (showChange()) {
          <span class="change" [class]="changeClasses()">
            @if (change() >= 0) {
              <svg class="change-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" transform="rotate(180 10 10)"/>
              </svg>
            } @else {
              <svg class="change-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            }
            {{ change() >= 0 ? '+' : '' }}{{ change() | number:'1.2-2' }}%
          </span>
        }
      </div>
    </div>
  `,
  styles: [`
    .price-container {
      display: flex;
      align-items: center;
      gap: var(--spacing-3);
    }
    
    .price-container.vertical {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .symbol-container {
      display: flex;
      align-items: center;
      gap: var(--spacing-2);
    }
    
    .symbol-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: white;
    }
    
    .symbol-info {
      display: flex;
      flex-direction: column;
    }
    
    .symbol-name {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
    }
    
    .symbol-full-name {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }
    
    .price-info {
      display: flex;
      align-items: center;
      gap: var(--spacing-2);
    }
    
    .price {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
    }
    
    .change {
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
    }
    
    .change-icon {
      width: 14px;
      height: 14px;
    }
    
    .change.positive {
      color: var(--color-success);
    }
    
    .change.negative {
      color: var(--color-danger);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CryptoPriceComponent {
  symbol = input.required<string>();
  price = input.required<number>();
  change = input(0);
  name = input('');
  showSymbol = input(true);
  showChange = input(true);
  layout = input<'horizontal' | 'vertical'>('horizontal');
  currencyPrefix = input('$');

  symbolInitial = computed(() => this.symbol().charAt(0).toUpperCase());
  
  symbolColor = computed(() => {
    const colors: Record<string, string> = {
      'BTC': '#F7931A',
      'ETH': '#627EEA',
      'SOL': '#9945FF',
      'USDT': '#26A17B',
      'BNB': '#F3BA2F',
      'XRP': '#23292F',
      'MATIC': '#8247E5',
      'DOGE': '#C2A633'
    };
    return colors[this.symbol()] || '#6366f1';
  });

  containerClasses = computed(() => {
    return this.layout() === 'vertical' ? 'vertical' : '';
  });

  changeClasses = computed(() => {
    return this.change() >= 0 ? 'positive' : 'negative';
  });
}
