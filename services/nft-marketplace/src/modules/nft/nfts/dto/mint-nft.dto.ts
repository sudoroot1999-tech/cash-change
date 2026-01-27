import { IsString, IsOptional, IsArray, IsNumber, IsEthereumAddress, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MintNftDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  collectionId: string;

  @ApiProperty({ example: '1' })
  @IsString()
  tokenId: string;

  @ApiProperty({ example: '0x1234567890123456789012345678901234567890' })
  @IsEthereumAddress()
  ownerAddress: string;

  @ApiProperty({ example: '0x1234567890123456789012345678901234567890' })
  @IsEthereumAddress()
  creatorAddress: string;

  @ApiProperty({ example: 'My Awesome NFT' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'This is a unique NFT' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://ipfs.io/ipfs/QmXxx...' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    example: [
      { trait_type: 'Background', value: 'Blue' },
      { trait_type: 'Rarity', value: 'Legendary' },
    ],
  })
  @IsOptional()
  @IsArray()
  attributes?: any[];

  @ApiProperty({ example: 1 })
  @IsNumber()
  chainId: number;
}

export class CreateLazyMintDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  collectionId: string;

  @ApiProperty({ example: '1' })
  @IsString()
  tokenId: string;

  @ApiProperty({ example: '0x1234567890123456789012345678901234567890' })
  @IsEthereumAddress()
  creatorAddress: string;

  @ApiProperty({ example: 'My Lazy NFT' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Lazy minted NFT' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'https://ipfs.io/ipfs/QmXxx...' })
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional({
    example: [{ trait_type: 'Background', value: 'Red' }],
  })
  @IsOptional()
  @IsArray()
  attributes?: any[];

  @ApiProperty({ example: '0.1' })
  @IsString()
  price: string;

  @ApiProperty({ example: 10, description: 'Royalty percentage (0-20)' })
  @IsNumber()
  @Min(0)
  @Max(20)
  royaltyPercentage: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  chainId: number;
}
