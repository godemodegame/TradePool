import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';
import { config } from '../../config';
import logger from '../utils/logger';
import { PoolData, LPReceipt, WalletInfo, TradeQuote } from '../types';

export class SuiService {
  private client: SuiClient;
  private packageId: string;
  private registryId: string;
  private adminCapId: string;

  constructor() {
    this.client = new SuiClient({
      url: config.sui.rpcUrl,
    });
    this.packageId = config.sui.packageId;
    this.registryId = config.sui.registryId;
    this.adminCapId = config.sui.adminCapId;
  }

  createKeypairFromPrivateKey(privateKeyB64: string): Ed25519Keypair {
    const privateKeyBytes = fromB64(privateKeyB64);
    return Ed25519Keypair.fromSecretKey(privateKeyBytes);
  }

  async getWalletInfo(address: string): Promise<WalletInfo> {
    try {
      const suiBalance = await this.client.getBalance({
        owner: address,
        coinType: '0x2::sui::SUI',
      });

      const allBalances = await this.client.getAllBalances({
        owner: address,
      });

      const tokens = allBalances
        .filter(b => b.coinType !== '0x2::sui::SUI')
        .map(b => ({
          type: b.coinType,
          balance: b.totalBalance,
        }));

      return {
        address,
        sui_balance: suiBalance.totalBalance,
        tokens,
      };
    } catch (error) {
      logger.error('Error fetching wallet info:', error);
      throw error;
    }
  }

  async getAllPools(): Promise<PoolData[]> {
    try {
      const registry = await this.client.getObject({
        id: this.registryId,
        options: { showContent: true },
      });

      if (!registry.data?.content || registry.data.content.dataType !== 'moveObject') {
        throw new Error('Invalid registry object');
      }

      const fields = registry.data.content.fields as any;
      const poolIds = fields.pools || [];

      const pools: PoolData[] = [];
      for (const poolEntry of poolIds) {
        const poolId = poolEntry.value;
        const pool = await this.getPoolData(poolId);
        if (pool) {
          pools.push(pool);
        }
      }

      return pools;
    } catch (error) {
      logger.error('Error fetching pools:', error);
      throw error;
    }
  }

  async getPoolData(poolId: string): Promise<PoolData | null> {
    try {
      const pool = await this.client.getObject({
        id: poolId,
        options: { showContent: true },
      });

      if (!pool.data?.content || pool.data.content.dataType !== 'moveObject') {
        return null;
      }

      const fields = pool.data.content.fields as any;

      return {
        id: poolId,
        name: fields.name || 'Unknown Pool',
        token_type: fields.token_balance?.type || 'Unknown',
        sui_reserve: fields.sui_balance || '0',
        token_reserve: fields.token_balance?.value || '0',
        lp_supply: fields.total_shares || '0',
      };
    } catch (error) {
      logger.error('Error fetching pool data:', error);
      return null;
    }
  }

  async getUserLPReceipts(userAddress: string): Promise<LPReceipt[]> {
    try {
      const objects = await this.client.getOwnedObjects({
        owner: userAddress,
        filter: {
          StructType: `${this.packageId}::tradepool::LPReceipt`,
        },
        options: { showContent: true },
      });

      return objects.data
        .filter(obj => obj.data?.content && obj.data.content.dataType === 'moveObject')
        .map(obj => {
          const fields = (obj.data!.content as any).fields;
          return {
            id: obj.data!.objectId,
            pool_id: fields.pool_id,
            token_type: fields.token_type,
            sui_amount: fields.sui_amount,
            token_amount: fields.token_amount,
            shares: fields.shares,
          };
        });
    } catch (error) {
      logger.error('Error fetching LP receipts:', error);
      return [];
    }
  }

  async buildDepositTransaction(
    poolId: string,
    suiAmount: string,
    tokenAmount: string,
    tokenType: string,
    userAddress: string
  ): Promise<TransactionBlock> {
    const tx = new TransactionBlock();

    const [suiCoin] = tx.splitCoins(tx.gas, [tx.pure(suiAmount)]);

    const tokenCoins = await this.client.getCoins({
      owner: userAddress,
      coinType: tokenType,
    });

    if (tokenCoins.data.length === 0) {
      throw new Error('No token coins found');
    }

    const tokenCoin = tx.object(tokenCoins.data[0].coinObjectId);

    tx.moveCall({
      target: `${this.packageId}::tradepool::deposit`,
      typeArguments: [tokenType],
      arguments: [tx.object(poolId), suiCoin, tokenCoin],
    });

    return tx;
  }

  async buildWithdrawTransaction(
    poolId: string,
    receiptId: string,
    tokenType: string
  ): Promise<TransactionBlock> {
    const tx = new TransactionBlock();

    tx.moveCall({
      target: `${this.packageId}::tradepool::withdraw`,
      typeArguments: [tokenType],
      arguments: [tx.object(poolId), tx.object(receiptId)],
    });

    return tx;
  }

  async buildAdminBuyTransaction(
    poolId: string,
    suiAmount: string,
    minTokenOut: string,
    tokenType: string
  ): Promise<TransactionBlock> {
    const tx = new TransactionBlock();

    const [payment] = tx.splitCoins(tx.gas, [tx.pure(suiAmount)]);

    tx.moveCall({
      target: `${this.packageId}::tradepool::admin_buy_token`,
      typeArguments: [tokenType],
      arguments: [
        tx.object(this.adminCapId),
        tx.object(poolId),
        payment,
        tx.pure(minTokenOut),
      ],
    });

    return tx;
  }

  async buildAdminSellTransaction(
    poolId: string,
    tokenAmount: string,
    minSuiOut: string,
    tokenType: string,
    userAddress: string
  ): Promise<TransactionBlock> {
    const tx = new TransactionBlock();

    const tokenCoins = await this.client.getCoins({
      owner: userAddress,
      coinType: tokenType,
    });

    if (tokenCoins.data.length === 0) {
      throw new Error('No token coins found');
    }

    const tokenPayment = tx.object(tokenCoins.data[0].coinObjectId);

    tx.moveCall({
      target: `${this.packageId}::tradepool::admin_sell_token`,
      typeArguments: [tokenType],
      arguments: [
        tx.object(this.adminCapId),
        tx.object(poolId),
        tokenPayment,
        tx.pure(minSuiOut),
      ],
    });

    return tx;
  }

  calculateBuyQuote(
    suiAmount: string,
    suiReserve: string,
    tokenReserve: string,
    slippage: number
  ): TradeQuote {
    const inputBig = BigInt(suiAmount);
    const suiResBig = BigInt(suiReserve);
    const tokenResBig = BigInt(tokenReserve);

    const outputAmount = (inputBig * tokenResBig) / (suiResBig + inputBig);
    const priceImpact = Number((inputBig * BigInt(10000)) / suiResBig) / 100;
    const minReceived = (outputAmount * BigInt(Math.floor((100 - slippage) * 100))) / BigInt(10000);

    return {
      input_amount: suiAmount,
      output_amount: outputAmount.toString(),
      price_impact: priceImpact,
      minimum_received: minReceived.toString(),
      gas_estimate: '1000000',
    };
  }

  calculateSellQuote(
    tokenAmount: string,
    suiReserve: string,
    tokenReserve: string,
    slippage: number
  ): TradeQuote {
    const inputBig = BigInt(tokenAmount);
    const suiResBig = BigInt(suiReserve);
    const tokenResBig = BigInt(tokenReserve);

    const outputAmount = (inputBig * suiResBig) / (tokenResBig + inputBig);
    const priceImpact = Number((inputBig * BigInt(10000)) / tokenResBig) / 100;
    const minReceived = (outputAmount * BigInt(Math.floor((100 - slippage) * 100))) / BigInt(10000);

    return {
      input_amount: tokenAmount,
      output_amount: outputAmount.toString(),
      price_impact: priceImpact,
      minimum_received: minReceived.toString(),
      gas_estimate: '1000000',
    };
  }

  async executeTransaction(
    tx: TransactionBlock,
    keypair: Ed25519Keypair
  ): Promise<string> {
    try {
      const result = await this.client.signAndExecuteTransactionBlock({
        signer: keypair,
        transactionBlock: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      if (result.effects?.status?.status !== 'success') {
        throw new Error(`Transaction failed: ${result.effects?.status?.error}`);
      }

      return result.digest;
    } catch (error) {
      logger.error('Error executing transaction:', error);
      throw error;
    }
  }

  getExplorerUrl(txHash: string): string {
    return `${config.explorer.baseUrl}${txHash}`;
  }
}

export const suiService = new SuiService();
export default suiService;
