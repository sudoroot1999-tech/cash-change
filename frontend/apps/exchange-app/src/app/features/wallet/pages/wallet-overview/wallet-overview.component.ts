import { Component, ChangeDetectionStrategy, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardComponent } from '@/components/card/card.component';
import { ButtonComponent } from '@/components/button/button.component';
import { BadgeComponent } from '@/components/badge/badge.component';
import { AuthService } from '../../../../core/services/auth.service';
import { WalletService, Wallet, WalletBalance } from '../../../../core/services/wallet.service';

@Component({
  selector: 'app-wallet-overview',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink, CardComponent, ButtonComponent, BadgeComponent],
  templateUrl: './wallet-overview.component.html',
  styleUrls: ['./wallet-overview.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletOverviewComponent implements OnInit {
  private readonly authService = inject(AuthService);
  readonly walletService = inject(WalletService);

  hideSmallBalances = signal(false);
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
    console.log('[WalletOverviewComponent] Initializing...');
    this.loadWallets();
  }

  private loadWallets(): void {
    console.log('[WalletOverviewComponent] Loading wallets...');

    this.walletService.getUserWallets().subscribe({
      next: (wallets) => {
        console.log('[WalletOverviewComponent] Received wallets:', wallets);
        this.convertWalletsToBalances(wallets);
      },
      error: (error) => {
        console.error('[WalletOverviewComponent] Error loading wallets:', error);
      },
    });
  }

  retryLoad(): void {
    console.log('[WalletOverviewComponent] Retrying load...');
    this.walletService.clearCache();
    this.loadWallets();
  }

  private convertWalletsToBalances(wallets: Wallet[]): void {
    console.log('[WalletOverviewComponent] Converting wallets to balances...');

    const balances: WalletBalance[] = wallets.map((wallet) => {
      const available = parseFloat(wallet.availableBalance) || 0;
      const locked = parseFloat(wallet.lockedBalance) || 0;
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

    console.log('[WalletOverviewComponent] Converted balances:', balances);
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