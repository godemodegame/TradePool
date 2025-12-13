import Database from 'better-sqlite3';
import { config } from '../../config';
import logger from '../utils/logger';
import { User, Transaction, PriceAlert, UserSettings } from '../types';
import path from 'path';
import fs from 'fs';

class DatabaseService {
  private db: Database.Database;

  constructor() {
    const dbPath = config.database.path;
    const dbDir = path.dirname(dbPath);
    
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  async initialize(): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        telegram_id INTEGER PRIMARY KEY,
        wallet_address TEXT UNIQUE NOT NULL,
        encrypted_key TEXT NOT NULL,
        salt TEXT NOT NULL,
        iv TEXT NOT NULL,
        auth_tag TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        last_active TEXT DEFAULT (datetime('now')),
        settings TEXT DEFAULT '{"slippage_tolerance": 1, "notifications": {"trades": true, "price_alerts": true}}'
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        tx_hash TEXT NOT NULL,
        tx_type TEXT NOT NULL,
        pool_id TEXT,
        amount_in TEXT,
        amount_out TEXT,
        token_type TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS price_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        pool_id TEXT NOT NULL,
        condition TEXT NOT NULL,
        target_price TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
      CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active);
    `);
    logger.info('Database initialized successfully');
  }

  async getUser(telegramId: number): Promise<User | null> {
    const row = this.db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId) as any;
    if (!row) return null;
    
    return {
      ...row,
      settings: JSON.parse(row.settings),
    };
  }

  async createUser(
    telegramId: number,
    walletAddress: string,
    encryptedKey: string,
    salt: string,
    iv: string,
    authTag: string
  ): Promise<User> {
    const stmt = this.db.prepare(
      `INSERT INTO users (telegram_id, wallet_address, encrypted_key, salt, iv, auth_tag)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    stmt.run(telegramId, walletAddress, encryptedKey, salt, iv, authTag);
    
    const user = await this.getUser(telegramId);
    return user!;
  }

  async updateUserActivity(telegramId: number): Promise<void> {
    this.db.prepare(
      "UPDATE users SET last_active = datetime('now') WHERE telegram_id = ?"
    ).run(telegramId);
  }

  async updateUserSettings(telegramId: number, settings: Partial<UserSettings>): Promise<void> {
    const user = await this.getUser(telegramId);
    if (!user) return;
    
    const updatedSettings = { ...user.settings, ...settings };
    this.db.prepare(
      'UPDATE users SET settings = ? WHERE telegram_id = ?'
    ).run(JSON.stringify(updatedSettings), telegramId);
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
    const stmt = this.db.prepare(
      `INSERT INTO transactions (user_id, tx_hash, tx_type, pool_id, amount_in, amount_out, token_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(userId, txHash, txType, poolId, amountIn, amountOut, tokenType);
    
    return this.db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid) as Transaction;
  }

  async updateTransactionStatus(txHash: string, status: string): Promise<void> {
    this.db.prepare(
      'UPDATE transactions SET status = ? WHERE tx_hash = ?'
    ).run(status, txHash);
  }

  async getUserTransactions(userId: number, limit: number = 10): Promise<Transaction[]> {
    return this.db.prepare(
      `SELECT * FROM transactions 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`
    ).all(userId, limit) as Transaction[];
  }

  async createPriceAlert(
    userId: number,
    poolId: string,
    condition: 'above' | 'below',
    targetPrice: string
  ): Promise<PriceAlert> {
    const stmt = this.db.prepare(
      `INSERT INTO price_alerts (user_id, pool_id, condition, target_price)
       VALUES (?, ?, ?, ?)`
    );
    const result = stmt.run(userId, poolId, condition, targetPrice);
    
    return this.db.prepare('SELECT * FROM price_alerts WHERE id = ?').get(result.lastInsertRowid) as PriceAlert;
  }

  async getUserPriceAlerts(userId: number): Promise<PriceAlert[]> {
    return this.db.prepare(
      'SELECT * FROM price_alerts WHERE user_id = ? AND is_active = 1'
    ).all(userId) as PriceAlert[];
  }

  async deactivatePriceAlert(alertId: number): Promise<void> {
    this.db.prepare(
      'UPDATE price_alerts SET is_active = 0 WHERE id = ?'
    ).run(alertId);
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

export const database = new DatabaseService();
export default database;
