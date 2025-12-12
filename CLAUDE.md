# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TradePool is a Sui Move smart contract project implementing liquidity pools with DEX trading integration on the Sui blockchain. The project uses Move 2024.beta edition and includes two distinct pool implementations.

## Build & Test Commands

```bash
# Build the project
sui move build

# Run all tests
sui move test

# Run tests with verbose output
sui move test -- --verbose

# Run a specific test
sui move test test_first_deposit

# Build and run tests in one go
sui move build && sui move test
```

## Architecture

### Two Pool Implementations

The project contains two separate pool systems that serve different use cases:

#### 1. Trading Pool (`tradepool.move`) ⭐ **Main Implementation**
- **Purpose**: Multi-pool system with generic token support and DEX trading integration
- **LP Token Type**: `LPReceipt` objects (non-fungible, pool-specific)
- **Key Feature**: Generic `Pool<phantom TOKEN>` supports any SUI/TOKEN pair with built-in trading functions
- **Use Case**: Trading pools with admin-controlled DEX integration (ready for Momentum DEX)

**Structure:**
- `PoolRegistry` - Shared object tracking all pools by token type
- `Pool<phantom TOKEN>` - Generic pool supporting any token paired with SUI
- `LPReceipt` - Non-fungible LP position receipt
- `AdminCap` - Capability for pool creation and trading operations

**Key Features:**
- **Generic Tokens**: `Pool<USDC>`, `Pool<WETH>`, etc. - any token can be paired with SUI
- **Dual Balances**: Each pool holds both `Balance<SUI>` and `Balance<TOKEN>`
- **Admin Trading**: `admin_buy_token()` and `admin_sell_token()` functions for DEX integration
- **Event Tracking**: Comprehensive events including `TradeExecutedEvent`
- **Receipt Management**: `merge_receipts()`, `split_receipt()` for LP position management

**Functions:**
- `create_pool<TOKEN>()` → void (creates new SUI/TOKEN pool)
- `deposit<TOKEN>()` → `LPReceipt` (requires both SUI and TOKEN)
- `withdraw<TOKEN>()` → `(Coin<SUI>, Coin<TOKEN>)` (returns both tokens)
- `admin_buy_token<TOKEN>()` → `Coin<TOKEN>` (admin trades SUI for TOKEN)
- `admin_sell_token<TOKEN>()` → `Coin<SUI>` (admin trades TOKEN for SUI)

**DEX Integration:**
- Currently uses constant product formula (x*y=k) for simulation
- **Ready for Momentum DEX integration** - see detailed TODO comments in code
- See `MOMENTUM_INTEGRATION.md` for integration guide

#### 2. Pool Factory (`pool_factory.move`) - **Simple Liquidity Pools**
- **Purpose**: Create unlimited independent SUI-only pools, each with unique names
- **LP Token Type**: `LPReceipt` objects (non-fungible, pool-specific)
- **Key Feature**: Registry-based system tracking multiple pools by name
- **Use Case**: Simple SUI liquidity pools without trading functionality

**Structure:**
- `PoolRegistry` - Shared object tracking all created pools by name
- `Pool` - Individual shared pool objects (one per pool, SUI-only)
- `LPReceipt` - Ownership receipt tied to specific pool ID
- No trading functions (liquidity provision only)

**Functions:**
- `create_pool()` → void (creates named SUI pool)
- `deposit()` → `LPReceipt` (deposits SUI only)
- `withdraw()` → `Coin<SUI>` (withdraws SUI only)

### Key Architectural Differences

| Feature | tradepool.move | pool_factory.move |
|---------|---------------|-------------------|
| **Primary Use Case** | Trading pools with DEX integration | Simple SUI liquidity pools |
| **Token Support** | Generic: any SUI/TOKEN pair | SUI only |
| **Number of pools** | Unlimited (by token type) | Unlimited (by name) |
| **LP representation** | Non-fungible `LPReceipt` | Non-fungible `LPReceipt` |
| **Pool identification** | Token type (`TypeName`) | Pool name (`String`) |
| **Deposits require** | Both SUI and TOKEN | SUI only |
| **Withdrawals return** | Both SUI and TOKEN | SUI only |
| **Trading functions** | ✅ `admin_buy_token`, `admin_sell_token` | ❌ None |
| **DEX Integration** | ✅ Ready (with TODO guides) | ❌ Not applicable |
| **Receipt operations** | `merge_receipts`, `split_receipt` | `merge_receipts`, `split_receipt` |
| **Registry type** | `Table<TypeName, ID>` | `Table<String, ID>` |

### Share Calculation Algorithm

Both implementations use proportional share calculation:

**tradepool.move - Dual Token Deposits:**
```
if pool is empty:
    shares = sui_amount (1:1 ratio)
else:
    sui_shares = (sui_amount × total_shares) ÷ sui_balance
    token_shares = (token_amount × total_shares) ÷ token_balance
    shares = min(sui_shares, token_shares)  // Maintain pool ratio
```

**pool_factory.move - Single Token Deposits:**
```
if pool is empty:
    shares = sui_amount (1:1 ratio)
else:
    shares = (sui_amount × total_shares) ÷ sui_balance
```

**Withdrawal (both implementations):**
```
sui_to_withdraw = (shares × sui_balance) ÷ total_shares
token_to_withdraw = (shares × token_balance) ÷ total_shares  // tradepool only
```

### Trading Algorithm (tradepool.move only)

Admin trading functions use **constant product formula (x*y=k)**:

**Buy TOKEN with SUI:**
```
token_out = (sui_in × token_reserve) / (sui_reserve + sui_in)
```

**Sell TOKEN for SUI:**
```
sui_out = (token_in × sui_reserve) / (token_reserve + token_in)
```

> **TODO**: This is a simulation. In production, replace with Momentum DEX calls. See detailed TODO comments at:
> - `sources/tradepool.move:320-361` (admin_buy_token)
> - `sources/tradepool.move:411-453` (admin_sell_token)
> - `MOMENTUM_INTEGRATION.md` for full integration guide

### Important Implementation Details

1. **Integer Division**: All arithmetic uses integer division (rounds down). This can lead to dust accumulation in pools.

2. **First Deposit Edge Case**: The first depositor sets the initial ratio at 1:1. Subsequent deposits maintain proportionality.

3. **Zero Amount Checks**: Both implementations validate amounts > 0 with error code `EZeroAmount = 0`.

4. **Pool Emptying**: When the last LP holder withdraws, the pool returns to initial state (0 balances, 0 shares). The next deposit becomes a "first deposit".

5. **Generic Type Safety** (tradepool.move): Pool<USDC> is distinct from Pool<WETH> at compile time, preventing type confusion.

6. **Slippage Protection** (tradepool.move): Trading functions require `min_token_out` or `min_sui_out` parameters to prevent excessive slippage.

## Test Structure

Tests are located in `tests/tradepool_tests.move` for the single pool implementation.

**Note**: Tests are for the old `tradepool.move` implementation. After refactoring to generic pools with trading, tests need to be updated.

**Current test coverage (needs update):**
- Initialization and pool creation
- First deposit (1:1 ratio verification)
- Proportional deposits (multiple users)
- Full and partial withdrawals
- Multiple user scenarios (deposit → partial withdraw → full withdraw)
- Pool re-initialization after emptying
- View function validation
- Zero amount error handling

**TODO**: Add tests for:
- Generic pool creation with different token types
- Dual-token deposits
- Admin trading functions
- Receipt merge/split operations
- Cross-pool validation

## Module Patterns

### Event Emission

**tradepool.move:**
- `PoolCreatedEvent` - new pool creation with token type
- `DepositEvent` - includes both SUI and TOKEN amounts, pool state
- `WithdrawEvent` - includes both SUI and TOKEN amounts, pool state
- `TradeExecutedEvent` - **admin trades with direction ("buy"/"sell")**

**pool_factory.move:**
- `PoolCreatedEvent` - new pool creation with name and token type
- `DepositEvent` - includes pool state after deposit
- `WithdrawEvent` - includes pool state after withdrawal

### Function Return Values

**tradepool.move:**
- `create_pool<TOKEN>()` → void (shares pool as side effect)
- `deposit<TOKEN>()` → `LPReceipt` (non-fungible receipt)
- `withdraw<TOKEN>()` → `(Coin<SUI>, Coin<TOKEN>)` (returns both tokens)
- `admin_buy_token<TOKEN>()` → `Coin<TOKEN>` (trades pool's SUI for TOKEN)
- `admin_sell_token<TOKEN>()` → `Coin<SUI>` (trades pool's TOKEN for SUI)

**pool_factory.move:**
- `create_pool()` → void (shares pool as side effect)
- `deposit()` → `LPReceipt` (non-fungible receipt)
- `withdraw()` → `Coin<SUI>` (destroys receipt, returns SUI)

### Pool Registry

**tradepool.move:**
- Uses `Table<TypeName, ID>` to map token types to pool IDs
- Each token type can have only one pool (e.g., one SUI/USDC pool)
- Use `pool_exists<TOKEN>(registry)` to check if pool exists
- Creating a pool for existing token type fails with `EPoolAlreadyExists = 2`

**pool_factory.move:**
- Uses `Table<String, ID>` to map pool names to pool IDs
- Pool names must be unique
- Creating a pool with an existing name fails with `EPoolNameTaken = 2`
- Use `pool_exists(registry, name)` to check before creation

## Development Notes

### When to Use Which Implementation

**Use `tradepool.move` when:**
- You need trading functionality with DEX integration
- Supporting multiple token pairs (SUI/USDC, SUI/WETH, etc.)
- Admin needs to execute trades on behalf of the pool
- Preparing for Momentum DEX integration
- Need type-safe generic pools

**Use `pool_factory.move` when:**
- You only need simple SUI liquidity pools
- No trading functionality required
- Pools identified by human-readable names
- Simpler implementation without generic types

### Extending the Code

**For tradepool.move:**
- **Momentum Integration**: Follow TODO comments in code and `MOMENTUM_INTEGRATION.md`
- **Fees**: Add fee parameter to trading functions, collect fees to treasury
- **Multi-hop Swaps**: Compose multiple pool swaps in PTB (Programmable Transaction Blocks)
- **Price Oracles**: Add price feed integration for better slippage protection
- **Governance**: Replace AdminCap with DAO voting for trading decisions

**For both implementations:**
- **Minimum Liquidity**: Lock initial LP tokens to prevent first-depositor attacks
- **Time locks**: Add timestamp fields to `LPReceipt` for vesting
- **Emergency Pause**: Add pause mechanism for security incidents

### Common Gotchas

1. **Generic Type Parameters** (tradepool.move): Always specify token type: `deposit<USDC>()`, not `deposit()`.

2. **Dual Token Requirements** (tradepool.move): Deposits require BOTH SUI and TOKEN. Cannot deposit only one asset.

3. **Test-Only Functions**: Both modules expose `init_for_testing()` which allows tests to call the private `init()` function.

4. **Shared Objects**: Pools are shared objects, meaning anyone can call liquidity functions. Only admin can call trading functions (requires `AdminCap`).

5. **Receipt Validation**: Always verify `receipt.pool_id` matches the pool ID before withdrawal to prevent cross-pool attacks. Also verify `receipt.token_type` in tradepool.move.

6. **Deprecated Functions**: Code uses `type_name::get<T>()` which is deprecated. Consider replacing with `type_name::with_defining_ids<T>()` in future updates.

## Momentum DEX Integration

The `tradepool.move` module is **ready for Momentum DEX integration** with detailed TODO comments:

### Integration Resources
- **Primary Guide**: `MOMENTUM_INTEGRATION.md` - complete step-by-step integration guide
- **Code TODOs**:
  - `sources/tradepool.move:1-34` - Module-level integration overview
  - `sources/tradepool.move:70-83` - Pool struct modification (add `momentum_pool_id`)
  - `sources/tradepool.move:320-361` - `admin_buy_token()` integration (60 lines of guidance)
  - `sources/tradepool.move:411-453` - `admin_sell_token()` integration (40 lines of guidance)

### Current Status
- ✅ Architecture ready for integration
- ✅ Generic types support any token pairs
- ✅ Trading functions with slippage protection
- ✅ Comprehensive TODO comments with code examples
- ⏳ Awaiting Momentum SDK/documentation release

### Alternative Approach: PTB
Instead of on-chain integration, consider using **Programmable Transaction Blocks** from client side to compose TradePool operations with Momentum DEX calls. This provides more flexibility and simpler upgrades.

## Error Codes

**tradepool.move:**
- `EZeroAmount = 0` - Deposit/withdraw/trade amount is zero
- `EPoolNotFound = 1` - Pool does not exist (unused currently)
- `EPoolAlreadyExists = 2` - Pool for this token type already exists
- `EInsufficientBalance = 3` - Pool doesn't have enough tokens for operation
- `ESlippageExceeded = 4` - Trade output is below minimum specified
- `EInvalidReceipt = 5` - Receipt doesn't match pool or token type

**pool_factory.move:**
- `EZeroAmount = 0` - Deposit/withdraw amount is zero
- `EPoolNameTaken = 2` - Pool name already exists
- `EInsufficientShares = 3` - Invalid receipt or insufficient shares for operation

## File Structure

```
TradePool/
├── sources/
│   ├── tradepool.move         # Main: Generic pools + DEX trading (484 lines)
│   └── pool_factory.move      # Simple: SUI-only liquidity pools (336 lines)
├── tests/
│   └── tradepool_tests.move   # Tests (needs update for new architecture)
├── Move.toml                  # Package manifest
├── CLAUDE.md                  # This file - development guide
└── MOMENTUM_INTEGRATION.md    # DEX integration guide
```

## Quick Start Examples

### Creating a SUI/USDC Trading Pool

```move
// Admin creates pool for SUI/USDC pair
create_pool<USDC>(&admin_cap, &mut registry, b"SUI-USDC", ctx);
```

### Adding Liquidity

```move
// User deposits both SUI and USDC to get LP receipt
let receipt = deposit<USDC>(
    &mut pool,
    sui_coin,    // Coin<SUI>
    usdc_coin,   // Coin<USDC>
    ctx
);
```

### Admin Trading (Buy)

```move
// Admin buys USDC with SUI from pool
let usdc_received = admin_buy_token<USDC>(
    &admin_cap,
    &mut pool,
    sui_payment,  // Coin<SUI>
    1000,         // min USDC out (slippage protection)
    ctx
);
```

### Admin Trading (Sell)

```move
// Admin sells USDC for SUI from pool
let sui_received = admin_sell_token<USDC>(
    &admin_cap,
    &mut pool,
    usdc_payment, // Coin<USDC>
    5000,         // min SUI out (slippage protection)
    ctx
);
```

### Removing Liquidity

```move
// User burns LP receipt to get both tokens back
let (sui_coin, usdc_coin) = withdraw<USDC>(
    &mut pool,
    receipt,
    ctx
);
```

## Additional Resources

- **Sui Documentation**: https://docs.sui.io/
- **Move Language**: https://move-language.github.io/move/
- **Momentum DEX**: https://docs.mmt.finance
- **Sui PTB Guide**: https://docs.sui.io/concepts/transactions/programmable-transaction-blocks

---

**Last Updated**: 2025-12-12
**Project Version**: 0.2.0 (with DEX trading integration)
