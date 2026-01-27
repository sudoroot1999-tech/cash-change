import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bip39 from 'bip39';
import * as bip32 from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';
import { ethers } from 'ethers';
import { KMSService } from '@exchange/common';

export interface HDWalletKey {
  address: string;
  privateKey: string;
  publicKey: string;
  derivationPath: string;
}

@Injectable()
export class HDWalletService {
  constructor(
    private configService: ConfigService,
    private encryptionService: KMSService,
  ) { }

  /**
   * Generates a new mnemonic phrase for HD wallet
   */
  generateMnemonic(strength: number = 256): string {
    return bip39.generateMnemonic(strength);
  }

  /**
   * Validates mnemonic phrase
   */
  validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
  }

  /**
   * Derives a seed from mnemonic
   */
  async mnemonicToSeed(mnemonic: string, passphrase?: string): Promise<Buffer> {
    return await bip39.mnemonicToSeed(mnemonic, passphrase);
  }

  /**
   * Generates Ethereum/EVM address from HD wallet
   * BIP44 path: m/44'/60'/0'/0/index
   */
  async deriveEthereumAddress(
    mnemonic: string,
    index: number = 0,
  ): Promise<HDWalletKey> {
    const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic);
    const path = `m/44'/60'/0'/0/${index}`;
    const wallet = hdNode.derivePath(path);

    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      derivationPath: path,
    };
  }

  /**
   * Generates Bitcoin address from HD wallet
   * BIP44 path: m/44'/0'/0'/0/index (mainnet) or m/44'/1'/0'/0/index (testnet)
   */
  async deriveBitcoinAddress(
    mnemonic: string,
    index: number = 0,
    network: 'mainnet' | 'testnet' = 'mainnet',
  ): Promise<HDWalletKey> {
    const seed = await this.mnemonicToSeed(mnemonic);
    const coinType = network === 'mainnet' ? 0 : 1;
    const path = `m/44'/${coinType}'/0'/0/${index}`;

    const bitcoinNetwork =
      network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;

    const root = bip32.BIP32Factory(require('tiny-secp256k1')).fromSeed(
      seed,
      bitcoinNetwork,
    );
    const child = root.derivePath(path);

    if (!child.privateKey) {
      throw new Error('Failed to derive private key');
    }

    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network: bitcoinNetwork,
    });

    if (!address) {
      throw new Error('Failed to generate address');
    }

    return {
      address,
      privateKey: child.privateKey.toString('hex'),
      publicKey: child.publicKey.toString('hex'),
      derivationPath: path,
    };
  }

  /**
   * Generates BSC address (same as Ethereum)
   */
  async deriveBSCAddress(
    mnemonic: string,
    index: number = 0,
  ): Promise<HDWalletKey> {
    // BSC uses same address format as Ethereum
    return this.deriveEthereumAddress(mnemonic, index);
  }

  /**
   * Generates Polygon address (same as Ethereum)
   */
  async derivePolygonAddress(
    mnemonic: string,
    index: number = 0,
  ): Promise<HDWalletKey> {
    // Polygon uses same address format as Ethereum
    return this.deriveEthereumAddress(mnemonic, index);
  }

  /**
   * Encrypts and stores mnemonic securely
   */
  async encryptMnemonic(mnemonic: string): Promise<string> {
    return this.encryptionService.encrypt(mnemonic);
  }

  /**
   * Decrypts stored mnemonic
   */
  async decryptMnemonic(encryptedMnemonic: string): Promise<string> {
    return this.encryptionService.decrypt(encryptedMnemonic);
  }

  /**
   * Encrypts private key
   */
  async encryptPrivateKey(privateKey: string): Promise<string> {
    return this.encryptionService.encrypt(privateKey);
  }

  /**
   * Decrypts private key
   */
  async decryptPrivateKey(encryptedPrivateKey: string): Promise<string> {
    return this.encryptionService.decrypt(encryptedPrivateKey);
  }

  /**
   * Generates master public key for address generation without private key
   */
  async generateMasterPublicKey(mnemonic: string, currency: string): Promise<string> {
    const seed = await this.mnemonicToSeed(mnemonic);
    let path: string;

    switch (currency.toUpperCase()) {
      case 'BTC':
        path = "m/44'/0'/0'";
        break;
      case 'ETH':
      case 'BSC':
      case 'MATIC':
        path = "m/44'/60'/0'";
        break;
      default:
        throw new Error(`Unsupported currency: ${currency}`);
    }

    const root = bip32.BIP32Factory(require('tiny-secp256k1')).fromSeed(seed);
    const masterNode = root.derivePath(path);

    return masterNode.neutered().toBase58();
  }
}
