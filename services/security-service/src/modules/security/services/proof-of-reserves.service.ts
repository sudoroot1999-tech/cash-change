import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProofOfReserves } from '../entities/proof-of-reserves.entity';
import Decimal from 'decimal.js';
import * as crypto from 'crypto';

export interface ReserveData {
  currency: string;
  totalReserves: string;
  totalLiabilities: string;
  walletAddresses: string[];
  blockHeight?: string;
}

@Injectable()
export class ProofOfReservesService {
  private readonly logger = new Logger(ProofOfReservesService.name);

  constructor(
    @InjectRepository(ProofOfReserves)
    private proofOfReservesRepository: Repository<ProofOfReserves>,
  ) {}

  /**
   * Create proof of reserves snapshot
   */
  async createProofOfReserves(data: ReserveData): Promise<ProofOfReserves> {
    const reserves = new Decimal(data.totalReserves);
    const liabilities = new Decimal(data.totalLiabilities);
    
    // Calculate reserve ratio (reserves / liabilities * 100)
    const reserveRatio = liabilities.greaterThan(0)
      ? reserves.dividedBy(liabilities).times(100).toNumber()
      : 100;

    // Generate Merkle root for user balances
    const merkleRoot = await this.generateMerkleRoot(data.currency);

    const proof = this.proofOfReservesRepository.create({
      currency: data.currency,
      totalReserves: data.totalReserves,
      totalLiabilities: data.totalLiabilities,
      reserveRatio,
      merkleRoot,
      walletAddresses: data.walletAddresses,
      blockHeight: data.blockHeight,
      isVerified: false,
    });

    await this.proofOfReservesRepository.save(proof);
    this.logger.log(`Proof of reserves created for ${data.currency}`);
    
    return proof;
  }

  /**
   * Generate Merkle tree root for user balances
   */
  async generateMerkleRoot(currency: string): Promise<string> {
    // In production, this would:
    // 1. Fetch all user balances for the currency
    // 2. Hash each balance
    // 3. Build Merkle tree
    // 4. Return root hash
    
    // Simplified implementation
    const timestamp = Date.now().toString();
    return crypto.createHash('sha256').update(timestamp + currency).digest('hex');
  }

  /**
   * Verify user balance in Merkle tree
   */
  async verifyUserBalance(
    userId: string,
    currency: string,
    balance: string,
    merkleProof: string[],
  ): Promise<boolean> {
    // In production, this would verify the Merkle proof
    // For now, return true if proof exists
    
    return merkleProof.length > 0;
  }

  /**
   * Get latest proof of reserves
   */
  async getLatestProof(currency: string): Promise<ProofOfReserves | null> {
    return await this.proofOfReservesRepository.findOne({
      where: { currency },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all proofs for currency
   */
  async getProofHistory(currency: string, limit: number = 50): Promise<ProofOfReserves[]> {
    return await this.proofOfReservesRepository.find({
      where: { currency },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Mark proof as verified by auditor
   */
  async verifyProof(
    proofId: string,
    auditorName: string,
    auditFileUrl: string,
  ): Promise<ProofOfReserves> {
    const proof = await this.proofOfReservesRepository.findOne({
      where: { id: proofId },
    });

    if (!proof) {
      throw new Error('Proof not found');
    }

    proof.isVerified = true;
    proof.verifiedAt = new Date();
    proof.auditorName = auditorName;
    proof.auditFileUrl = auditFileUrl;

    await this.proofOfReservesRepository.save(proof);
    this.logger.log(`Proof of reserves verified: ${proofId}`);
    
    return proof;
  }

  /**
   * Check solvency
   */
  async checkSolvency(currency: string): Promise<{
    isSolvent: boolean;
    reserveRatio: number;
    reserves: string;
    liabilities: string;
  }> {
    const latestProof = await this.getLatestProof(currency);

    if (!latestProof) {
      throw new Error('No proof of reserves found');
    }

    const isSolvent = latestProof.reserveRatio >= 100;

    return {
      isSolvent,
      reserveRatio: latestProof.reserveRatio,
      reserves: latestProof.totalReserves,
      liabilities: latestProof.totalLiabilities,
    };
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(currency: string): Promise<any> {
    const proofs = await this.getProofHistory(currency, 12); // Last 12 reports
    
    const report = {
      currency,
      totalReports: proofs.length,
      latestReserveRatio: proofs[0]?.reserveRatio || 0,
      averageReserveRatio: this.calculateAverage(proofs.map(p => p.reserveRatio)),
      lowestReserveRatio: Math.min(...proofs.map(p => p.reserveRatio)),
      verifiedCount: proofs.filter(p => p.isVerified).length,
      unverifiedCount: proofs.filter(p => !p.isVerified).length,
      history: proofs.map(p => ({
        date: p.createdAt,
        reserveRatio: p.reserveRatio,
        reserves: p.totalReserves,
        liabilities: p.totalLiabilities,
        isVerified: p.isVerified,
      })),
    };

    return report;
  }

  /**
   * Calculate reserve deficit or surplus
   */
  async calculateDeficit(currency: string): Promise<{
    hasDeficit: boolean;
    amount: string;
  }> {
    const latestProof = await this.getLatestProof(currency);

    if (!latestProof) {
      throw new Error('No proof of reserves found');
    }

    const reserves = new Decimal(latestProof.totalReserves);
    const liabilities = new Decimal(latestProof.totalLiabilities);
    const deficit = liabilities.minus(reserves);

    return {
      hasDeficit: deficit.greaterThan(0),
      amount: deficit.abs().toString(),
    };
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }
}
