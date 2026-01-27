import { IsString, IsEnum, IsOptional, IsNumber, Min, Max, IsEthereumAddress } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCollectionDto {
  @ApiProperty({ example: '0x1234567890123456789012345678901234567890' })
  @IsEthereumAddress()
  contractAddress: string;

  @ApiProperty({ example: 'My NFT Collection' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'MNFT' })
  @IsString()
  symbol: string;

  @ApiPropertyOptional({ example: 'A collection of unique NFTs' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['ERC721', 'ERC1155'], example: 'ERC721' })
  @IsEnum(['ERC721', 'ERC1155'])
  collectionType: 'ERC721' | 'ERC1155';

  @ApiProperty({ example: '0x1234567890123456789012345678901234567890' })
  @IsEthereumAddress()
  creatorAddress: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  chainId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bannerImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profileImageUrl?: string;

  @ApiPropertyOptional({ example: 'Art' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: '0x1234567890123456789012345678901234567890' })
  @IsOptional()
  @IsEthereumAddress()
  royaltyRecipient?: string;

  @ApiPropertyOptional({ example: 10, description: 'Royalty percentage (0-20)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  royaltyPercentage?: number;
}
