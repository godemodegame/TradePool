# TradePool Telegram Bot

A comprehensive Telegram bot for interacting with TradePool smart contracts on the Sui blockchain.

## Features

### 🔐 Wallet Management
- Create new wallets with encrypted key storage
- Import existing wallets using seed phrases
- Secure password-based encryption (AES-256-GCM)
- BIP39 mnemonic generation

### 💧 Liquidity Pool Operations
- View all available pools
- Add liquidity to pools (dual-token deposits)
- Remove liquidity and burn LP receipts
- Track LP positions in real-time

### 💱 Trading (Admin Only)
- Buy tokens using SUI from pools
- Sell tokens for SUI
- Slippage protection
- Price impact calculations
- Transaction confirmations

### 📊 Portfolio Management
- View wallet balances (SUI + tokens)
- Transaction history
- LP position tracking
- Price alerts (coming soon)

### ⚙️ User Settings
- Configurable slippage tolerance
- Notification preferences
- Auto-approve thresholds

## Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for session management)
- Sui blockchain access (testnet/mainnet)

### Setup

1. **Clone and install dependencies:**

```bash
cd apps/telegramBot
npm install
```

2. **Configure environment variables:**

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# Required
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
SUI_PACKAGE_ID=0xYOUR_DEPLOYED_PACKAGE_ID
SUI_REGISTRY_ID=0xYOUR_REGISTRY_OBJECT_ID
DATABASE_URL=postgresql://user:pass@localhost:5432/tradepool
ENCRYPTION_KEY=your_32_character_encryption_key

# Optional
SUI_ADMIN_CAP_ID=0xYOUR_ADMIN_CAP_ID
TELEGRAM_ADMIN_IDS=123456789,987654321
```

3. **Set up the database:**

The database schema will be automatically initialized on first run. Alternatively:

```sql
-- Run this in your PostgreSQL database
CREATE DATABASE tradepool;
```

4. **Start the bot:**

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

## Usage

### Getting Started

1. Start a chat with your bot on Telegram
2. Send `/start` command
3. Choose to create a new wallet or import existing
4. Follow the prompts to set up your wallet

### Available Commands

#### Wallet & Account
- `/start` - Initialize bot and create/import wallet
- `/balance` - Check wallet balances
- `/menu` - Main menu with all options

#### Pool Management
- `/pools` - View all available pools
- `/pool_info <pool_id>` - View detailed pool information

#### Liquidity Operations
- `/add_liquidity` - Add liquidity to a pool
- `/remove_liquidity` - Withdraw liquidity from a pool
- `/my_positions` - View your LP positions

#### Trading (Admin Only)
- `/trade` - Interactive trading interface
- `/buy` - Buy tokens with SUI
- `/sell` - Sell tokens for SUI

#### Utilities
- `/history` - View transaction history
- `/settings` - Configure preferences
- `/help` - Show help information

## Architecture

```
apps/telegramBot/
├── src/
│   ├── commands/           # Bot command handlers
│   │   ├── start.command.ts
│   │   ├── menu.command.ts
│   │   ├── pools.command.ts
│   │   ├── balance.command.ts
│   │   ├── liquidity.command.ts
│   │   ├── trade.command.ts
│   │   ├── history.command.ts
│   │   └── settings.command.ts
│   ├── services/           # Business logic
│   │   ├── sui.service.ts      # Sui blockchain integration
│   │   └── wallet.service.ts   # Wallet management
│   ├── database/           # Database layer
│   │   └── index.ts
│   ├── middleware/         # Auth, rate limiting, etc.
│   │   └── index.ts
│   ├── utils/             # Utilities
│   │   ├── crypto.ts          # Encryption helpers
│   │   ├── formatting.ts      # Display formatters
│   │   └── logger.ts          # Winston logger
│   ├── types/             # TypeScript interfaces
│   │   └── index.ts
│   └── index.ts           # Main entry point
├── config/
│   └── index.ts           # Configuration management
├── tests/                 # Test files
├── package.json
├── tsconfig.json
└── .env.example
```

## Security

### Wallet Security
- Private keys encrypted with AES-256-GCM
- PBKDF2 key derivation (100,000 iterations)
- User-controlled passwords
- Seed phrases generated with BIP39

### Transaction Security
- Password confirmation for all transactions
- Slippage protection
- Transaction preview before execution
- Rate limiting (10 requests/minute)

### Best Practices
- Never store passwords in plaintext
- Delete sensitive messages immediately
- Use strong, unique passwords
- Backup seed phrases securely
- Enable 2FA on Telegram account

## Development

### Running Tests

```bash
npm test
npm run test:watch
```

### Linting and Formatting

```bash
npm run lint
npm run format
```

### Database Migrations

The bot automatically creates tables on first run. For manual migrations:

```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# Run schema from src/database/index.ts
```

## Deployment

### Using Docker

```bash
# Build image
docker build -t tradepool-bot .

# Run container
docker run -d \
  --name tradepool-bot \
  --env-file .env \
  -v $(pwd)/logs:/app/logs \
  tradepool-bot
```

### Using Docker Compose

```bash
docker-compose up -d
```

### Environment Setup

For production, ensure:
- Strong encryption key (32+ random characters)
- Secure database credentials
- Rate limiting enabled
- Logging configured
- Monitoring set up

## Troubleshooting

### Bot not responding
- Check if bot is running: `pm2 status` or `docker ps`
- Verify bot token is correct
- Check logs: `tail -f logs/combined.log`

### Transaction failures
- Verify wallet has sufficient SUI for gas
- Check pool reserves are adequate
- Increase slippage tolerance if needed
- Verify smart contract addresses are correct

### Database errors
- Ensure PostgreSQL is running
- Verify connection string in `.env`
- Check database permissions

### Wallet issues
- Verify password is correct
- Check encryption key hasn't changed
- Ensure seed phrase is valid (12 words)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT

## Support

For issues and questions:
- GitHub Issues: [Link to repo issues]
- Telegram: @TradePoolSupport
- Documentation: [Link to docs]

## Roadmap

### Phase 1 (Current)
- ✅ Wallet creation/import
- ✅ Pool browsing
- ✅ Add/remove liquidity
- ✅ Admin trading
- ✅ Transaction history

### Phase 2
- [ ] Price alerts
- [ ] Portfolio analytics
- [ ] Batch operations
- [ ] Multi-language support

### Phase 3
- [ ] Limit orders
- [ ] DCA strategies
- [ ] Social features
- [ ] Referral system

### Phase 4
- [ ] Momentum DEX integration
- [ ] Cross-pool arbitrage
- [ ] Advanced analytics
- [ ] Mobile app companion

## Credits

Built with:
- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api)
- [@mysten/sui.js](https://github.com/MystenLabs/sui)
- [TypeScript](https://www.typescriptlang.org/)
- [PostgreSQL](https://www.postgresql.org/)

---

**⚠️ Disclaimer:** This is beta software. Use at your own risk. Always backup your seed phrases and test with small amounts first.
