import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address, AddressType, AddressChain } from '../entities/address.entity';
import { Wallet } from '../entities/wallet.entity';
import { HDWalletService } from './hd-wallet.service';
import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';

@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);

  constructor(
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    private hdWalletService: HDWalletService,
  ) {}

  /**
   * Generate a new deposit address for a wallet
   */
  async generateDepositAddress(
    walletId: string,
    label?: string,
  ): Promise<Address> {
    const wallet = await this.walletRepository.findOne({ where: { id: walletId } });
    
    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    // Get the next address index
    const addressIndex = wallet.addressIndex + 1;

    // Determine chain based on currency
    const chain = this.getCurrencyChain(wallet.currency);

    // Generate address based on currency
    let addressData: { address: string; derivationPath: string };

    try {
      // In production, retrieve encrypted mnemonic from secure storage
      const mnemonic = process.env.MASTER_MNEMONIC || '';
      
      if (!mnemonic) {
        throw new Error('Master mnemonic not configured');
      }

      switch (wallet.currency.toUpperCase()) {
        case 'BTC':
          const btcKey = await this.hdWalletService.deriveBitcoinAddress(
            mnemonic,
            addressIndex,
          );
          addressData = {
            address: btcKey.address,
            derivationPath: btcKey.derivationPath,
          };
          break;

        case 'ETH':
          const ethKey = await this.hdWalletService.deriveEthereumAddress(
            mnemonic,
            addressIndex,
          );
          addressData = {
            address: ethKey.address,
            derivationPath: ethKey.derivationPath,
          };
          break;

        case 'BNB':
        case 'BSC':
          const bscKey = await this.hdWalletService.deriveBSCAddress(
            mnemonic,
            addressIndex,
          );
          addressData = {
            address: bscKey.address,
            derivationPath: bscKey.derivationPath,
          };
          break;

        case 'MATIC':
        case 'POLYGON':
          const polyKey = await this.hdWalletService.derivePolygonAddress(
            mnemonic,
            addressIndex,
          );
          addressData = {
            address: polyKey.address,
            derivationPath: polyKey.derivationPath,
          };
          break;

        default:
          throw new BadRequestException(`Unsupported currency: ${wallet.currency}`);
      }

      // Create address entity
      const address = this.addressRepository.create({
        walletId: wallet.id,
        address: addressData.address,
        chain,
        type: AddressType.DEPOSIT,
        derivationIndex: addressIndex,
        label,
        isActive: true,
        isUsed: false,
      });

      await this.addressRepository.save(address);

      // Update wallet's address index
      wallet.addressIndex = addressIndex;
      await this.walletRepository.save(wallet);

      this.logger.log(`Generated new address for wallet ${walletId}: ${address.address}`);

      return address;
    } catch (error) {
      this.logger.error(`Failed to generate address for wallet ${walletId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to generate address: ${errorMessage}`);
    }
  }

  /**
   * Get all addresses for a wallet
   */
  async getWalletAddresses(walletId: string): Promise<Address[]> {
    return this.addressRepository.find({
      where: { walletId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a specific address
   */
  async getAddress(addressId: string): Promise<Address> {
    const address = await this.addressRepository.findOne({
      where: { id: addressId },
    });

    if (!address) {
      throw new BadRequestException('Address not found');
    }

    return address;
  }

  /**
   * Find address by address string
   */
  async findByAddress(addressString: string): Promise<Address | null> {
    return this.addressRepository.findOne({
      where: { address: addressString },
      relations: ['wallet'],
    });
  }

  /**
   * Mark address as used
   */
  async markAsUsed(addressId: string): Promise<void> {
    await this.addressRepository.update(addressId, { isUsed: true });
    this.logger.log(`Address ${addressId} marked as used`);
  }

  /**
   * Create multi-signature address
   */
  async createMultisigAddress(
    walletId: string,
    requiredSignatures: number,
    signerAddresses: string[],
    label?: string,
  ): Promise<Address> {
    const wallet = await this.walletRepository.findOne({ where: { id: walletId } });
    
    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    if (signerAddresses.length < requiredSignatures) {
      throw new BadRequestException(
        'Number of signers must be greater than or equal to required signatures',
      );
    }

    // Generate actual multisig address based on blockchain
    const chain = this.getCurrencyChain(wallet.currency);
    let multisigAddress: string;

    try {
      switch (wallet.currency.toUpperCase()) {
        case 'ETH':
        case 'BNB':
        case 'BSC':
        case 'MATIC':
        case 'POLYGON':
          // For EVM chains, create a Gnosis Safe-style multisig
          // In production, this would deploy a multisig contract
          multisigAddress = await this.generateEVMMultisig(
            signerAddresses,
            requiredSignatures,
            chain,
          );
          break;

        case 'BTC':
          // For Bitcoin, create P2SH (Pay-to-Script-Hash) multisig
          multisigAddress = await this.generateBitcoinMultisig(
            signerAddresses,
            requiredSignatures,
          );
          break;

        default:
          throw new BadRequestException(
            `Multisig not supported for currency: ${wallet.currency}`,
          );
      }
    } catch (error) {
      this.logger.error('Failed to generate multisig address:', error);
      throw new BadRequestException('Failed to generate multisig address');
    }
    
    const address = this.addressRepository.create({
      walletId: wallet.id,
      address: multisigAddress,
      chain,
      type: AddressType.MULTISIG,
      label,
      isActive: true,
      isUsed: false,
      multisigConfig: {
        requiredSignatures,
        totalSigners: signerAddresses.length,
        signers: signerAddresses,
      },
    });

    await this.addressRepository.save(address);

    this.logger.log(`Created multisig address for wallet ${walletId}`);

    return address;
  }

  /**
   * Get currency chain mapping
   */
  private getCurrencyChain(currency: string): AddressChain {
    const currencyUpper = currency.toUpperCase();
    
    switch (currencyUpper) {
      case 'BTC':
        return AddressChain.BITCOIN;
      case 'ETH':
        return AddressChain.ETHEREUM;
      case 'BNB':
      case 'BSC':
        return AddressChain.BSC;
      case 'MATIC':
      case 'POLYGON':
        return AddressChain.POLYGON;
      case 'SOL':
        return AddressChain.SOLANA;
      default:
        // Default to Ethereum for ERC20 tokens
        return AddressChain.ETHEREUM;
    }
  }

  /**
   * Deactivate address
   */
  async deactivateAddress(addressId: string): Promise<void> {
    await this.addressRepository.update(addressId, { isActive: false });
    this.logger.log(`Address ${addressId} deactivated`);
  }

  /**
   * Generate EVM multisig address (Gnosis Safe-style)
   * In production, this should deploy an actual multisig contract
   */
  private async generateEVMMultisig(
    signerAddresses: string[],
    requiredSignatures: number,
    chain: AddressChain,
  ): Promise<string> {
    // Validate all signer addresses
    for (const addr of signerAddresses) {
      if (!ethers.isAddress(addr)) {
        throw new BadRequestException(`Invalid Ethereum address: ${addr}`);
      }
    }

    // In production, this would:
    // 1. Deploy a Gnosis Safe or similar multisig contract
    // 2. Initialize with signers and threshold
    // 3. Return the deployed contract address
    
    // For now, we generate a deterministic address based on signers
    // This is a placeholder - real implementation requires contract deployment
    const sortedSigners = [...signerAddresses].sort();
    const data = ethers.concat([
      ethers.toUtf8Bytes('MULTISIG'),
      ethers.toUtf8Bytes(requiredSignatures.toString()),
      ethers.toUtf8Bytes(sortedSigners.join('')),
      ethers.toUtf8Bytes(chain),
    ]);
    
    const hash = ethers.keccak256(data);
    // Create an address from the hash (last 20 bytes)
    const address = '0x' + hash.slice(-40);
    
    this.logger.warn(
      `Generated deterministic multisig address: ${address}. ` +
      `In production, deploy actual multisig contract!`,
    );
    
    return ethers.getAddress(address); // Checksum address
  }

  /**
   * Generate Bitcoin multisig address (P2SH)
   */
  private async generateBitcoinMultisig(
    signerAddresses: string[],
    requiredSignatures: number,
  ): Promise<string> {
    try {
      // Convert addresses to public keys (in production, you'd have actual pubkeys)
      // For now, we'll create a P2SH address from the signer data
      
      // Determine network
      const network = process.env.BITCOIN_NETWORK === 'mainnet' 
        ? bitcoin.networks.bitcoin 
        : bitcoin.networks.testnet;

      // In production, you would:
      // 1. Get actual public keys from signers
      // 2. Create P2SH or P2WSH script
      // 3. Generate address from script
      
      // Placeholder: Create deterministic P2SH address
      const sortedSigners = [...signerAddresses].sort();
      const data = Buffer.concat([
        Buffer.from('BTC_MULTISIG'),
        Buffer.from([requiredSignatures]),
        ...sortedSigners.map(s => Buffer.from(s)),
      ]);
      
      // Create a P2SH-like address (placeholder)
      const hash = bitcoin.crypto.hash160(data);
      const address = bitcoin.payments.p2sh({
        redeem: {
          output: Buffer.concat([
            Buffer.from([bitcoin.opcodes.OP_HASH160]),
            Buffer.from([hash.length]),
            hash,
            Buffer.from([bitcoin.opcodes.OP_EQUAL]),
          ]),
        },
        network,
      });

      if (!address.address) {
        throw new Error('Failed to generate Bitcoin multisig address');
      }

      this.logger.warn(
        `Generated P2SH multisig address: ${address.address}. ` +
        `In production, use actual public keys and proper P2SH/P2WSH!`,
      );

      return address.address;
    } catch (error) {
      this.logger.error('Bitcoin multisig generation failed:', error);
      throw new BadRequestException('Failed to generate Bitcoin multisig address');
    }
  }
}
