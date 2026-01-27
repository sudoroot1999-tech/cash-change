import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockchainService } from './blockchain.service';
import {
  AAVE_LENDING_POOL_ABI,
  UNISWAP_V2_ROUTER_ABI,
  COMPOUND_COMPTROLLER_ABI,
  ERC20_ABI,
} from './contract-abis';

@Injectable()
export class ExternalDeFiService {
  private readonly logger = new Logger(ExternalDeFiService.name);
  private readonly aaveLendingPool: string;
  private readonly uniswapV2Router: string;
  private readonly compoundComptroller: string;

  constructor(
    private blockchainService: BlockchainService,
    private configService: ConfigService,
  ) {
    this.aaveLendingPool = this.configService.get<string>('AAVE_LENDING_POOL', '');
    this.uniswapV2Router = this.configService.get<string>('UNISWAP_V2_ROUTER', '');
    this.compoundComptroller = this.configService.get<string>('COMPOUND_COMPTROLLER', '');
  }

  // AAVE Integration
  async depositToAave(
    asset: string,
    amount: string,
    userAddress: string,
  ): Promise<string> {
    const contract = await this.blockchainService.getContract(
      this.aaveLendingPool,
      AAVE_LENDING_POOL_ABI,
    );

    try {
      // Approve token first
      await this.approveToken(asset, this.aaveLendingPool, amount);

      const tx = await contract.deposit(
        asset,
        this.blockchainService.parseEther(amount),
        userAddress,
        0, // referralCode
      );

      const receipt = await tx.wait();
      this.logger.log(`Deposited to Aave: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to deposit to Aave: ${err.message}`);
      throw error;
    }
  }

  async borrowFromAave(
    asset: string,
    amount: string,
    userAddress: string,
  ): Promise<string> {
    const contract = await this.blockchainService.getContract(
      this.aaveLendingPool,
      AAVE_LENDING_POOL_ABI,
    );

    try {
      const tx = await contract.borrow(
        asset,
        this.blockchainService.parseEther(amount),
        2, // Variable interest rate
        0, // referralCode
        userAddress,
      );

      const receipt = await tx.wait();
      this.logger.log(`Borrowed from Aave: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to borrow from Aave: ${err.message}`);
      throw error;
    }
  }

  async getAaveAccountData(userAddress: string): Promise<{
    totalCollateral: string;
    totalDebt: string;
    availableBorrows: string;
    healthFactor: string;
  }> {
    const contract = await this.blockchainService.getContract(
      this.aaveLendingPool,
      AAVE_LENDING_POOL_ABI,
    );

    const data = await contract.getUserAccountData(userAddress);

    return {
      totalCollateral: this.blockchainService.formatEther(data.totalCollateralETH),
      totalDebt: this.blockchainService.formatEther(data.totalDebtETH),
      availableBorrows: this.blockchainService.formatEther(data.availableBorrowsETH),
      healthFactor: this.blockchainService.formatEther(data.healthFactor),
    };
  }

  // Uniswap Integration
  async addLiquidityToUniswap(
    tokenA: string,
    tokenB: string,
    amountA: string,
    amountB: string,
    minAmountA: string,
    minAmountB: string,
    userAddress: string,
  ): Promise<string> {
    const contract = await this.blockchainService.getContract(
      this.uniswapV2Router,
      UNISWAP_V2_ROUTER_ABI,
    );

    try {
      // Approve both tokens
      await this.approveToken(tokenA, this.uniswapV2Router, amountA);
      await this.approveToken(tokenB, this.uniswapV2Router, amountB);

      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

      const tx = await contract.addLiquidity(
        tokenA,
        tokenB,
        this.blockchainService.parseEther(amountA),
        this.blockchainService.parseEther(amountB),
        this.blockchainService.parseEther(minAmountA),
        this.blockchainService.parseEther(minAmountB),
        userAddress,
        deadline,
      );

      const receipt = await tx.wait();
      this.logger.log(`Added liquidity to Uniswap: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to add liquidity to Uniswap: ${err.message}`);
      throw error;
    }
  }

  async swapOnUniswap(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    minAmountOut: string,
    userAddress: string,
  ): Promise<string> {
    const contract = await this.blockchainService.getContract(
      this.uniswapV2Router,
      UNISWAP_V2_ROUTER_ABI,
    );

    try {
      await this.approveToken(tokenIn, this.uniswapV2Router, amountIn);

      const path = [tokenIn, tokenOut];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      const tx = await contract.swapExactTokensForTokens(
        this.blockchainService.parseEther(amountIn),
        this.blockchainService.parseEther(minAmountOut),
        path,
        userAddress,
        deadline,
      );

      const receipt = await tx.wait();
      this.logger.log(`Swapped on Uniswap: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to swap on Uniswap: ${err.message}`);
      throw error;
    }
  }

  async getUniswapPrice(tokenIn: string, tokenOut: string, amountIn: string): Promise<string> {
    const contract = await this.blockchainService.getContract(
      this.uniswapV2Router,
      UNISWAP_V2_ROUTER_ABI,
    );

    const path = [tokenIn, tokenOut];
    const amounts = await contract.getAmountsOut(
      this.blockchainService.parseEther(amountIn),
      path,
    );

    return this.blockchainService.formatEther(amounts[1]);
  }

  // Compound Integration
  async supplyToCompound(cToken: string, amount: string): Promise<string> {
    // Implementation would interact with Compound's cToken contracts
    this.logger.log(`Supplying to Compound: ${cToken}, amount: ${amount}`);
    // Simplified - actual implementation would be more complex
    return '0x...';
  }

  async claimCompRewards(userAddress: string): Promise<string> {
    const contract = await this.blockchainService.getContract(
      this.compoundComptroller,
      COMPOUND_COMPTROLLER_ABI,
    );

    try {
      const tx = await contract.claimComp(userAddress);
      const receipt = await tx.wait();
      this.logger.log(`Claimed COMP rewards: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to claim COMP rewards: ${err.message}`);
      throw error;
    }
  }

  // Helper function
  private async approveToken(
    tokenAddress: string,
    spender: string,
    amount: string,
  ): Promise<void> {
    const contract = await this.blockchainService.getContract(tokenAddress, ERC20_ABI);

    const allowance = await contract.allowance(
      this.blockchainService.getWallet().address,
      spender,
    );

    if (allowance < this.blockchainService.parseEther(amount)) {
      const tx = await contract.approve(
        spender,
        this.blockchainService.parseEther(amount),
      );
      await tx.wait();
      this.logger.log(`Approved ${amount} tokens for ${spender}`);
    }
  }
}
