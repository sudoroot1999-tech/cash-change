import { IsString, IsEnum, IsOptional, IsNumber, IsEthereumAddress, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ListingType } from '../../entities/nft-listing.entity';

export class CreateListingDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  nftId: string;

  @ApiProperty({ example: '0x1234567890123456789012345678901234567890' })
  @IsEthereumAddress()
  sellerAddress: string;

  @ApiProperty({ enum: ListingType, example: ListingType.FIXED_PRICE })
  @IsEnum(ListingType)
  listingType: ListingType;

  @ApiProperty({ example: '0.1' })
  @IsString()
  price: string;

  @ApiPropertyOptional({ example: '0x0000000000000000000000000000000000000000', description: 'Zero address for ETH' })
  @IsOptional()
  @IsEthereumAddress()
  currencyAddress?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: 86400, description: 'Duration in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(3600)
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  chainId: number;
}

export class BuyNftDto {
  @ApiProperty({ example: '0x1234567890123456789012345678901234567890' })
  @IsEthereumAddress()
  buyerAddress: string;

  @ApiProperty({ example: '0xabc123...' })
  @IsString()
  txHash: string;
}

export class UpdateListingPriceDto {
  @ApiProperty({ example: '0x1234567890123456789012345678901234567890' })
  @IsEthereumAddress()
  sellerAddress: string;

  @ApiProperty({ example: '0.2' })
  @IsString()
  newPrice: string;
}
