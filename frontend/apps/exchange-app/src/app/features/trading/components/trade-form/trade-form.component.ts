import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '@/components/button/button.component';
import { InputComponent } from '@/components/input/input.component';
import { WalletService } from '../../../../core/services/wallet.service';

interface TradingPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

interface OrderData {
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  price?: number;
  amount: number;
  total: number;
}

@Component({
  selector: 'app-trade-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, InputComponent],
  template: `
    <div class="trade-form">
      <div class="form-header">
        <span class="form-title">Place Order</span>
      </div>

      <!-- Order Type Tabs -->
      <div class="order-type-tabs">
        <button
          class="type-tab"
          [class.active]="orderType() === 'limit'"
          (click)="orderType.set('limit')"
        >
          Limit
        </button>
        <button
          class="type-tab"
          [class.active]="orderType() === 'market'"
          (click)="orderType.set('market')"
        >
          Market
        </button>
      </div>

      <!-- Buy/Sell Toggle -->
      <div class="side-toggle">
        <button class="side-btn buy" [class.active]="side() === 'buy'" (click)="side.set('buy')">
          Buy {{ pair().baseAsset }}
        </button>
        <button class="side-btn sell" [class.active]="side() === 'sell'" (click)="side.set('sell')">
          Sell {{ pair().baseAsset }}
        </button>
      </div>

      <!-- Price Input (for Limit orders) -->
      @if (orderType() === 'limit') {
        <div class="form-group">
          <label class="form-label">Price</label>
          <div class="input-with-suffix">
            <input
              type="number"
              class="form-input"
              [ngModel]="price()"
              (ngModelChange)="price.set($event)"
              placeholder="0.00"
            />
            <span class="input-suffix">{{ pair().quoteAsset }}</span>
          </div>
        </div>
      }

      <!-- Amount Input -->
      <div class="form-group">
        <label class="form-label">Amount</label>
        <div class="input-with-suffix">
          <input
            type="number"
            class="form-input"
            [ngModel]="amount()"
            (ngModelChange)="amount.set($event)"
            placeholder="0.00"
          />
          <span class="input-suffix">{{ pair().baseAsset }}</span>
        </div>
      </div>

      <!-- Percentage Quick Select -->
      <div class="percentage-btns">
        @for (pct of percentages; track pct) {
          <button class="pct-btn" (click)="setPercentage(pct)">{{ pct }}%</button>
        }
      </div>

      <!-- Total -->
      <div class="form-group">
        <label class="form-label">Total</label>
        <div class="input-with-suffix">
          <input
            type="number"
            class="form-input"
            [ngModel]="total()"
            (ngModelChange)="onTotalChange($event)"
            placeholder="0.00"
          />
          <span class="input-suffix">{{ pair().quoteAsset }}</span>
        </div>
      </div>

      <!-- Available Balance -->
      <div class="balance-info">
        <span class="balance-label">Available:</span>
        <span class="balance-value">
          {{
            side() === 'buy'
              ? (quoteBalance() | number: '1.2-2') + ' ' + pair().quoteAsset
              : (baseBalance() | number: '1.4-4') + ' ' + pair().baseAsset
          }}
        </span>
      </div>

      <!-- Submit Button -->
      <ui-button
        [variant]="side() === 'buy' ? 'primary' : 'danger'"
        [fullWidth]="true"
        size="lg"
        (click)="submitOrder()"
      >
        {{ side() === 'buy' ? 'Buy' : 'Sell' }} {{ pair().baseAsset }}
      </ui-button>

      <!-- Fee Info -->
      <div class="fee-info">
        <span>Estimated Fee: 0.1%</span>
        <span>≈ {{ estimatedFee() | number: '1.4-4' }} {{ pair().quoteAsset }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      .trade-form {
        padding: var(--spacing-4);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-3);
      }

      .form-header {
        padding-bottom: var(--spacing-2);
        border-bottom: 1px solid var(--color-border-primary);
      }

      .form-title {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
      }

      .order-type-tabs {
        display: flex;
        background: var(--color-bg-tertiary);
        border-radius: var(--radius-md);
        padding: 2px;
      }

      .type-tab {
        flex: 1;
        padding: var(--spacing-2);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-tertiary);
        background: transparent;
        border: none;
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: all var(--transition-fast);
      }

      .type-tab:hover {
        color: var(--color-text-secondary);
      }

      .type-tab.active {
        color: var(--color-text-primary);
        background: var(--color-bg-elevated);
      }

      .side-toggle {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-2);
      }

      .side-btn {
        padding: var(--spacing-2) var(--spacing-3);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        border: 1px solid var(--color-border-primary);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all var(--transition-fast);
      }

      .side-btn.buy {
        color: var(--color-text-tertiary);
        background: transparent;
      }

      .side-btn.buy:hover {
        border-color: var(--color-success);
        color: var(--color-success);
      }

      .side-btn.buy.active {
        background: var(--color-success);
        border-color: var(--color-success);
        color: white;
      }

      .side-btn.sell {
        color: var(--color-text-tertiary);
        background: transparent;
      }

      .side-btn.sell:hover {
        border-color: var(--color-danger);
        color: var(--color-danger);
      }

      .side-btn.sell.active {
        background: var(--color-danger);
        border-color: var(--color-danger);
        color: white;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-1);
      }

      .form-label {
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-tertiary);
      }

      .input-with-suffix {
        position: relative;
        display: flex;
        align-items: center;
      }

      .form-input {
        width: 100%;
        padding: var(--spacing-2) var(--spacing-3);
        padding-right: 60px;
        font-size: var(--font-size-sm);
        font-family: var(--font-family-mono);
        color: var(--color-text-primary);
        background: var(--color-bg-tertiary);
        border: 1px solid var(--color-border-primary);
        border-radius: var(--radius-md);
        outline: none;
        transition: all var(--transition-fast);
      }

      .form-input:focus {
        border-color: var(--color-accent-500);
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
      }

      .form-input::placeholder {
        color: var(--color-text-muted);
      }

      .input-suffix {
        position: absolute;
        right: var(--spacing-3);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-tertiary);
      }

      .percentage-btns {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--spacing-1);
      }

      .pct-btn {
        padding: var(--spacing-1);
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
        background: var(--color-bg-card);
        border: 1px solid var(--color-border-primary);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: all var(--transition-fast);
      }

      .pct-btn:hover {
        color: var(--color-text-primary);
        border-color: var(--color-border-secondary);
      }

      .balance-info {
        display: flex;
        justify-content: space-between;
        font-size: var(--font-size-xs);
      }

      .balance-label {
        color: var(--color-text-tertiary);
      }

      .balance-value {
        color: var(--color-text-secondary);
        font-family: var(--font-family-mono);
      }

      .fee-info {
        display: flex;
        justify-content: space-between;
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
        padding-top: var(--spacing-2);
        border-top: 1px solid var(--color-border-primary);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TradeFormComponent {
  pair = input.required<TradingPair>();
  orderSubmit = output<OrderData>();

  private readonly walletService = inject(WalletService);

  orderType = signal<'limit' | 'market'>('limit');
  side = signal<'buy' | 'sell'>('buy');
  price = signal<number | null>(null);
  amount = signal<number>(0);

  percentages = [25, 50, 75, 100];

  // Available balances
  quoteBalance = signal<number>(0);
  baseBalance = signal<number>(0);

  constructor() {
    // Load balances when component initializes
    this.loadBalances();

    // Reload balances when pair changes
    effect(() => {
      this.pair();
      this.loadBalances();
    });
  }

  private loadBalances(): void {
    const pair = this.pair();
    const baseAsset = pair.baseAsset;
    const quoteAsset = pair.quoteAsset;

    // Load base asset balance
    this.walletService.getBalance(baseAsset).subscribe({
      next: (balance) => {
        this.baseBalance.set(parseFloat(balance.available));
      },
      error: () => {
        this.baseBalance.set(0);
      },
    });

    // Load quote asset balance
    this.walletService.getBalance(quoteAsset).subscribe({
      next: (balance) => {
        this.quoteBalance.set(parseFloat(balance.available));
      },
      error: () => {
        this.quoteBalance.set(0);
      },
    });
  }

  total = computed(() => {
    const p = this.orderType() === 'limit' ? this.price() : this.pair().price;
    return (p ?? 0) * this.amount();
  });

  estimatedFee = computed(() => this.total() * 0.001);

  setPercentage(pct: number): void {
    // Calculate amount based on percentage of available balance
    const availableBalance = this.side() === 'buy' ? this.quoteBalance() : this.baseBalance();
    if (this.side() === 'buy') {
      const buyPrice =
        this.orderType() === 'limit' ? (this.price() ?? this.pair().price) : this.pair().price;
      if (buyPrice > 0) {
        this.amount.set((availableBalance * pct) / 100 / buyPrice);
      }
    } else {
      this.amount.set((availableBalance * pct) / 100);
    }
  }

  onTotalChange(newTotal: number): void {
    const p = this.orderType() === 'limit' ? this.price() : this.pair().price;
    if (p && p > 0) {
      this.amount.set(newTotal / p);
    }
  }

  submitOrder(): void {
    this.orderSubmit.emit({
      side: this.side(),
      type: this.orderType(),
      price: this.orderType() === 'limit' ? this.price() ?? undefined : undefined,
      amount: this.amount(),
      total: this.total(),
    });
  }
}
