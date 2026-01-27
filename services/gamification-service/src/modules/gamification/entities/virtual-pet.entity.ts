import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PetSpecies {
  CRYPTO_DRAGON = 'crypto_dragon',
  BLOCKCHAIN_BEAR = 'blockchain_bear',
  DEFI_DOG = 'defi_dog',
  NFT_NARWHAL = 'nft_narwhal',
  TOKEN_TIGER = 'token_tiger',
  SATOSHI_SNAKE = 'satoshi_snake',
}

export enum PetRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export enum PetMood {
  HAPPY = 'happy',
  NEUTRAL = 'neutral',
  HUNGRY = 'hungry',
  SAD = 'sad',
  EXCITED = 'excited',
}

@Entity('virtual_pets')
@Index(['userId'], { unique: true })
export class VirtualPet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: PetSpecies,
  })
  species: PetSpecies;

  @Column({
    type: 'enum',
    enum: PetRarity,
    default: PetRarity.COMMON,
  })
  rarity: PetRarity;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'int', default: 0 })
  experience: number;

  @Column({ name: 'experience_to_next_level', type: 'int', default: 100 })
  experienceToNextLevel: number;

  @Column({ type: 'int', default: 100 })
  health: number;

  @Column({ type: 'int', default: 100 })
  happiness: number;

  @Column({ type: 'int', default: 100 })
  hunger: number;

  @Column({
    type: 'enum',
    enum: PetMood,
    default: PetMood.NEUTRAL,
  })
  mood: PetMood;

  @Column({ type: 'int', default: 10 })
  strength: number;

  @Column({ type: 'int', default: 10 })
  intelligence: number;

  @Column({ type: 'int', default: 10 })
  luck: number;

  @Column({ name: 'total_battles', type: 'int', default: 0 })
  totalBattles: number;

  @Column({ name: 'battles_won', type: 'int', default: 0 })
  battlesWon: number;

  @Column({ name: 'battles_lost', type: 'int', default: 0 })
  battlesLost: number;

  @Column({ type: 'jsonb', default: [] })
  accessories: string[];

  @Column({ name: 'is_nft', type: 'boolean', default: false })
  isNft: boolean;

  @Column({ name: 'nft_token_id', type: 'varchar', length: 100, nullable: true })
  nftTokenId: string;

  @Column({ name: 'last_fed_at', type: 'timestamp', nullable: true })
  lastFedAt: Date;

  @Column({ name: 'last_played_at', type: 'timestamp', nullable: true })
  lastPlayedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
