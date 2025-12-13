# TradePool Telegram Bot - Quick Start Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Running the Bot](#running-the-bot)
5. [User Guide](#user-guide)
6. [Admin Guide](#admin-guide)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

### System Requirements
- **Node.js** 18.x or higher
- **PostgreSQL** 14.x or higher
- **npm** or **yarn** package manager
- **Sui Wallet** with testnet SUI tokens

### Accounts Needed
1. **Telegram Bot Token**
   - Talk to [@BotFather](https://t.me/botfather) on Telegram
   - Send `/newbot` and follow instructions
   - Save the bot token (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

2. **Sui Blockchain Access**
   - Deploy TradePool contracts to Sui testnet/mainnet
   - Note the package ID, registry ID, and admin cap ID

3. **Database**
   - PostgreSQL server running locally or remote
   - Create a new database: `CREATE DATABASE tradepool;`

---

## Installation

### Step 1: Navigate to Bot Directory

```bash
cd apps/telegramBot
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- `node-telegram-bot-api` - Telegram Bot API
- `@mysten/sui.js` - Sui blockchain SDK
- `pg` - PostgreSQL client
- `bip39` - Mnemonic generation
- `winston` - Logging
- And more...

---

## Configuration

### Step 1: Create Environment File

```bash
cp .env.example .env
```

### Step 2: Edit Configuration

Open `.env` and configure the following:

```env
# ===== REQUIRED SETTINGS =====

# Get this from @BotFather on Telegram
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Your Telegram user ID (get from @userinfobot)
TELEGRAM_ADMIN_IDS=123456789,987654321

# Sui blockchain (testnet or mainnet)
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_NETWORK=testnet

# Contract addresses from deployment
SUI_PACKAGE_ID=0xYOUR_PACKAGE_ID_HERE
SUI_REGISTRY_ID=0xYOUR_REGISTRY_OBJECT_ID_HERE
SUI_ADMIN_CAP_ID=0xYOUR_ADMIN_CAP_ID_HERE

# Database connection
DATABASE_URL=postgresql://username:password@localhost:5432/tradepool

# Security (MUST be exactly 32 characters)
ENCRYPTION_KEY=your_32_character_secret_key_12

# ===== OPTIONAL SETTINGS =====

REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
NODE_ENV=development
PORT=3000
```

### Step 3: Generate Secure Encryption Key

**Important:** Generate a strong 32-character encryption key:

```bash
# On Linux/macOS
openssl rand -base64 24

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
```

### Step 4: Verify Configuration

Run the configuration validator:

```bash
npm run build
node -e "require('./dist/config').validateConfig()"
```

If successful, you'll see no errors.

---

## Running the Bot

### Development Mode (with hot reload)

```bash
npm run dev
```

The bot will:
1. Connect to PostgreSQL and create tables automatically
2. Start polling Telegram for updates
3. Log all activity to console and `logs/` directory

You should see:
```
[info]: Configuration validated
[info]: Database initialized
[info]: Bot initialized
[info]: TradePool Telegram Bot is running...
```

### Production Mode

```bash
# Build TypeScript to JavaScript
npm run build

# Start the bot
npm start
```

### Using PM2 (recommended for production)

```bash
# Install PM2 globally
npm install -g pm2

# Start bot with PM2
pm2 start dist/index.js --name tradepool-bot

# View logs
pm2 logs tradepool-bot

# Restart on changes
pm2 restart tradepool-bot

# Auto-start on system boot
pm2 startup
pm2 save
```

### Using Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f bot

# Stop
docker-compose down
```

---

## User Guide

### Getting Started

1. **Find Your Bot**
   - Search for your bot on Telegram (use the username from @BotFather)
   - Click "Start" or send `/start`

2. **Create a Wallet**
   - Click "🆕 Create New Wallet"
   - Enter a strong password (min 8 characters)
   - **IMPORTANT:** Save your 12-word recovery phrase!
   - Store it in a safe place (not on your phone/computer)

3. **Alternative: Import Existing Wallet**
   - Click "📥 Import Wallet"
   - Enter your 12-word recovery phrase
   - Create a password to encrypt it
   - Delete the message with your phrase immediately

### Main Menu

Send `/menu` to access:

```
╔════════════════════════════╗
║   🌊 TradePool Dashboard   ║
╚════════════════════════════╝

[📊 My Pools]  [💱 Trade]
[➕ Add Liquidity]  [➖ Remove]
[💰 Balance]  [📜 History]
[⚙️ Settings]  [❓ Help]
```

### Viewing Pools

```bash
/pools
```

This shows all available pools:
- Pool name
- SUI and token reserves
- Total Value Locked (TVL)
- Action buttons (Details, Add Liquidity)

### Checking Balance

```bash
/balance
```

Shows:
- Your wallet address
- SUI balance
- All token balances

### Adding Liquidity

1. Send `/add_liquidity`
2. Select a pool from the list
3. Enter SUI amount (e.g., `10`)
4. Enter token amount (must maintain pool ratio)
5. Enter your wallet password
6. Wait for confirmation

You'll receive an LP receipt NFT representing your position.

### Removing Liquidity

1. Send `/remove_liquidity`
2. Select which LP position to withdraw
3. Enter your wallet password
4. Confirm withdrawal

You'll receive both SUI and tokens back proportional to your share.

### View Transaction History

```bash
/history
```

Shows your last 10 transactions with:
- Type (deposit, withdraw, buy, sell)
- Status (success, pending, failed)
- Transaction hash (clickable link to explorer)
- Timestamp

### Settings

```bash
/settings
```

Configure:
- **Slippage Tolerance** - Max acceptable price movement (default: 1%)
- **Trade Alerts** - Get notified on successful trades
- **Price Alerts** - Get notified when price targets hit

---

## Admin Guide

### Admin-Only Features

If your Telegram ID is in `TELEGRAM_ADMIN_IDS`, you can:

### Trading

#### Interactive Trading

```bash
/trade
```

1. Select a pool
2. Choose "Buy Token" or "Sell Token"
3. Enter amount
4. Review quote:
   - Expected output
   - Price impact
   - Minimum received (slippage protection)
5. Confirm with password
6. Transaction executes

#### Buy Tokens Example

```
💱 Trade
Selected pool: SUI-USDC

🟢 Buy Token
Enter amount of SUI to spend: 50

⚠️ Confirm Trade
Type: 🟢 BUY
Input: 50 SUI
Expected Output: 48.5 USDC
Price Impact: 0.8%
Minimum Received: 48.015 USDC

[✅ Confirm] [❌ Cancel]
```

#### Sell Tokens Example

```
🔴 Sell Token
Enter amount of tokens to sell: 100

⚠️ Confirm Trade
Type: 🔴 SELL
Input: 100 USDC
Expected Output: 102.3 SUI
Price Impact: 1.2%
Minimum Received: 101.3 SUI

[✅ Confirm] [❌ Cancel]
```

### Creating New Pools

**Note:** Pool creation must be done via Move CLI or SDK, not through the bot. The bot can then interact with created pools.

To create a pool using Sui CLI:

```bash
sui client call \
  --package $PACKAGE_ID \
  --module tradepool \
  --function create_pool \
  --type-args 0x2::sui::SUI <TOKEN_TYPE> \
  --args $ADMIN_CAP $REGISTRY "Pool Name" \
  --gas-budget 10000000
```

---

## Troubleshooting

### Bot Not Responding

**Problem:** Bot doesn't reply to commands

**Solutions:**
1. Check bot is running: `pm2 status` or `docker ps`
2. Check logs: `tail -f logs/combined.log`
3. Verify bot token is correct in `.env`
4. Ensure database is accessible
5. Restart bot: `pm2 restart tradepool-bot`

### "Wallet Not Found" Error

**Problem:** Bot says you need to create a wallet, but you already did

**Solutions:**
1. Check database: `psql $DATABASE_URL -c "SELECT telegram_id FROM users;"`
2. Your user ID might be different - check with [@userinfobot](https://t.me/userinfobot)
3. Database might have been reset - recreate wallet

### Transaction Failing

**Problem:** "Insufficient balance" or "Transaction failed"

**Solutions:**
1. Check SUI balance: `/balance`
2. Ensure you have enough SUI for:
   - Transaction amount
   - Gas fees (~0.001-0.01 SUI)
3. For liquidity: verify you have BOTH SUI and tokens
4. For trading: check pool has enough reserves
5. Try increasing slippage tolerance in `/settings`

### "Slippage Exceeded" Error

**Problem:** Trade fails with slippage error

**Solutions:**
1. Increase slippage tolerance:
   - Go to `/settings`
   - Click "Slippage"
   - Enter higher value (e.g., `2` for 2%)
2. Reduce trade size
3. Try again - price may have moved

### Password Not Working

**Problem:** "Wrong password" or decryption error

**Solutions:**
1. Ensure you're entering the EXACT password (case-sensitive)
2. Check for extra spaces
3. If forgotten, you must import wallet using recovery phrase
4. **Important:** Store passwords securely!

### Database Connection Errors

**Problem:** "Database connection failed"

**Solutions:**
1. Check PostgreSQL is running:
   ```bash
   # Linux/macOS
   sudo systemctl status postgresql
   # or
   pg_isready
   ```
2. Verify connection string in `.env`
3. Test connection:
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```
4. Check PostgreSQL logs:
   ```bash
   sudo tail -f /var/log/postgresql/postgresql-14-main.log
   ```

### "Invalid recovery phrase"

**Problem:** Can't import wallet with seed phrase

**Solutions:**
1. Ensure it's exactly 12 words
2. Check for typos
3. Verify words are from BIP39 wordlist
4. Separate words with single spaces
5. No extra characters or punctuation

### Logs Not Appearing

**Problem:** No log files or empty logs

**Solutions:**
1. Create logs directory: `mkdir -p logs`
2. Check file permissions: `chmod 755 logs`
3. Verify logger configuration in `src/utils/logger.ts`
4. In development, logs also appear in console

---

## Getting Help

### Support Channels

1. **GitHub Issues**: Report bugs and feature requests
2. **Telegram Support**: @TradePoolSupport (if configured)
3. **Documentation**: Check README.md and code comments

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
```

Restart bot to see detailed logs.

### Useful Commands

```bash
# View real-time logs
tail -f logs/combined.log

# Search logs for errors
grep ERROR logs/combined.log

# Check bot status
pm2 status

# View database users
psql $DATABASE_URL -c "SELECT telegram_id, wallet_address FROM users;"

# View recent transactions
psql $DATABASE_URL -c "SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;"
```

---

## Next Steps

1. **Fund Your Wallet**
   - Get testnet SUI from [Sui faucet](https://discord.com/channels/916379725201563759/971488439931392130)
   - Transfer tokens to your bot wallet address

2. **Provide Liquidity**
   - Use `/add_liquidity` to add to a pool
   - Earn fees from trades (when trading is active)

3. **Monitor Positions**
   - Check `/balance` regularly
   - View history with `/history`
   - Set up price alerts (coming soon)

4. **Admin Trading** (if you're an admin)
   - Use `/trade` to swap tokens
   - Monitor price impact
   - Adjust slippage as needed

---

## Security Checklist

- [ ] Used strong, unique password for wallet
- [ ] Saved recovery phrase in secure location (not digital)
- [ ] Enabled 2FA on Telegram account
- [ ] Using testnet for initial testing
- [ ] Never shared private keys or passwords
- [ ] Bot .env file permissions are restricted: `chmod 600 .env`
- [ ] Database has strong password
- [ ] Admin IDs properly configured
- [ ] Logs directory secured

---

**Happy Trading! 🌊**

For more information, see [README.md](./README.md)
