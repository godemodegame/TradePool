# Momentum DEX Integration Guide

## Status: ✅ INTEGRATED

The TradePool module is now fully integrated with Momentum DEX v3 CLMM (Concentrated Liquidity Market Maker) for executing swaps.

## Overview

TradePool uses Momentum's flash swap mechanism to execute trades on behalf of the liquidity pool. The integration allows admin-controlled trading that routes through Momentum's concentrated liquidity pools for optimal pricing.

## Architecture

### Flash Swap Pattern

Both `admin_buy_token` and `admin_sell_token` functions use Momentum's flash swap pattern:

1. **Initiate Flash Swap**: Call `mmt_v3::trade::flash_swap()` to borrow tokens
2. **Receive Assets**: Get borrowed balance and a flash receipt documenting the debt
3. **Repay Debt**: Call `mmt_v3::trade::repay_flash_swap()` with the required repayment
4. **Complete**: Transaction succeeds if debt is fully repaid

### Dependencies

The integration requires the Momentum v3 CLMM package:

```toml
[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "f63c9fc78e2171fa174dc43e757ded416c204558" }
mmt_v3 = { git = "https://github.com/mmt-finance/v3-core.git", subdir = "clmm", rev = "main" }

[addresses]
tradepool = "0x0"
mmt_v3 = "0x70285592c97965e811e0c6f98dccc3a9c2b4ad854b3594faab9597ada267b860"
```

**Note**: Both packages must use the same Sui framework revision to avoid dependency conflicts.

### Module Imports

```move
// Momentum DEX imports
use mmt_v3::pool::{Pool as MomentumPool};
use mmt_v3::trade;
use mmt_v3::version::{Version};
```

## Function Implementations

### admin_buy_token (SUI → TOKEN)

Buys TOKEN using SUI via Momentum DEX.

**Function Signature:**
```move
public fun admin_buy_token<TOKEN>(
    _admin_cap: &AdminCap,
    pool: &mut Pool<TOKEN>,
    momentum_pool: &mut MomentumPool<SUI, TOKEN>,
    sui_payment: Coin<SUI>,
    min_token_out: u64,
    sqrt_price_limit: u128,
    clock: &Clock,
    version: &Version,
    ctx: &mut TxContext
): Coin<TOKEN>
```

**How It Works:**

1. **Flash Swap**: Execute `trade::flash_swap<SUI, TOKEN>()` with:
   - `is_x_to_y = true` (SUI is X, TOKEN is Y)
   - `exact_input = true` (exact SUI amount specified)
   - Returns `(Balance<SUI>, Balance<TOKEN>, FlashSwapReceipt)`

2. **Slippage Check**: Verify `token_received >= min_token_out`

3. **Repayment**: Pay back SUI debt using the `sui_payment` coin
   - Excess SUI (if any) is added to the pool reserves

4. **Receipt Cleanup**: Repay the flash swap, destroy empty balances

5. **Returns**: TOKEN coins to the admin

### admin_sell_token (TOKEN → SUI)

Sells TOKEN for SUI via Momentum DEX.

**Function Signature:**
```move
public fun admin_sell_token<TOKEN>(
    _admin_cap: &AdminCap,
    pool: &mut Pool<TOKEN>,
    momentum_pool: &mut MomentumPool<SUI, TOKEN>,
    token_payment: Coin<TOKEN>,
    min_sui_out: u64,
    sqrt_price_limit: u128,
    clock: &Clock,
    version: &Version,
    ctx: &mut TxContext
): Coin<SUI>
```

**How It Works:**

1. **Flash Swap**: Execute `trade::flash_swap<SUI, TOKEN>()` with:
   - `is_x_to_y = false` (TOKEN is Y, SUI is X - reverse direction)
   - `exact_input = true` (exact TOKEN amount specified)
   - Returns `(Balance<SUI>, Balance<TOKEN>, FlashSwapReceipt)`

2. **Slippage Check**: Verify `sui_received >= min_sui_out`

3. **Repayment**: Pay back TOKEN debt using the `token_payment` coin
   - Excess TOKEN (if any) is added to the pool reserves

4. **Receipt Cleanup**: Repay the flash swap, destroy empty balances

5. **Returns**: SUI coins to the admin

## Usage Example

### Creating a Pool with Momentum Integration

```move
// Admin creates a SUI/USDC pool linked to Momentum
create_pool<USDC>(
    &admin_cap,
    &mut registry,
    b"SUI-USDC",
    momentum_pool_id,  // ID of the Momentum CLMM pool for SUI/USDC
    ctx
);
```

### Executing a Buy Trade

```move
// Admin buys USDC with 1000 SUI
let usdc_received = admin_buy_token<USDC>(
    &admin_cap,
    &mut tradepool,
    &mut momentum_pool,     // Shared Momentum pool object
    sui_coin,               // 1000 SUI
    950,                    // min 950 USDC out (5% slippage tolerance)
    0,                      // sqrt_price_limit: 0 = no limit
    &clock,                 // Sui Clock object
    &momentum_version,      // Momentum Version object
    ctx
);
```

### Executing a Sell Trade

```move
// Admin sells 500 USDC for SUI
let sui_received = admin_sell_token<USDC>(
    &admin_cap,
    &mut tradepool,
    &mut momentum_pool,
    usdc_coin,              // 500 USDC
    450,                    // min 450 SUI out
    340282366920938463463374607431768211455, // max u128 = no limit
    &clock,
    &momentum_version,
    ctx
);
```

## Important Parameters

### sqrt_price_limit

Controls price bounds for the swap:

- **For buying (X→Y)**: Lower limit prevents buying at too high a price
  - Use `0` for no limit, or calculate via `TickMath.priceToSqrtPriceX64(minPrice, decimalsX, decimalsY)`

- **For selling (Y→X)**: Upper limit prevents selling at too low a price
  - Use `max u128` (340282366920938463463374607431768211455) for no limit

### Momentum Version Object

The `Version` object is a shared object provided by Momentum for protocol versioning. You need to pass it to all trading functions.

### Clock Object

Sui's `Clock` object is required for timestamp validation in Momentum swaps. Use `0x6` for the shared Clock object.

## PTB Integration Pattern

For client-side integrations, you can compose Momentum swaps with TradePool operations in a Programmable Transaction Block:

```typescript
import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();

// 1. Buy token via TradePool + Momentum
const [tokenOut] = tx.moveCall({
  target: `${TRADEPOOL_PACKAGE}::tradepool::admin_buy_token`,
  arguments: [
    tx.object(ADMIN_CAP),
    tx.object(TRADEPOOL),
    tx.object(MOMENTUM_POOL),
    tx.object(SUI_COIN),
    tx.pure(MIN_TOKEN_OUT),
    tx.pure(SQRT_PRICE_LIMIT),
    tx.object('0x6'), // Clock
    tx.object(MOMENTUM_VERSION),
  ],
  typeArguments: [TOKEN_TYPE],
});

// 2. Use tokenOut in subsequent operations...
```

## Security Considerations

1. **Slippage Protection**: Always set reasonable `min_token_out` / `min_sui_out` values
   - Prevents sandwich attacks and MEV exploitation
   - Calculate based on oracle prices or recent swap data

2. **Access Control**: Only `AdminCap` holder can execute trades
   - Consider DAO governance for production deployments
   - Implement timelocks for large trades

3. **Price Limits**: Use `sqrt_price_limit` to prevent extreme price movements
   - Especially important for low-liquidity pools

4. **Flash Swap Atomicity**: All operations happen in a single transaction
   - Either the entire swap succeeds or reverts
   - No partial executions or stuck states

## Testing

Build and test the integration:

```bash
# Build the package
sui move build

# Run tests (update tests to include Momentum integration)
sui move test

# Deploy to testnet first
sui client publish --gas-budget 100000000
```

## Resources

- **Momentum Developer Docs**: https://docs.mmt.finance/core-products/momentum-dex/developers
- **Momentum v3 Core**: https://github.com/mmt-finance/v3-core
- **Momentum SDK**: https://github.com/mmt-finance/clmm-sdk
- **Sui PTB Guide**: https://docs.sui.io/concepts/transactions/programmable-transaction-blocks
- **Move Registry**: https://www.moveregistry.com/package/@mmt/clmm-core

## Troubleshooting

### Dependency Conflicts

If you see "conflicting versions of package MoveStdlib":
- Ensure both `Sui` and `mmt_v3` dependencies use the same framework revision
- Check the Momentum package's `Move.toml` for their Sui framework version
- Update your `Move.toml` to match

### Build Errors

If modules are not found:
- Verify `mmt_v3` is in both `[dependencies]` and `[addresses]` sections
- Check that the git repository and subdir path are correct
- Ensure you're using the correct branch/revision

### Runtime Errors

If swaps fail at runtime:
- Verify the Momentum pool exists and has liquidity
- Check that the `momentum_pool_id` matches the actual pool
- Ensure you're passing the correct `Version` object
- Validate that slippage parameters are reasonable

## Changelog

### v0.2.0 - 2025-12-13
- ✅ Integrated Momentum DEX flash swap functionality
- ✅ Updated `admin_buy_token` with flash swap implementation
- ✅ Updated `admin_sell_token` with flash swap implementation
- ✅ Added Momentum dependencies to `Move.toml`
- ✅ Successful build with Momentum integration
- ✅ Removed placeholder constant product formula

### v0.1.0 - 2025-12-12
- Initial architecture design
- Placeholder swap functions with constant product formula
- Generic pool structure supporting any SUI/TOKEN pair

---

**Last Updated**: 2025-12-13
**Integration Status**: Complete ✅
**Tested**: Build successful, runtime testing pending
