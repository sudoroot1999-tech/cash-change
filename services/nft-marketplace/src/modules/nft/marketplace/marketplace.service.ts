import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { NftListing, ListingType, ListingStatus } from '../entities/nft-listing.entity';
import { Nft } from '../entities/nft.entity';
import { TransactionType } from '../entities/nft-transaction.entity';
import { NftsService } from '../nfts/nfts.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(NftListing)
    private listingsRepository: Repository<NftListing>,
    @InjectRepository(Nft)
    private nftsRepository: Repository<Nft>,
    private nftsService: NftsService,
    private _blockchainService: BlockchainService,
  ) {}

  async createListing(data: {
    nftId: string;
    sellerAddress: string;
    listingType: ListingType;
    price?: string;
    currencyAddress?: string;
    quantity?: number;
    duration?: number;
    signature?: string;
    chainId: number;
  }): Promise<NftListing> {
    const nft = await this.nftsService.findOne(data.nftId);

    // Verify ownership
    if (nft.ownerAddress.toLowerCase() !== data.sellerAddress.toLowerCase()) {
      throw new BadRequestException('You do not own this NFT');
    }

    // Check if already listed
    const existingListing = await this.listingsRepository.findOne({
      where: {
        nftId: data.nftId,
        status: ListingStatus.ACTIVE,
      },
    });

    if (existingListing) {
      throw new BadRequestException('NFT is already listed');
    }

    // Calculate end time if duration provided
    let endTime: Date | undefined;
    if (data.duration) {
      endTime = new Date(Date.now() + data.duration * 1000);
    }

    const listing = this.listingsRepository.create({
      nftId: data.nftId,
      sellerAddress: data.sellerAddress.toLowerCase(),
      listingType: data.listingType,
      price: data.price,
      currencyAddress: data.currencyAddress?.toLowerCase(),
      quantity: data.quantity || 1,
      status: ListingStatus.ACTIVE,
      endTime,
      duration: data.duration,
      signature: data.signature,
      chainId: data.chainId,
    });

    return await this.listingsRepository.save(listing);
  }

  async buyNFT(
    listingId: string,
    buyerAddress: string,
    txHash: string,
  ): Promise<{ listing: NftListing; nft: Nft }> {
    const listing = await this.listingsRepository.findOne({
      where: { id: listingId },
      relations: ['nft'],
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('Listing is not active');
    }

    if (listing.endTime && listing.endTime < new Date()) {
      listing.status = ListingStatus.EXPIRED;
      await this.listingsRepository.save(listing);
      throw new BadRequestException('Listing has expired');
    }

    // Update listing status
    listing.status = ListingStatus.SOLD;
    await this.listingsRepository.save(listing);

    // Transfer NFT ownership
    const nft = await this.nftsService.transferNFT(
      listing.nftId,
      listing.sellerAddress,
      buyerAddress,
      txHash,
    );

    // Update last sale price
    await this.nftsRepository.update(nft.id, {
      lastSalePrice: listing.price,
    });

    // Record sale transaction
    await this.nftsService.recordTransaction({
      nftId: nft.id,
      collectionId: nft.collectionId,
      transactionType: TransactionType.SALE,
      fromAddress: listing.sellerAddress,
      toAddress: buyerAddress,
      price: listing.price,
      currencyAddress: listing.currencyAddress,
      quantity: listing.quantity,
      txHash,
      chainId: listing.chainId,
    });

    return { listing, nft };
  }

  async cancelListing(listingId: string, sellerAddress: string): Promise<NftListing> {
    const listing = await this.listingsRepository.findOne({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerAddress.toLowerCase() !== sellerAddress.toLowerCase()) {
      throw new BadRequestException('You are not the seller');
    }

    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('Listing is not active');
    }

    listing.status = ListingStatus.CANCELLED;
    return await this.listingsRepository.save(listing);
  }

  async updateListingPrice(
    listingId: string,
    sellerAddress: string,
    newPrice: string,
  ): Promise<NftListing> {
    const listing = await this.listingsRepository.findOne({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerAddress.toLowerCase() !== sellerAddress.toLowerCase()) {
      throw new BadRequestException('You are not the seller');
    }

    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('Listing is not active');
    }

    listing.price = newPrice;
    return await this.listingsRepository.save(listing);
  }

  async getActiveListings(filters?: {
    collectionId?: string;
    sellerAddress?: string;
    minPrice?: string;
    maxPrice?: string;
    chainId?: number;
    sortBy?: 'price' | 'created_at';
    order?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<{ listings: NftListing[]; total: number }> {
    const query = this.listingsRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.nft', 'nft')
      .leftJoinAndSelect('nft.collection', 'collection')
      .where('listing.status = :status', { status: ListingStatus.ACTIVE });

    if (filters?.collectionId) {
      query.andWhere('nft.collectionId = :collectionId', { collectionId: filters.collectionId });
    }

    if (filters?.sellerAddress) {
      query.andWhere('listing.sellerAddress = :sellerAddress', {
        sellerAddress: filters.sellerAddress.toLowerCase(),
      });
    }

    if (filters?.minPrice) {
      query.andWhere('listing.price >= :minPrice', { minPrice: filters.minPrice });
    }

    if (filters?.maxPrice) {
      query.andWhere('listing.price <= :maxPrice', { maxPrice: filters.maxPrice });
    }

    if (filters?.chainId) {
      query.andWhere('listing.chainId = :chainId', { chainId: filters.chainId });
    }

    // Sorting
    const sortBy = filters?.sortBy || 'created_at';
    const order = filters?.order || 'DESC';

    if (sortBy === 'price') {
      query.orderBy('listing.price', order);
    } else {
      query.orderBy('listing.createdAt', order);
    }

    // Pagination
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;
    query.take(limit).skip(offset);

    const [listings, total] = await query.getManyAndCount();

    return { listings, total };
  }

  async getListing(id: string): Promise<NftListing> {
    const listing = await this.listingsRepository.findOne({
      where: { id },
      relations: ['nft', 'nft.collection'],
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return listing;
  }

  async expireListings(): Promise<number> {
    const result = await this.listingsRepository.update(
      {
        status: ListingStatus.ACTIVE,
        endTime: LessThan(new Date()),
      },
      {
        status: ListingStatus.EXPIRED,
      },
    );

    return result.affected || 0;
  }

  async getFloorPrice(collectionId: string): Promise<string | null> {
    const result = await this.listingsRepository
      .createQueryBuilder('listing')
      .innerJoin('listing.nft', 'nft')
      .where('nft.collectionId = :collectionId', { collectionId })
      .andWhere('listing.status = :status', { status: ListingStatus.ACTIVE })
      .orderBy('listing.price', 'ASC')
      .limit(1)
      .getOne();

    return result?.price || null;
  }

  async getListingsByNFT(nftId: string): Promise<NftListing[]> {
    return await this.listingsRepository.find({
      where: { nftId },
      order: { createdAt: 'DESC' },
    });
  }
}
