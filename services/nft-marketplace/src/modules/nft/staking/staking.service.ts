import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NftStaking, StakingStatus } from '../../../entities/nft-staking.entity';

@Injectable()
export class StakingService {
  constructor(
    @InjectRepository(NftStaking)
    private stakingRepository: Repository<NftStaking>,
  ) {}

  async stakeNFT(nftId: string, stakerAddress: string, poolId: string, chainId: number) {
    const staking = this.stakingRepository.create({
      nftId,
      stakerAddress: stakerAddress.toLowerCase(),
      stakingPoolId: poolId,
      chainId,
    });

    return await this.stakingRepository.save(staking);
  }

  async unstakeNFT(stakingId: string) {
    const staking = await this.stakingRepository.findOne({ where: { id: stakingId } });
    if (staking) {
      staking.unstakedAt = new Date();
      staking.status = StakingStatus.UNSTAKED;
      return await this.stakingRepository.save(staking);
    }
    return null;
  }

  async claimRewards(_stakingId: string) {
    // Calculate and claim rewards
    // TODO: Implement reward claiming logic
    return { message: 'Rewards claimed', amount: '0' };
  }

  async getUserStakes(stakerAddress: string) {
    return await this.stakingRepository.find({
      where: { stakerAddress: stakerAddress.toLowerCase(), status: StakingStatus.ACTIVE },
      relations: ['nft'],
    });
  }
}
