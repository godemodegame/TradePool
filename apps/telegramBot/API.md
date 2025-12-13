# TradePool Telegram Bot - API Documentation

## Overview

This document describes the internal APIs and architecture of the TradePool Telegram bot.

---

## Architecture

### Layer Structure

```
┌─────────────────────────────────────┐
│     Telegram Bot API (External)     │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│   Command Handlers (src/commands)   │
│  - start, menu, pools, trade, etc.  │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│    Middleware (src/middleware)      │
│  - Auth, Rate Limiting, Errors      │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│     Services (src/services)         │
│  - Sui Service, Wallet Service      │
└─────────────────────────────────────┘
                 ↓
┌──────────────┬──────────────────────┐
│   Database   │   Sui Blockchain     │
│  PostgreSQL  │   (via RPC)          │
└──────────────┴──────────────────────┘
```

---

## Services API

### SuiService

**Location:** `src/services/sui.service.ts`

Handles all Sui blockchain interactions.

#### Methods

##### `getWalletInfo(address: string): Promise<WalletInfo>`

Get wallet balance and token information.

```typescript
const info = await suiService.getWalletInfo('0x123...');
// Returns: { address, sui_balance, tokens: [...] }
```

##### `getAllPools(): Promise<PoolData[]>`

Fetch all pools from the registry.

```typescript
const pools = await suiService.getAllPools();
// Returns: [{ id, name, token_type, sui_reserve, token_reserve, lp_supply }]
```

##### `getPoolData(poolId: string): Promise<PoolData | null>`

Get detailed information about a specific pool.

```typescript
const pool = await suiService.getPoolData('0xabc...');
// Returns: { id, name, token_type, reserves, lp_supply }
```

##### `getUserLPReceipts(address: string): Promise<LPReceipt[]>`

Get all LP receipt NFTs owned by a user.

```typescript
const receipts = await suiService.getUserLPReceipts('0x123...');
// Returns: [{ id, pool_id, token_type, sui_amount, token_amount, shares }]
```

##### `buildDepositTransaction(...): Promise<TransactionBlock>`

Build a transaction to add liquidity.

```typescript
const tx = await suiService.buildDepositTransaction(
  poolId,
  suiAmount,
  tokenAmount,
  tokenType,
  userAddress
);
```

##### `buildWithdrawTransaction(...): Promise<TransactionBlock>`

Build a transaction to remove liquidity.

```typescript
const tx = await suiService.buildWithdrawTransaction(
  poolId,
  receiptId,
  tokenType
);
```

##### `buildAdminBuyTransaction(...): Promise<TransactionBlock>`

Build admin trade transaction (buy tokens with SUI).

```typescript
const tx = await suiService.buildAdminBuyTransaction(
  poolId,
  suiAmount,
  minTokenOut,
  tokenType
);
```

##### `buildAdminSellTransaction(...): Promise<TransactionBlock>`

Build admin trade transaction (sell tokens for SUI).

```typescript
const tx = await suiService.buildAdminSellTransaction(
  poolId,
  tokenAmount,
  minSuiOut,
  tokenType,
  userAddress
);
```

##### `calculateBuyQuote(...): TradeQuote`

Calculate expected output for buying tokens.

```typescript
const quote = suiService.calculateBuyQuote(
  suiAmount,
  suiReserve,
  tokenReserve,
  slippage
);
// Returns: { input_amount, output_amount, price_impact, minimum_received, gas_estimate }
```

##### `calculateSellQuote(...): TradeQuote`

Calculate expected output for selling tokens.

```typescript
const quote = suiService.calculateSellQuote(
  tokenAmount,
  suiReserve,
  tokenReserve,
  slippage
);
```

##### `executeTransaction(...): Promise<string>`

Sign and execute a transaction block.

```typescript
const txHash = await suiService.executeTransaction(tx, keypair);
// Returns: transaction digest (hash)
```

---

### WalletService

**Location:** `src/services/wallet.service.ts`

Manages wallet creation, import, and key management.

#### Methods

##### `createWallet(telegramId: number, password: string): Promise<{ address, mnemonic }>`

Create a new wallet for a user.

```typescript
const { address, mnemonic } = await walletService.createWallet(userId, password);
// Returns: { address: '0x123...', mnemonic: 'word1 word2 ...' }
```

##### `importWallet(telegramId: number, mnemonic: string, password: string): Promise<string>`

Import an existing wallet using seed phrase.

```typescript
const address = await walletService.importWallet(userId, mnemonic, password);
// Returns: '0x123...'
```

##### `getKeypair(telegramId: number, password: string): Promise<Ed25519Keypair>`

Decrypt and return user's keypair (for signing transactions).

```typescript
const keypair = await walletService.getKeypair(userId, password);
// Returns: Ed25519Keypair instance
```

##### `getWalletAddress(telegramId: number): Promise<string | null>`

Get user's wallet address without requiring password.

```typescript
const address = await walletService.getWalletAddress(userId);
// Returns: '0x123...' or null
```

##### `hasWallet(telegramId: number): Promise<boolean>`

Check if user has a wallet.

```typescript
const exists = await walletService.hasWallet(userId);
// Returns: true/false
```

---

## Database API

**Location:** `src/database/index.ts`

PostgreSQL database operations.

### Methods

##### `initialize(): Promise<void>`

Create database tables if they don't exist.

```typescript
await database.initialize();
```

##### `getUser(telegramId: number): Promise<User | null>`

Fetch user record.

```typescript
const user = await database.getUser(123456789);
// Returns: { telegram_id, wallet_address, encrypted_key, ... }
```

##### `createUser(...): Promise<User>`

Create new user record.

```typescript
const user = await database.createUser(
  telegramId,
  walletAddress,
  encryptedKey,
  salt,
  iv,
  authTag
);
```

##### `updateUserActivity(telegramId: number): Promise<void>`

Update last_active timestamp.

```typescript
await database.updateUserActivity(userId);
```

##### `updateUserSettings(telegramId: number, settings: Partial<UserSettings>): Promise<void>`

Update user preferences.

```typescript
await database.updateUserSettings(userId, {
  slippage_tolerance: 2,
  notifications: { trades: true, price_alerts: false }
});
```

##### `createTransaction(...): Promise<Transaction>`

Record a new transaction.

```typescript
const tx = await database.createTransaction(
  userId,
  txHash,
  'deposit',
  poolId,
  amountIn,
  amountOut,
  tokenType
);
```

##### `updateTransactionStatus(txHash: string, status: string): Promise<void>`

Update transaction status.

```typescript
await database.updateTransactionStatus(txHash, 'success');
```

##### `getUserTransactions(userId: number, limit?: number): Promise<Transaction[]>`

Get user's transaction history.

```typescript
const txs = await database.getUserTransactions(userId, 10);
```

##### `createPriceAlert(...): Promise<PriceAlert>`

Create a price alert.

```typescript
const alert = await database.createPriceAlert(
  userId,
  poolId,
  'above',
  '1.05'
);
```

##### `getUserPriceAlerts(userId: number): Promise<PriceAlert[]>`

Get user's active price alerts.

```typescript
const alerts = await database.getUserPriceAlerts(userId);
```

---

## Middleware API

**Location:** `src/middleware/index.ts`

### Functions

##### `authMiddleware(bot, msg, next)`

Verify user has a wallet before executing command.

```typescript
bot.onText(/\/balance/, async (msg) => {
  await authMiddleware(bot, msg, async () => {
    // Command logic here
  });
});
```

##### `adminMiddleware(bot, msg, adminIds, next)`

Verify user is an admin.

```typescript
bot.onText(/\/trade/, async (msg) => {
  await adminMiddleware(bot, msg, config.telegram.adminIds, async () => {
    // Admin-only logic
  });
});
```

##### `rateLimitMiddleware(bot, msg, next)`

Enforce rate limiting (10 requests/minute).

```typescript
rateLimitMiddleware(bot, msg, () => {
  // Execute command
});
```

##### `errorHandler(bot, chatId, error)`

Handle and format errors for users.

```typescript
try {
  // Operation
} catch (error) {
  errorHandler(bot, chatId, error);
}
```

### Classes

##### `RateLimiter`

```typescript
const limiter = new RateLimiter(maxRequests, windowMs);

if (limiter.checkLimit(userId)) {
  // Allow request
} else {
  // Reject - rate limit exceeded
}
```

---

## Utilities API

### Crypto (`src/utils/crypto.ts`)

##### `encryptPrivateKey(privateKey: string, password: string): EncryptedData`

Encrypt a private key using AES-256-GCM.

```typescript
const encrypted = encryptPrivateKey(privateKey, password);
// Returns: { encrypted, salt, iv, authTag }
```

##### `decryptPrivateKey(encryptedData: EncryptedData, password: string): string`

Decrypt a private key.

```typescript
const privateKey = decryptPrivateKey(encrypted, password);
```

##### `generateConfirmCode(length?: number): string`

Generate random confirmation code.

```typescript
const code = generateConfirmCode(6); // 'AB12CD'
```

##### `validateAddress(address: string): boolean`

Validate Sui address format.

```typescript
const valid = validateAddress('0x123...'); // true/false
```

---

### Formatting (`src/utils/formatting.ts`)

##### `formatSuiAmount(amount: string | number, decimals?: number): string`

Format raw amount to human-readable.

```typescript
formatSuiAmount('1000000000'); // '1'
formatSuiAmount('1500000000'); // '1.5'
```

##### `parseSuiAmount(amount: string, decimals?: number): string`

Parse human-readable to raw amount.

```typescript
parseSuiAmount('1'); // '1000000000'
parseSuiAmount('1.5'); // '1500000000'
```

##### `formatUSD(amount: number): string`

Format USD amount.

```typescript
formatUSD(1234.56); // '$1,234.56'
```

##### `formatPercentage(value: number, decimals?: number): string`

Format percentage.

```typescript
formatPercentage(1.234); // '1.23%'
```

##### `shortenAddress(address: string, chars?: number): string`

Shorten address for display.

```typescript
shortenAddress('0x123...def', 6); // '0x1234...abcdef'
```

##### `calculatePriceImpact(...): number`

Calculate price impact of a trade.

```typescript
const impact = calculatePriceImpact(inputAmount, inputReserve, outputReserve);
// Returns: impact percentage
```

##### `calculateMinimumReceived(amount: string, slippageTolerance: number): string`

Calculate minimum tokens to receive with slippage.

```typescript
const minReceived = calculateMinimumReceived('1000000000', 1);
// 1% slippage -> '990000000'
```

---

### Logger (`src/utils/logger.ts`)

Winston logger instance.

```typescript
import logger from './utils/logger';

logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', { userId, error });
logger.debug('Debug details', { data });
```

Log levels: `error`, `warn`, `info`, `debug`

Logs to:
- Console (development)
- `logs/error.log` (errors only)
- `logs/combined.log` (all logs)

---

## Types

**Location:** `src/types/index.ts`

### Interfaces

```typescript
interface User {
  telegram_id: number;
  wallet_address: string;
  encrypted_key: string;
  salt: string;
  iv: string;
  auth_tag: string;
  created_at: Date;
  last_active: Date;
  settings: UserSettings;
}

interface UserSettings {
  slippage_tolerance: number;
  auto_approve_threshold?: number;
  notifications: {
    trades: boolean;
    price_alerts: boolean;
  };
}

interface PoolData {
  id: string;
  name: string;
  token_type: string;
  sui_reserve: string;
  token_reserve: string;
  lp_supply: string;
  tvl_usd?: number;
  volume_24h_usd?: number;
}

interface LPReceipt {
  id: string;
  pool_id: string;
  token_type: string;
  sui_amount: string;
  token_amount: string;
  shares: string;
}

interface TradeQuote {
  input_amount: string;
  output_amount: string;
  price_impact: number;
  minimum_received: string;
  gas_estimate: string;
}

interface Transaction {
  id: number;
  user_id: number;
  tx_hash: string;
  tx_type: 'deposit' | 'withdraw' | 'buy' | 'sell';
  pool_id: string;
  amount_in?: string;
  amount_out?: string;
  token_type?: string;
  status: 'pending' | 'success' | 'failed';
  created_at: Date;
}

interface WalletInfo {
  address: string;
  sui_balance: string;
  tokens: Array<{
    type: string;
    balance: string;
    symbol?: string;
  }>;
}
```

---

## Command Handlers

All command handlers follow this pattern:

```typescript
import TelegramBot from 'node-telegram-bot-api';
import { authMiddleware, errorHandler } from '../middleware';

export function registerCommandName(bot: TelegramBot): void {
  bot.onText(/\/command/, async (msg) => {
    await authMiddleware(bot, msg, async () => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;

      try {
        // Command logic
        await bot.sendMessage(chatId, 'Response');
      } catch (error) {
        errorHandler(bot, chatId, error);
      }
    });
  });
}
```

### Available Commands

- `start.command.ts` - Wallet creation/import
- `menu.command.ts` - Main menu navigation
- `pools.command.ts` - Pool browsing
- `balance.command.ts` - Wallet balances
- `liquidity.command.ts` - Add/remove liquidity
- `trade.command.ts` - Admin trading
- `history.command.ts` - Transaction history
- `settings.command.ts` - User preferences

---

## Configuration

**Location:** `config/index.ts`

```typescript
interface Config {
  telegram: {
    botToken: string;
    adminIds: number[];
  };
  sui: {
    rpcUrl: string;
    network: string;
    packageId: string;
    registryId: string;
    adminCapId: string;
  };
  database: {
    url: string;
  };
  security: {
    encryptionKey: string;
  };
  // ... more config
}

import { config } from '../config';

// Access config values
const token = config.telegram.botToken;
const rpcUrl = config.sui.rpcUrl;
```

---

## Error Codes

### Database Errors
- `23505` - Unique constraint violation (duplicate wallet/user)
- `23503` - Foreign key violation
- `08006` - Connection failure

### Sui Blockchain Errors
- `InsufficientGas` - Not enough SUI for gas
- `InsufficientBalance` - Not enough tokens for operation
- `ObjectNotFound` - Pool or receipt not found
- `InvalidSignature` - Wrong password/keypair

### Application Errors
- `EZeroAmount` - Amount is zero
- `EPoolNotFound` - Pool doesn't exist
- `ESlippageExceeded` - Trade slippage too high
- `EInvalidReceipt` - LP receipt invalid or doesn't belong to user

---

## Events & Logging

All significant events are logged:

```typescript
// User actions
logger.info('Wallet created', { userId, address });
logger.info('Deposit successful', { userId, poolId, amount, txHash });
logger.info('Trade executed', { userId, type, amount, txHash });

// Errors
logger.error('Transaction failed', { userId, error, txHash });
logger.warn('Rate limit exceeded', { userId });
logger.error('Database error', { operation, error });

// System
logger.info('Bot initialized');
logger.info('Database initialized');
logger.error('Polling error', { error });
```

---

## Testing

Run tests:

```bash
npm test
```

Test structure:

```
tests/
├── formatting.test.ts    # Formatting utilities
├── crypto.test.ts        # Encryption/decryption
├── sui.test.ts          # Sui service (TODO)
├── wallet.test.ts       # Wallet service (TODO)
└── integration.test.ts  # E2E tests (TODO)
```

---

## Extension Points

### Adding New Commands

1. Create `src/commands/yourcommand.command.ts`
2. Implement handler:
   ```typescript
   export function registerYourCommand(bot: TelegramBot) {
     bot.onText(/\/yourcommand/, async (msg) => {
       // Handler logic
     });
   }
   ```
3. Register in `src/index.ts`:
   ```typescript
   import { registerYourCommand } from './commands/yourcommand.command';
   registerYourCommand(bot);
   ```

### Adding New Services

1. Create `src/services/yourservice.service.ts`
2. Implement service class:
   ```typescript
   export class YourService {
     async method() {
       // Service logic
     }
   }
   export const yourService = new YourService();
   ```
3. Import and use in commands

### Adding Database Tables

1. Add table creation in `src/database/index.ts`:
   ```typescript
   await client.query(`
     CREATE TABLE IF NOT EXISTS your_table (
       id SERIAL PRIMARY KEY,
       ...
     );
   `);
   ```
2. Add interface in `src/types/index.ts`
3. Add CRUD methods in database class

---

## Performance Considerations

- **Database Connection Pooling**: Uses `pg` pool for efficient connections
- **Rate Limiting**: 10 requests/minute per user
- **Caching**: Consider adding Redis for:
  - Session management
  - Pool data caching
  - Rate limit counters
- **Transaction Batching**: Group multiple operations in single PTB when possible

---

## Security Best Practices

1. **Never log sensitive data** (passwords, private keys, seeds)
2. **Validate all user input** before processing
3. **Use prepared statements** for database queries (prevents SQL injection)
4. **Encrypt private keys** with strong passwords
5. **Verify transaction outputs** before execution
6. **Implement request signing** for admin actions (future)
7. **Rate limit all endpoints** to prevent abuse
8. **Use HTTPS** for all external API calls

---

## Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `ENCRYPTION_KEY` (32 random characters)
- [ ] Secure database credentials
- [ ] Enable SSL for PostgreSQL connection
- [ ] Set up monitoring (PM2, Docker logs)
- [ ] Configure log rotation
- [ ] Set up backup for database
- [ ] Test on testnet before mainnet
- [ ] Document admin procedures
- [ ] Set up alerts for errors

---

For more information, see:
- [README.md](./README.md) - General overview
- [QUICKSTART.md](./QUICKSTART.md) - User guide
- Source code comments
