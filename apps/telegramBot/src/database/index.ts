import { Pool } from 'pg';
import { config } from '../../config';
import logger from '../utils/logger';
import { User, Transaction, PriceAlert, UserSettings } from '../types';

class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: config.database.url,
    });
  }

  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          telegram_id BIGINT PRIMARY KEY,
          wallet_address VARCHAR(66) UNIQUE NOT NULL,
          encrypted_key TEXT NOT NULL,
          salt VARCHAR(64) NOT NULL,
          iv VARCHAR(32) NOT NULL,
          auth_tag VARCHAR(32) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          last_active TIMESTAMP DEFAULT NOW(),
          settings JSONB DEFAULT '{"slippage_tolerance": 1, "notifications": {"trades": true, "price_alerts": true}}'
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
          tx_hash VARCHAR(66) NOT NULL,
          tx_type VARCHAR(20) NOT NULL,
          pool_id VARCHAR(66),
          amount_in NUMERIC,
          amount_out NUMERIC,
          token_type VARCHAR(100),
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS price_alerts (
          id SERIAL PRIMARY KEY,
          user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
          pool_id VARCHAR(66) NOT NULL,
          condition VARCHAR(10) NOT NULL,
          target_price NUMERIC(20, 8) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
        CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active);
      `);
      logger.info('Database initialized successfully');
    } finally {
      client.release();
    }
  }

  async getUser(telegramId: number): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [telegramId]
    );
    return result.rows[0] || null;
  }

  async createUser(
    telegramId: number,
    walletAddress: string,
    encryptedKey: string,
    salt: string,
    iv: string,
    authTag: string
  ): Promise<User> {
    const result = await this.pool.query(
      `INSERT INTO users (telegram_id, wallet_address, encrypted_key, salt, iv, auth_tag)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [telegramId, walletAddress, encryptedKey, salt, iv, authTag]
    );
    return result.rows[0];
  }

  async updateUserActivity(telegramId: number): Promise<void> {
    await this.pool.query(
      'UPDATE users SET last_active = NOW() WHERE telegram_id = $1',
      [telegramId]
    );
  }

  async updateUserSettings(telegramId: number, settings: Partial<UserSettings>): Promise<void> {
    await this.pool.query(
      'UPDATE users SET settings = settings || $1::jsonb WHERE telegram_id = $2',
      [JSON.stringify(settings), telegramId]
    );
  }

  async createTransaction(
    userId: number,
    txHash: string,
    txType: string,
    poolId?: string,
    amountIn?: string,
    amountOut?: string,
    tokenType?: string
  ): Promise<Transaction> {
    const result = await this.pool.query(
      `INSERT INTO transactions (user_id, tx_hash, tx_type, pool_id, amount_in, amount_out, token_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, txHash, txType, poolId, amountIn, amountOut, tokenType]
    );
    return result.rows[0];
  }

  async updateTransactionStatus(txHash: string, status: string): Promise<void> {
    await this.pool.query(
      'UPDATE transactions SET status = $1 WHERE tx_hash = $2',
      [status, txHash]
    );
  }

  async getUserTransactions(userId: number, limit: number = 10): Promise<Transaction[]> {
    const result = await this.pool.query(
      `SELECT * FROM transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  async createPriceAlert(
    userId: number,
    poolId: string,
    condition: 'above' | 'below',
    targetPrice: string
  ): Promise<PriceAlert> {
    const result = await this.pool.query(
      `INSERT INTO price_alerts (user_id, pool_id, condition, target_price)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, poolId, condition, targetPrice]
    );
    return result.rows[0];
  }

  async getUserPriceAlerts(userId: number): Promise<PriceAlert[]> {
    const result = await this.pool.query(
      'SELECT * FROM price_alerts WHERE user_id = $1 AND is_active = true',
      [userId]
    );
    return result.rows;
  }

  async deactivatePriceAlert(alertId: number): Promise<void> {
    await this.pool.query(
      'UPDATE price_alerts SET is_active = false WHERE id = $1',
      [alertId]
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const database = new Database();
export default database;
