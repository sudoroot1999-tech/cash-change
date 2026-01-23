import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
  effect,
  untracked,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  templateUrl: './trade-form.component.html',
  styleUrls: ['./trade-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TradeFormComponent {
  pair = input.required<TradingPair>();
  orderSubmit = output<OrderData>();

  private readonly walletService = inject(WalletService);
  private readonly destroyRef = inject(DestroyRef);

  orderType = signal<'limit' | 'market'>('limit');
  side = signal<'buy' | 'sell'>('buy');
  price = signal<number | null>(null);
  amount = signal<number>(0);

  percentages = [25, 50, 75, 100];

  // Available balances
  quoteBalance = signal<number>(0);
  baseBalance = signal<number>(0);

  // Track the last loaded pair to prevent duplicate loads
  private lastLoadedPair: string | null = null;

  constructor() {
    // Reload balances when pair changes - use untracked to prevent loop
    effect(() => {
      const currentPair = this.pair();
      const pairKey = `${currentPair.baseAsset}-${currentPair.quoteAsset}`;

      // Only load if pair actually changed
      untracked(() => {
        if (this.lastLoadedPair !== pairKey) {
          this.lastLoadedPair = pairKey;
          this.loadBalances();
        }
      });
    });
  }

  private loadBalances(): void {
    const pair = this.pair();
    const baseAsset = pair.baseAsset;
    const quoteAsset = pair.quoteAsset;

    // Load base asset balance with proper cleanup
    this.walletService.getBalance(baseAsset).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (balance) => {
        this.baseBalance.set(parseFloat(balance.available));
      },
      error: () => {
        this.baseBalance.set(0);
      },
    });

    // Load quote asset balance with proper cleanup
    this.walletService.getBalance(quoteAsset).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
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
