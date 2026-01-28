import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NftCollection } from '../../../entities/nft-collection.entity';
import { BlockchainService } from '../blockchain/blockchain.service';
import { IpfsService } from '../ipfs/ipfs.service';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(NftCollection)
    private collectionsRepository: Repository<NftCollection>,
    private blockchainService: BlockchainService,
    private _ipfsService: IpfsService,
  ) {}

  async createCollection(data: {
    contractAddress: string;
    name: string;
    symbol: string;
    description?: string;
    collectionType: 'ERC721' | 'ERC1155';
    creatorAddress: string;
    chainId: number;
    bannerImageUrl?: string;
    profileImageUrl?: string;
    category?: string;
    royaltyRecipient?: string;
    royaltyPercentage?: number;
  }): Promise<NftCollection> {
    // Validate contract address
    if (!this.blockchainService.isValidAddress(data.contractAddress)) {
      throw new BadRequestException('Invalid contract address');
    }

    // Check if collection already exists
    const existing = await this.collectionsRepository.findOne({
      where: { contractAddress: data.contractAddress.toLowerCase() },
    });

    if (existing) {
      throw new BadRequestException('Collection already exists');
    }

    // Verify contract on blockchain
    const interfaceIds = {
      ERC721: '0x80ac58cd',
      ERC1155: '0xd9b67a26',
    };

    const supportsInterface = await this.blockchainService.supportsInterface(
      data.contractAddress,
      interfaceIds[data.collectionType],
      data.chainId,
    );

    if (!supportsInterface) {
      throw new BadRequestException(`Contract does not support ${data.collectionType}`);
    }

    const collection = this.collectionsRepository.create({
      contractAddress: data.contractAddress.toLowerCase(),
      name: data.name,
      symbol: data.symbol,
      description: data.description,
      collectionType: data.collectionType,
      creatorAddress: data.creatorAddress.toLowerCase(),
      chainId: data.chainId,
      bannerImageUrl: data.bannerImageUrl,
      profileImageUrl: data.profileImageUrl,
      category: data.category,
      royaltyRecipient: data.royaltyRecipient?.toLowerCase(),
      royaltyPercentage: data.royaltyPercentage || 0,
    });

    return await this.collectionsRepository.save(collection);
  }

  async findAll(filters?: {
    chainId?: number;
    category?: string;
    creatorAddress?: string;
    isVerified?: boolean;
    sortBy?: 'volume' | 'floor_price' | 'created_at';
    order?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<{ collections: NftCollection[]; total: number }> {
    const query = this.collectionsRepository.createQueryBuilder('collection');

    if (filters?.chainId) {
      query.andWhere('collection.chainId = :chainId', { chainId: filters.chainId });
    }

    if (filters?.category) {
      query.andWhere('collection.category = :category', { category: filters.category });
    }

    if (filters?.creatorAddress) {
      query.andWhere('collection.creatorAddress = :creatorAddress', {
        creatorAddress: filters.creatorAddress.toLowerCase(),
      });
    }

    if (filters?.isVerified !== undefined) {
      query.andWhere('collection.isVerified = :isVerified', { isVerified: filters.isVerified });
    }

    // Sorting
    const sortBy = filters?.sortBy || 'created_at';
    const order = filters?.order || 'DESC';
    
    if (sortBy === 'volume') {
      query.orderBy('collection.totalVolume', order);
    } else if (sortBy === 'floor_price') {
      query.orderBy('collection.floorPrice', order);
    } else {
      query.orderBy('collection.createdAt', order);
    }

    // Pagination
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;
    query.take(limit).skip(offset);

    const [collections, total] = await query.getManyAndCount();

    return { collections, total };
  }

  async findOne(id: string): Promise<NftCollection> {
    const collection = await this.collectionsRepository.findOne({
      where: { id },
      relations: ['nfts'],
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return collection;
  }

  async findByContractAddress(contractAddress: string, chainId: number): Promise<NftCollection> {
    const collection = await this.collectionsRepository.findOne({
      where: {
        contractAddress: contractAddress.toLowerCase(),
        chainId,
      },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return collection;
  }

  async updateCollection(
    id: string,
    updates: {
      description?: string;
      bannerImageUrl?: string;
      profileImageUrl?: string;
      category?: string;
      royaltyRecipient?: string;
      royaltyPercentage?: number;
    },
  ): Promise<NftCollection> {
    const collection = await this.findOne(id);

    Object.assign(collection, updates);

    return await this.collectionsRepository.save(collection);
  }

  async verifyCollection(id: string, isVerified: boolean): Promise<NftCollection> {
    const collection = await this.findOne(id);
    collection.isVerified = isVerified;
    return await this.collectionsRepository.save(collection);
  }

  async updateStats(collectionId: string, stats: {
    totalSupply?: string;
    floorPrice?: string;
    totalVolume?: string;
  }): Promise<NftCollection> {
    const collection = await this.findOne(collectionId);

    if (stats.totalSupply !== undefined) {
      collection.totalSupply = stats.totalSupply;
    }

    if (stats.floorPrice !== undefined) {
      collection.floorPrice = stats.floorPrice;
    }

    if (stats.totalVolume !== undefined) {
      collection.totalVolume = stats.totalVolume;
    }

    return await this.collectionsRepository.save(collection);
  }

  async incrementVolume(collectionId: string, amount: string): Promise<void> {
    await this.collectionsRepository.increment(
      { id: collectionId },
      'totalVolume',
      amount,
    );
  }

  async getCollectionStats(id: string): Promise<{
    totalSupply: string;
    floorPrice: string;
    totalVolume: string;
    owners: number;
    listed: number;
  }> {
    const collection = await this.findOne(id);

    // These would be calculated from NFT data
    const stats = await this.collectionsRepository
      .createQueryBuilder('collection')
      .leftJoin('collection.nfts', 'nft')
      .leftJoin('nft.listings', 'listing', 'listing.status = :status', { status: 'ACTIVE' })
      .where('collection.id = :id', { id })
      .select('COUNT(DISTINCT nft.ownerAddress)', 'owners')
      .addSelect('COUNT(DISTINCT listing.id)', 'listed')
      .getRawOne();

    return {
      totalSupply: collection.totalSupply,
      floorPrice: collection.floorPrice || '0',
      totalVolume: collection.totalVolume,
      owners: parseInt(stats.owners) || 0,
      listed: parseInt(stats.listed) || 0,
    };
  }

  async getTrendingCollections(chainId?: number, limit = 10): Promise<NftCollection[]> {
    const query = this.collectionsRepository
      .createQueryBuilder('collection')
      .orderBy('collection.totalVolume', 'DESC')
      .take(limit);

    if (chainId) {
      query.where('collection.chainId = :chainId', { chainId });
    }

    return await query.getMany();
  }
}
