# TradePool

Liquidity pools with DEX trading integration on Sui blockchain. Generic `Pool<TOKEN>` architecture supporting any SUI/TOKEN pairs with admin-controlled trading functions.

## Features

- **Generic Pools**: Create pools for any SUI/TOKEN pair (`Pool<USDC>`, `Pool<WETH>`, etc.)
- **Dual-Token Liquidity**: Deposit and withdraw both SUI and TOKEN proportionally
- **Admin Trading**: Built-in `admin_buy_token()` and `admin_sell_token()` functions
- **DEX Ready**: Prepared for Momentum DEX integration with detailed TODO guides
- **Non-Fungible LP**: Receipt-based LP positions with merge/split operations
- **Type Safety**: Compile-time type safety with Move generics

## Quick Start

### Build & Test

```bash
sui move build
sui move test
```

### Create a Pool

```move
use tradepool::tradepool;

// Admin creates SUI/USDC pool
tradepool::create_pool<USDC>(&admin_cap, &mut registry, b"SUI-USDC", ctx);
```

### Add Liquidity

```move
// User deposits both SUI and USDC
let receipt = tradepool::deposit<USDC>(
    &mut pool,
    sui_coin,   // Coin<SUI>
    usdc_coin,  // Coin<USDC>
    ctx
);
```

### Admin Trading

```move
// Buy USDC with SUI from pool
let usdc = tradepool::admin_buy_token<USDC>(
    &admin_cap,
    &mut pool,
    sui_payment,
    min_usdc_out,  // slippage protection
    ctx
);

// Sell USDC for SUI
let sui = tradepool::admin_sell_token<USDC>(
    &admin_cap,
    &mut pool,
    usdc_payment,
    min_sui_out,   // slippage protection
    ctx
);
```

### Remove Liquidity

```move
// Withdraw both tokens
let (sui_coin, usdc_coin) = tradepool::withdraw<USDC>(
    &mut pool,
    receipt,
    ctx
);
```

## Architecture

### Two Implementations

| Module | Use Case | Token Support | Trading |
|--------|----------|---------------|---------|
| **`tradepool.move`** | Trading pools with DEX integration | Any SUI/TOKEN pair | ✅ Admin trading |
| **`pool_factory.move`** | Simple liquidity pools | SUI only | ❌ No trading |

### Current Status

- ✅ Generic `Pool<TOKEN>` architecture
- ✅ Dual-token liquidity provision
- ✅ Admin trading functions with slippage protection
- ✅ Constant product formula (x*y=k) simulation
- ⏳ Momentum DEX integration (ready with TODO guides)

## Momentum DEX Integration

The project is **ready for Momentum DEX integration**. See:

- **`MOMENTUM_INTEGRATION.md`** - Complete integration guide
- **`sources/tradepool.move:320-361`** - TODO for `admin_buy_token()`
- **`sources/tradepool.move:411-453`** - TODO for `admin_sell_token()`

Current implementation uses constant product formula for simulation. Replace with actual Momentum DEX calls following the detailed TODOs in code.

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Complete development guide (390 lines)
- **[MOMENTUM_INTEGRATION.md](MOMENTUM_INTEGRATION.md)** - DEX integration guide
- **[Move 2024.beta Docs](https://docs.sui.io/)**

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 0 | `EZeroAmount` | Deposit/withdraw/trade amount is zero |
| 2 | `EPoolAlreadyExists` | Pool for this token type already exists |
| 3 | `EInsufficientBalance` | Pool lacks tokens for operation |
| 4 | `ESlippageExceeded` | Trade output below minimum |
| 5 | `EInvalidReceipt` | Receipt doesn't match pool |

## Project Structure

```
TradePool/
├── sources/
│   ├── tradepool.move         # Main: Generic pools + trading
│   └── pool_factory.move      # Simple: SUI-only pools
├── tests/
│   └── tradepool_tests.move   # Unit tests
├── CLAUDE.md                  # Development guide
├── MOMENTUM_INTEGRATION.md    # DEX integration guide
└── Move.toml                  # Package manifest
```

## Trading Algorithm

Uses **constant product formula (x*y=k)**:

**Buy TOKEN:**
```
token_out = (sui_in × token_reserve) / (sui_reserve + sui_in)
```

**Sell TOKEN:**
```
sui_out = (token_in × sui_reserve) / (token_reserve + token_in)
```

> Replace with Momentum DEX calls in production - see TODO comments in code.

## Examples

See **[CLAUDE.md](CLAUDE.md#quick-start-examples)** for more examples including:
- Creating pools
- Managing LP receipts
- Multi-pool scenarios
- Receipt merge/split operations

## Contributing

1. Fork the repository
2. Create your feature branch
3. Follow Move style guidelines
4. Add tests for new features
5. Submit a pull request

## Resources

- **Sui Documentation**: https://docs.sui.io/
- **Move Language**: https://move-language.github.io/move/
- **Momentum DEX**: https://docs.mmt.finance

## License

MIT

---

**Built with Move 2024.beta** | **Ready for Momentum DEX integration**
