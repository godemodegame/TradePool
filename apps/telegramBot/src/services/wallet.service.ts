import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import * as bip39 from 'bip39';
import { encryptPrivateKey, decryptPrivateKey } from '../utils/crypto';
import { database } from '../database';
import { suiService } from './sui.service';
import logger from '../utils/logger';

export class WalletService {
  async createWallet(telegramId: number, password: string): Promise<{ address: string; mnemonic: string }> {
    try {
      const mnemonic = bip39.generateMnemonic(128);
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const keypair = Ed25519Keypair.fromSeed(seed.slice(0, 32));
      
      const address = keypair.getPublicKey().toSuiAddress();
      const privateKey = keypair.export().privateKey;

      const encrypted = encryptPrivateKey(privateKey, password);

      await database.createUser(
        telegramId,
        address,
        encrypted.encrypted,
        encrypted.salt,
        encrypted.iv,
        encrypted.authTag
      );

      logger.info(`Wallet created for user ${telegramId}: ${address}`);

      return { address, mnemonic };
    } catch (error) {
      logger.error('Error creating wallet:', error);
      throw error;
    }
  }

  async importWallet(
    telegramId: number,
    mnemonic: string,
    password: string
  ): Promise<string> {
    try {
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      const seed = await bip39.mnemonicToSeed(mnemonic);
      const keypair = Ed25519Keypair.fromSeed(seed.slice(0, 32));

      const address = keypair.getPublicKey().toSuiAddress();
      const privateKey = keypair.export().privateKey;

      const encrypted = encryptPrivateKey(privateKey, password);

      await database.createUser(
        telegramId,
        address,
        encrypted.encrypted,
        encrypted.salt,
        encrypted.iv,
        encrypted.authTag
      );

      logger.info(`Wallet imported for user ${telegramId}: ${address}`);

      return address;
    } catch (error) {
      logger.error('Error importing wallet:', error);
      throw error;
    }
  }

  async getKeypair(telegramId: number, password: string): Promise<Ed25519Keypair> {
    try {
      const user = await database.getUser(telegramId);
      if (!user) {
        throw new Error('User not found');
      }

      const privateKey = decryptPrivateKey(
        {
          encrypted: user.encrypted_key,
          salt: user.salt,
          iv: user.iv,
          authTag: user.auth_tag,
        },
        password
      );

      return suiService.createKeypairFromPrivateKey(privateKey);
    } catch (error) {
      logger.error('Error getting keypair:', error);
      throw error;
    }
  }

  async getWalletAddress(telegramId: number): Promise<string | null> {
    const user = await database.getUser(telegramId);
    return user?.wallet_address || null;
  }

  async hasWallet(telegramId: number): Promise<boolean> {
    const user = await database.getUser(telegramId);
    return !!user;
  }
}

export const walletService = new WalletService();
export default walletService;
