import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerkleSnapshot } from './entities/merkle-snapshot.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import { randomBytes } from 'crypto';

@Injectable()
export class ReservesService {
  private readonly logger = new Logger(ReservesService.name);

  constructor(
    @InjectRepository(MerkleSnapshot)
    private readonly snapshotRepository: Repository<MerkleSnapshot>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailySnapshot() {
    this.logger.log('Starting daily Proof of Reserves snapshot generation...');
    
    // Simulate fetching all user balances
    // In reality: User Service -> Get all (userId, balance, currency)
    const mockUsers = Array.from({ length: 100 }, (_, i) => ({
      userId: `user_${i}`,
      balance: Math.random() * 10,
    }));

    // Prepare leaves: hash(userId + balance + nonce)
    const leaves = mockUsers.map(u => 
      keccak256(`${u.userId}:${u.balance}:${randomBytes(8).toString('hex')}`)
    );

    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const root = tree.getHexRoot();
    const totalLiabilities = mockUsers.reduce((acc, u) => acc + u.balance, 0);

    const snapshot = this.snapshotRepository.create({
      rootHash: root,
      blockHeight: 12345678, // Mock block height
      totalLiabilities: totalLiabilities.toString(),
      metadata: {
        leavesCount: leaves.length,
        currency: 'BTC',
      },
    });

    await this.snapshotRepository.save(snapshot);
    this.logger.log(`Snapshot generated: ${root}`);
  }

  async getLatestSnapshot(): Promise<MerkleSnapshot | null> {
    return this.snapshotRepository.findOne({
      where: {},
      order: { createdAt: 'DESC' },
    });
  }

  async verifyUser(userId: string, balance: number, nonce: string, rootHash: string): Promise<boolean> {
    // In a real verification, we'd need to reconstruct the tree or store proofs
    // This is a simplified mock verification
    this.logger.log(`Verifying user ${userId} with balance ${balance} and nonce ${nonce} against root ${rootHash}`);
    return true; // Simplified for MVP
  }
}
