import { Component, ChangeDetectionStrategy, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardComponent } from '@/components/card/card.component';
import { ButtonComponent } from '@/components/button/button.component';
import { BadgeComponent } from '@/components/badge/badge.component';
import { AuthService } from '../../../../core/services/auth.service';
import { WalletService, Wallet } from '../../../../core/services/wallet.service';

interface WalletBalance {
  asset: string;
  name: string;
  available: number;
  locked: number;
  usdValue: number;
  change24h: number;
}

@Component({
  selector: 'app-wallet-overview',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink, CardComponent, ButtonComponent, BadgeComponent],
  template: `
    <div class="wallet-page">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Wallet</h1>
          <p class="page-subtitle">Manage your crypto assets</p>
        </div>
        <div class="header-actions">
          <ui-button variant="secondary">Deposit</ui-button>
          <ui-button variant="secondary">Withdraw</ui-button>
          <ui-button variant="primary">Transfer</ui-button>
        </div>
      </div>

      <!-- Portfolio Overview -->
      <div class="portfolio-section">
        <ui-card variant="elevated">
          <div class="portfolio-content">
            <div class="portfolio-main">
              <span class="portfolio-label">Total Balance</span>
              <div class="portfolio-value">
                <span class="currency-symbol">$</span>
                <span class="value-amount">{{ totalBalance() | number: '1.2-2' }}</span>
              </div>
              <div class="portfolio-change positive">
                <svg class="change-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                    transform="rotate(180 10 10)"
                  />
                </svg>
                +$1,234.56 (2.34%) today
              </div>
            </div>

            <div class="portfolio-breakdown">
              <div class="breakdown-item">
                <span class="breakdown-label">Available</span>
                <span class="breakdown-value">{{ availableBalance() | number: '1.2-2' }}</span>
              </div>
              <div class="breakdown-item">
                <span class="breakdown-label">In Orders</span>
                <span class="breakdown-value">{{ lockedBalance() | number: '1.2-2' }}</span>
              </div>
              <div class="breakdown-item">
                <span class="breakdown-label">Assets</span>
                <span class="breakdown-value">{{ balances().length }}</span>
              </div>
            </div>
          </div>
        </ui-card>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <ui-card variant="interactive">
          <div class="action-content">
            <div class="action-icon">💳</div>
            <div class="action-info">
              <span class="action-title">Buy Crypto</span>
              <span class="action-desc">Purchase with card or bank</span>
            </div>
          </div>
        </ui-card>
        <ui-card variant="interactive">
          <div class="action-content">
            <div class="action-icon">🔄</div>
            <div class="action-info">
              <span class="action-title">Convert</span>
              <span class="action-desc">Swap between assets</span>
            </div>
          </div>
        </ui-card>
        <ui-card variant="interactive">
          <div class="action-content">
            <div class="action-icon">📊</div>
            <div class="action-info">
              <span class="action-title">Earn</span>
              <span class="action-desc">Stake and earn rewards</span>
            </div>
          </div>
        </ui-card>
        <ui-card variant="interactive">
          <div class="action-content">
            <div class="action-icon">📜</div>
            <div class="action-info">
              <span class="action-title">History</span>
              <span class="action-desc">View transactions</span>
            </div>
          </div>
        </ui-card>
      </div>

      <!-- Balances Table -->
      <ui-card variant="elevated" [noPadding]="true">
        <div class="table-header">
          <h2 class="table-title">Your Assets</h2>
          <div class="table-filters">
            <label class="hide-small-checkbox">
              <input
                type="checkbox"
                [checked]="hideSmallBalances()"
                (change)="hideSmallBalances.set(!hideSmallBalances())"
              />
              <span>Hide small balances</span>
            </label>
          </div>
        </div>

        <div class="table-container">
          <table class="balances-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th class="text-right">Available</th>
                <th class="text-right">In Orders</th>
                <th class="text-right">USD Value</th>
                <th class="text-right">24h Change</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (balance of filteredBalances(); track balance.asset) {
                <tr class="balance-row">
                  <td>
                    <div class="asset-info">
                      <div class="asset-icon" [style.background]="getCoinColor(balance.asset)">
                        {{ balance.asset.charAt(0) }}
                      </div>
                      <div class="asset-details">
                        <span class="asset-name">{{ balance.name }}</span>
                        <span class="asset-symbol">{{ balance.asset }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="text-right mono">{{ balance.available | number: '1.4-4' }}</td>
                  <td class="text-right mono text-muted">{{ balance.locked | number: '1.4-4' }}</td>
                  <td class="text-right mono">{{ balance.usdValue | number: '1.2-2' }}</td>
                  <td class="text-right">
                    <span
                      class="change"
                      [class.positive]="balance.change24h >= 0"
                      [class.negative]="balance.change24h < 0"
                    >
                      {{ balance.change24h >= 0 ? '+' : ''
                      }}{{ balance.change24h | number: '1.2-2' }}%
                    </span>
                  </td>
                  <td class="text-right">
                    <div class="row-actions">
                      <a [routerLink]="['/trade', balance.asset + 'USDT']" class="action-link"
                        >Trade</a
                      >
                      <button class="action-link">Deposit</button>
                      <button class="action-link">Withdraw</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </ui-card>
    </div>
  `,
  styles: [
    `
      .wallet-page {
        padding: var(--spacing-6);
        max-width: 1440px;
        margin: 0 auto;
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--spacing-6);
      }

      .page-title {
        font-size: var(--font-size-3xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-primary);
        margin: 0 0 var(--spacing-1) 0;
      }

      .page-subtitle {
        font-size: var(--font-size-base);
        color: var(--color-text-secondary);
        margin: 0;
      }

      .header-actions {
        display: flex;
        gap: var(--spacing-2);
      }

      .portfolio-section {
        margin-bottom: var(--spacing-6);
      }

      .portfolio-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .portfolio-label {
        font-size: var(--font-size-sm);
        color: var(--color-text-tertiary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .portfolio-value {
        display: flex;
        align-items: baseline;
        gap: var(--spacing-1);
        margin: var(--spacing-2) 0;
      }

      .currency-symbol {
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-secondary);
      }

      .value-amount {
        font-size: var(--font-size-5xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-primary);
        font-family: var(--font-family-mono);
      }

      .portfolio-change {
        display: flex;
        align-items: center;
        gap: var(--spacing-1);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
      }

      .portfolio-change.positive {
        color: var(--color-success);
      }

      .change-icon {
        width: 16px;
        height: 16px;
      }

      .portfolio-breakdown {
        display: flex;
        gap: var(--spacing-8);
      }

      .breakdown-item {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-1);
      }

      .breakdown-label {
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
      }

      .breakdown-value {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
      }

      .quick-actions {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--spacing-4);
        margin-bottom: var(--spacing-6);
      }

      .action-content {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
      }

      .action-icon {
        font-size: var(--font-size-2xl);
      }

      .action-info {
        display: flex;
        flex-direction: column;
      }

      .action-title {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
      }

      .action-desc {
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
      }

      .table-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-4);
        border-bottom: 1px solid var(--color-border-primary);
      }

      .table-title {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
        margin: 0;
      }

      .hide-small-checkbox {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        cursor: pointer;
      }

      .table-container {
        overflow-x: auto;
      }

      .balances-table {
        width: 100%;
        border-collapse: collapse;
      }

      .balances-table th {
        padding: var(--spacing-3) var(--spacing-4);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-tertiary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        text-align: left;
        border-bottom: 1px solid var(--color-border-primary);
        background: var(--color-bg-tertiary);
      }

      .balances-table td {
        padding: var(--spacing-3) var(--spacing-4);
        border-bottom: 1px solid var(--color-border-primary);
      }

      .balance-row:hover {
        background: var(--color-bg-card-hover);
      }

      .text-right {
        text-align: right;
      }

      .mono {
        font-family: var(--font-family-mono);
      }

      .text-muted {
        color: var(--color-text-tertiary);
      }

      .asset-info {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
      }

      .asset-icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-bold);
        color: white;
      }

      .asset-details {
        display: flex;
        flex-direction: column;
      }

      .asset-name {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
      }

      .asset-symbol {
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
      }

      .change.positive {
        color: var(--color-success);
      }

      .change.negative {
        color: var(--color-danger);
      }

      .row-actions {
        display: flex;
        gap: var(--spacing-2);
      }

      .action-link {
        padding: var(--spacing-1) var(--spacing-2);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        color: var(--color-accent-400);
        background: transparent;
        border: none;
        cursor: pointer;
        text-decoration: none;
        transition: color var(--transition-fast);
      }

      .action-link:hover {
        color: var(--color-accent-300);
      }

      @media (max-width: 1024px) {
        .quick-actions {
          grid-template-columns: repeat(2, 1fr);
        }

        .portfolio-content {
          flex-direction: column;
          align-items: flex-start;
          gap: var(--spacing-4);
        }
      }

      @media (max-width: 768px) {
        .wallet-page {
          padding: var(--spacing-4);
        }

        .page-header {
          flex-direction: column;
          gap: var(--spacing-4);
        }

        .header-actions {
          width: 100%;
        }

        .quick-actions {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletOverviewComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly walletService = inject(WalletService);

  hideSmallBalances = signal(false);
  isLoading = signal(false);

  wallets = signal<Wallet[]>([]);
  balances = signal<WalletBalance[]>([]);
  
  filteredBalances = computed(() => {
    const balances = this.balances();
    if (this.hideSmallBalances()) {
      return balances.filter((b) => b.usdValue >= 1);
    }
    return balances;
  });

  totalBalance = computed(() => {
    return this.balances().reduce((sum, b) => sum + b.usdValue, 0);
  });

  availableBalance = computed(() => {
    return this.balances().reduce((sum, b) => sum + (b.available * this.getAssetPrice(b.asset)), 0);
  });

  lockedBalance = computed(() => {
    return this.balances().reduce((sum, b) => sum + (b.locked * this.getAssetPrice(b.asset)), 0);
  });

  ngOnInit(): void {
    this.loadWallets();
  }

  private loadWallets(): void {
    this.isLoading.set(true);
    this.walletService.getUserWallets().subscribe({
      next: (wallets) => {
        this.wallets.set(wallets);
        this.convertWalletsToBalances(wallets);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load wallets:', error);
        this.isLoading.set(false);
      },
    });
  }

  private convertWalletsToBalances(wallets: Wallet[]): void {
    const balances: WalletBalance[] = wallets.map((wallet) => {
      const available = parseFloat(wallet.availableBalance);
      const locked = parseFloat(wallet.lockedBalance);
      const price = this.getAssetPrice(wallet.assetId);
      const usdValue = (available + locked) * price;

      return {
        asset: wallet.assetId,
        name: this.getAssetName(wallet.assetId),
        available,
        locked,
        usdValue,
        change24h: 0, // Would need to fetch from market data
      };
    });

    this.balances.set(balances);
  }

  private getAssetPrice(asset: string): number {
    // Mock prices - in production, fetch from market data service
    const prices: Record<string, number> = {
      BTC: 43000,
      ETH: 2300,
      USDT: 1,
      SOL: 98,
      BNB: 310,
      USDC: 1,
    };
    return prices[asset] || 0;
  }

  private getAssetName(asset: string): string {
    const names: Record<string, string> = {
      BTC: 'Bitcoin',
      ETH: 'Ethereum',
      USDT: 'Tether',
      SOL: 'Solana',
      BNB: 'BNB',
      USDC: 'USD Coin',
    };
    return names[asset] || asset;
  }

  getCoinColor(symbol: string): string {
    const colors: Record<string, string> = {
      BTC: '#F7931A',
      ETH: '#627EEA',
      USDT: '#26A17B',
      SOL: '#9945FF',
      BNB: '#F3BA2F',
    };
    return colors[symbol] || '#6366f1';
  }
}
