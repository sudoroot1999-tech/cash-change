import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Nft } from '../../../entities/nft.entity';
import { NftTransaction, TransactionType } from '../../../entities/nft-transaction.entity';
import { BlockchainService } from '../blockchain/blockchain.service';
import { IpfsService } from '../ipfs/ipfs.service';
import { CollectionsService } from '../collections/collections.service';
import { ethers } from 'ethers';

@Injectable()
export class NftsService {
  constructor(
    @InjectRepository(Nft)
    private nftsRepository: Repository<Nft>,
    @InjectRepository(NftTransaction)
    private transactionsRepository: Repository<NftTransaction>,
    private blockchainService: BlockchainService,
    private ipfsService: IpfsService,
    private collectionsService: CollectionsService,
  ) {}

  async mintNFT(data: {
    collectionId: string;
    tokenId: string;
    ownerAddress: string;
    creatorAddress: string;
    name: string;
    description?: string;
    imageFile?: Buffer;
    imageUrl?: string;
    attributes?: any[];
    chainId: number;
  }): Promise<Nft> {
    const collection = await this.collectionsService.findOne(data.collectionId);

    // Upload image to IPFS if provided
    let imageUrl = data.imageUrl;
    if (data.imageFile) {
      const imageCid = await this.ipfsService.uploadFile(data.imageFile, `${data.name}.png`);
      imageUrl = this.ipfsService.getGatewayUrl(imageCid);
    }

    // Build metadata
    const metadata = this.ipfsService.buildERC721Metadata({
      name: data.name,
      description: data.description,
      image: imageUrl!,
      attributes: data.attributes,
    });

    // Validate metadata
    const validation = this.ipfsService.validateMetadata(metadata);
    if (!validation.valid) {
      throw new BadRequestException(`Invalid metadata: ${validation.errors.join(', ')}`);
    }

    // Upload metadata to IPFS
    const metadataCid = await this.ipfsService.uploadMetadata(metadata);
    const metadataUri = `ipfs://${metadataCid}`;

    // Create NFT record
    const nft = this.nftsRepository.create({
      collectionId: data.collectionId,
      tokenId: data.tokenId,
      contractAddress: collection.contractAddress,
      ownerAddress: data.ownerAddress.toLowerCase(),
      creatorAddress: data.creatorAddress.toLowerCase(),
      metadataUri,
      metadata,
      name: data.name,
      description: data.description,
      imageUrl,
      attributes: data.attributes,
      chainId: data.chainId,
      isMinted: true,
    });

    return await this.nftsRepository.save(nft);
  }

  async createLazyMintVoucher(data: {
    collectionId: string;
    tokenId: string;
    creatorAddress: string;
    name: string;
    description?: string;
    imageUrl: string;
    attributes?: any[];
    price: string;
    royaltyPercentage: number;
    chainId: number;
  }): Promise<{ nft: Nft; voucher: any; signature: string }> {
    const collection = await this.collectionsService.findOne(data.collectionId);

    // Build metadata
    const metadata = this.ipfsService.buildERC721Metadata({
      name: data.name,
      description: data.description,
      image: data.imageUrl,
      attributes: data.attributes,
    });

    // Upload metadata to IPFS
    const metadataCid = await this.ipfsService.uploadMetadata(metadata);
    const metadataUri = `ipfs://${metadataCid}`;

    // Create voucher
    const voucher = {
      nftContract: collection.contractAddress,
      tokenId: data.tokenId,
      tokenURI: metadataUri,
      creator: data.creatorAddress,
      royaltyPercentage: data.royaltyPercentage * 100, // Convert to basis points
      price: ethers.parseEther(data.price).toString(),
      paymentToken: ethers.ZeroAddress,
      nonce: Date.now(),
    };

    // Sign voucher (EIP-712)
    const domain = {
      name: 'NFTMarketplace',
      version: '1',
      chainId: data.chainId,
      verifyingContract: collection.contractAddress,
    };

    const types = {
      LazyMintVoucher: [
        { name: 'nftContract', type: 'address' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'tokenURI', type: 'string' },
        { name: 'creator', type: 'address' },
        { name: 'royaltyPercentage', type: 'uint256' },
        { name: 'price', type: 'uint256' },
        { name: 'paymentToken', type: 'address' },
        { name: 'nonce', type: 'uint256' },
      ],
    };

    const signature = await this.blockchainService.signTypedData(domain, types, voucher, data.chainId);

    // Create NFT record (not minted yet)
    const nft = this.nftsRepository.create({
      collectionId: data.collectionId,
      tokenId: data.tokenId,
      contractAddress: collection.contractAddress,
      ownerAddress: data.creatorAddress.toLowerCase(),
      creatorAddress: data.creatorAddress.toLowerCase(),
      metadataUri,
      metadata,
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      attributes: data.attributes,
      chainId: data.chainId,
      isMinted: false,
      isLazyMinted: true,
      mintSignature: signature,
      mintVoucher: voucher,
    });

    await this.nftsRepository.save(nft);

    return { nft, voucher, signature };
  }

  async findAll(filters?: {
    collectionId?: string;
    ownerAddress?: string;
    creatorAddress?: string;
    chainId?: number;
    isStaked?: boolean;
    isListed?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ nfts: Nft[]; total: number }> {
    const query = this.nftsRepository.createQueryBuilder('nft')
      .leftJoinAndSelect('nft.collection', 'collection');

    if (filters?.collectionId) {
      query.andWhere('nft.collectionId = :collectionId', { collectionId: filters.collectionId });
    }

    if (filters?.ownerAddress) {
      query.andWhere('nft.ownerAddress = :ownerAddress', {
        ownerAddress: filters.ownerAddress.toLowerCase(),
      });
    }

    if (filters?.creatorAddress) {
      query.andWhere('nft.creatorAddress = :creatorAddress', {
        creatorAddress: filters.creatorAddress.toLowerCase(),
      });
    }

    if (filters?.chainId) {
      query.andWhere('nft.chainId = :chainId', { chainId: filters.chainId });
    }

    if (filters?.isStaked !== undefined) {
      query.andWhere('nft.isStaked = :isStaked', { isStaked: filters.isStaked });
    }

    if (filters?.isListed) {
      query.innerJoin('nft.listings', 'listing', 'listing.status = :status', { status: 'ACTIVE' });
    }

    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;
    query.take(limit).skip(offset);

    const [nfts, total] = await query.getManyAndCount();

    return { nfts, total };
  }

  async findOne(id: string): Promise<Nft> {
    const nft = await this.nftsRepository.findOne({
      where: { id },
      relations: ['collection', 'listings'],
    });

    if (!nft) {
      throw new NotFoundException('NFT not found');
    }

    return nft;
  }

  async findByToken(contractAddress: string, tokenId: string, chainId: number): Promise<Nft> {
    const nft = await this.nftsRepository.findOne({
      where: {
        contractAddress: contractAddress.toLowerCase(),
        tokenId,
        chainId,
      },
      relations: ['collection'],
    });

    if (!nft) {
      throw new NotFoundException('NFT not found');
    }

    return nft;
  }

  async transferNFT(
    nftId: string,
    fromAddress: string,
    toAddress: string,
    txHash: string,
  ): Promise<Nft> {
    const nft = await this.findOne(nftId);

    // Update owner
    nft.ownerAddress = toAddress.toLowerCase();
    await this.nftsRepository.save(nft);

    // Record transaction
    await this.recordTransaction({
      nftId: nft.id,
      collectionId: nft.collectionId,
      transactionType: TransactionType.TRANSFER,
      fromAddress,
      toAddress,
      txHash,
      chainId: nft.chainId,
    });

    return nft;
  }

  async recordTransaction(data: {
    nftId?: string;
    collectionId?: string;
    transactionType: TransactionType;
    fromAddress?: string;
    toAddress?: string;
    price?: string;
    currencyAddress?: string;
    quantity?: number;
    txHash: string;
    blockNumber?: string;
    chainId: number;
    gasUsed?: string;
    gasPrice?: string;
    marketplaceFee?: string;
    royaltyFee?: string;
  }): Promise<NftTransaction> {
    const transaction = this.transactionsRepository.create(data);
    return await this.transactionsRepository.save(transaction);
  }

  async getTransactionHistory(nftId: string): Promise<NftTransaction[]> {
    return await this.transactionsRepository.find({
      where: { nftId },
      order: { createdAt: 'DESC' },
    });
  }

  async incrementViews(nftId: string): Promise<void> {
    await this.nftsRepository.increment({ id: nftId }, 'viewsCount', 1);
  }

  async incrementFavorites(nftId: string): Promise<void> {
    await this.nftsRepository.increment({ id: nftId }, 'favoritesCount', 1);
  }

  async decrementFavorites(nftId: string): Promise<void> {
    await this.nftsRepository.decrement({ id: nftId }, 'favoritesCount', 1);
  }

  async updateNFTMetadata(nftId: string): Promise<Nft> {
    const nft = await this.findOne(nftId);

    // Fetch metadata from IPFS
    const metadata = await this.ipfsService.fetchMetadata(nft.metadataUri);

    // Update NFT with metadata
    nft.metadata = metadata;
    nft.name = metadata.name;
    nft.description = metadata.description;
    nft.imageUrl = metadata.image;
    nft.animationUrl = metadata.animation_url;
    nft.externalUrl = metadata.external_url;
    nft.attributes = metadata.attributes;

    return await this.nftsRepository.save(nft);
  }

  async calculateRarityScore(collectionId: string): Promise<void> {
    // Get all NFTs in collection
    const nfts = await this.nftsRepository.find({
      where: { collectionId },
    });

    if (nfts.length === 0) return;

    // Calculate trait frequencies
    const traitFrequencies = new Map<string, Map<string, number>>();

    for (const nft of nfts) {
      if (!nft.attributes || !Array.isArray(nft.attributes)) continue;

      for (const attr of nft.attributes) {
        if (!traitFrequencies.has(attr.trait_type)) {
          traitFrequencies.set(attr.trait_type, new Map());
        }

        const valueMap = traitFrequencies.get(attr.trait_type)!;
        const count = valueMap.get(attr.value) || 0;
        valueMap.set(attr.value, count + 1);
      }
    }

    // Calculate rarity scores
    const scores: { id: string; score: number }[] = [];

    for (const nft of nfts) {
      let rarityScore = 0;

      if (nft.attributes && Array.isArray(nft.attributes)) {
        for (const attr of nft.attributes) {
          const valueMap = traitFrequencies.get(attr.trait_type);
          if (valueMap) {
            const frequency = valueMap.get(attr.value) || 0;
            const rarity = 1 / (frequency / nfts.length);
            rarityScore += rarity;
          }
        }
      }

      scores.push({ id: nft.id, score: rarityScore });
    }

    // Sort and assign ranks
    scores.sort((a, b) => b.score - a.score);

    // Update database
    for (let i = 0; i < scores.length; i++) {
      await this.nftsRepository.update(scores[i].id, {
        rarityScore: scores[i].score,
        rarityRank: i + 1,
      });
    }
  }

  async getTrendingNFTs(chainId?: number, limit = 10): Promise<Nft[]> {
    const query = this.nftsRepository
      .createQueryBuilder('nft')
      .leftJoinAndSelect('nft.collection', 'collection')
      .orderBy('nft.viewsCount', 'DESC')
      .addOrderBy('nft.favoritesCount', 'DESC')
      .take(limit);

    if (chainId) {
      query.where('nft.chainId = :chainId', { chainId });
    }

    return await query.getMany();
  }

  async searchNFTs(searchTerm: string, limit = 20): Promise<Nft[]> {
    return await this.nftsRepository
      .createQueryBuilder('nft')
      .leftJoinAndSelect('nft.collection', 'collection')
      .where('nft.name ILIKE :search', { search: `%${searchTerm}%` })
      .orWhere('nft.description ILIKE :search', { search: `%${searchTerm}%` })
      .orWhere('collection.name ILIKE :search', { search: `%${searchTerm}%` })
      .take(limit)
      .getMany();
  }
}
