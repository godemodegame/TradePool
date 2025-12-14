# TradePool UI

Modern React frontend for TradePool - a Sui-based liquidity pool protocol with Momentum DEX integration.

## Features

- **Pool Management**: Create and manage SUI/TOKEN liquidity pools
- **Liquidity Provision**: Single-sided SUI deposits with LP token rewards
- **Admin Positions**: Advanced position management with Momentum DEX
- **Real-time Data**: Live pool stats and LP token value calculator

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development
- **TailwindCSS** for styling
- **@mysten/dapp-kit** for Sui wallet integration
- **@mysten/sui** for blockchain interactions

## Prerequisites

- Node.js 18+
- npm or yarn
- Sui wallet (Sui Wallet, Suiet, etc.)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```env
VITE_PACKAGE_ID=<your_package_id>
VITE_REGISTRY_ID=<pool_registry_id>
VITE_ADMIN_CAP_ID=<admin_cap_id>
VITE_MOMENTUM_VERSION_ID=<momentum_version_id>
```

3. Start development server:
```bash
npm run dev
```

## Project Structure

```
src/
├── components/
│   ├── AdminPositions.tsx    # Position management (create/add/withdraw/close)
│   ├── CreatePool.tsx         # Pool creation with optional admin
│   ├── DepositLiquidity.tsx   # Single-sided SUI deposits
│   ├── WithdrawLiquidity.tsx  # LP token redemption
│   ├── PoolInfo.tsx           # Pool details and share calculator
│   └── PoolList.tsx           # All pools overview
├── hooks/
│   └── useCoins.ts            # Coin balance hook
├── lib/
│   └── sui-client.ts          # Sui network configuration
├── types/
│   └── index.ts               # Constants and types
├── App.tsx                    # Main application
└── main.tsx                   # Entry point
```

## Components

### CreatePool
Create new SUI/TOKEN liquidity pools with:
- Custom pool name
- Token type specification
- Momentum pool integration
- Optional admin designation

### DepositLiquidity
Add liquidity to pools:
- Single-sided SUI deposits only
- Receive LP tokens (fungible)
- Automatic share calculation

### WithdrawLiquidity
Redeem LP tokens:
- Burn LP tokens
- Receive proportional SUI + TOKEN
- Multiple LP token support

### AdminPositions
Advanced position management (admin only):
- **Create Position**: Deposit SUI, auto-swap half to TOKEN, create Momentum position
- **Add Liquidity**: Add more SUI to existing position
- **Withdraw to SUI**: Remove liquidity and convert all to SUI
- **Close Position**: Complete position closure

### PoolList
Overview of all pools:
- SUI and token balances
- Total LP supply
- Admin information
- Momentum pool connection

### PoolInfo
Detailed pool information:
- Current balances
- Admin address
- LP share calculator
- Momentum integration status

## Network

Currently configured for **Sui Testnet**.

## Smart Contract Integration

The UI integrates with TradePool smart contracts that implement:
- Single-sided liquidity provision
- LP token minting/burning
- Momentum DEX position management
- Flash swap integration

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Current Deployment

**Package ID:** `0x9e934ab240dfb05fa694c08bdde9ee95d2477b085b99ea5a141ffa5dfe57096e`
**Registry ID:** `0xb7c9e8afbbe759b4a4b492b1bdbe3d691d319edf5bce2e1525b2542bcbdf1a12`
**Admin Cap ID:** `0xa9136516365bf43580fef897a1ba12460b2f64a3e373108ebd06ae14971efbf6`

## License

MIT

---

Built with ❤️ for Sui ecosystem
