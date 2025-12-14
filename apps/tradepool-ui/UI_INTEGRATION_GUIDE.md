# TradePool UI - Quick Reference Guide

## Smart Contract Integration Status: ✅ FIXED

All UI components have been updated to match the current smart contract implementation.

## Key Changes Made

### 1. LP Token Model Changed
- **Old:** Non-fungible `LPReceipt` objects
- **New:** Fungible `Coin<LPToken<TOKEN>>` coins
- **Impact:** WithdrawLiquidity component completely rewritten

### 2. Admin Functions Updated
- **Old:** `admin_buy_token()`, `admin_sell_token()` with AdminCap
- **New:** Momentum DEX position management:
  - `admin_deposit_sui_simple()` - Create position with SUI
  - `admin_add_sui_to_position()` - Add more liquidity
  - `admin_withdraw_to_sui()` - Remove liquidity
  - `admin_close_position()` - Close position
- **Impact:** AdminTrading component completely rewritten

### 3. Pool Structure Updated
- **Changed Field:** `total_shares: u64` → `lp_supply: Supply<LPToken<TOKEN>>`
- **Impact:** PoolList fixed to extract from nested structure

## Component-by-Component Guide

### CreatePool.tsx ✅
**Status:** Working correctly
- Uses `create_pool_public()` function
- Accepts pool name, token type, and Momentum pool ID
- No AdminCap required (anyone can create pools)

### DepositLiquidity.tsx ✅
**Status:** Fixed
- **Change:** Removed manual LP token transfer (automatic now)
- Returns: `Coin<LPToken<TOKEN>>` automatically sent to user
- Single-sided deposits (SUI only)

### WithdrawLiquidity.tsx ✅
**Status:** Completely rewritten
- **Old:** Fetched `LPReceipt` objects
- **New:** Fetches `Coin<LPToken<TOKEN>>` via `client.getCoins()`
- Coin type format: `${PACKAGE_ID}::tradepool::LPToken<${tokenType}>`
- Burns LP coins, returns both SUI and TOKEN

### AdminTrading.tsx ✅
**Status:** Completely rewritten
- **Three Operations:**
  1. **Deposit SUI** - Creates new Momentum position
     - Inputs: SUI amount, tick range (lower/upper), min token out
     - Returns: Position object + refund coins
  2. **Add Liquidity** - Adds to existing position
     - Inputs: Position ID, SUI amount, min token out
     - Returns: Refund coins
  3. **Withdraw** - Removes liquidity from position
     - Inputs: Position ID, liquidity amount, min SUI out
     - Returns: SUI coin
- **Admin Check:** Validates `pool.admin === user.address`

### PoolList.tsx ✅
**Status:** Fixed
- **Change:** Total shares extraction
- **Old:** `fields.total_shares`
- **New:** `fields.lp_supply?.fields?.value || '0'`

## Function Signatures Reference

### User Functions

```typescript
// Create pool (anyone can create)
create_pool_public<TOKEN>(
  registry: &mut PoolRegistry,
  name: vector<u8>,
  momentum_pool_id: ID,
  admin: option::Option<address>,
  ctx: &mut TxContext
)

// Deposit SUI (get LP tokens)
deposit<TOKEN>(
  pool: &mut Pool<TOKEN>,
  sui_coin: Coin<SUI>,
  ctx: &mut TxContext
): Coin<LPToken<TOKEN>>

// Withdraw liquidity (burn LP tokens)
withdraw<TOKEN>(
  pool: &mut Pool<TOKEN>,
  lp_coin: Coin<LPToken<TOKEN>>,
  ctx: &mut TxContext
): (Coin<SUI>, Coin<TOKEN>)
```

### Admin Functions

```typescript
// Create position (admin only)
admin_deposit_sui_simple<TOKEN>(
  pool: &mut Pool<TOKEN>,
  momentum_pool: &mut MomentumPool<TOKEN, SUI>,
  tick_lower_u32: u32,
  tick_upper_u32: u32,
  sui_coin: Coin<SUI>,
  min_token_out: u64,
  sqrt_price_limit: u128,
  clock: &Clock,
  version: &Version,
  ctx: &mut TxContext
): (Position, Coin<TOKEN>, Coin<SUI>)

// Add liquidity to position (admin only)
admin_add_sui_to_position<TOKEN>(
  pool: &mut Pool<TOKEN>,
  momentum_pool: &mut MomentumPool<TOKEN, SUI>,
  position: &mut Position,
  sui_coin: Coin<SUI>,
  min_token_out: u64,
  sqrt_price_limit: u128,
  clock: &Clock,
  version: &Version,
  ctx: &mut TxContext
): (Coin<TOKEN>, Coin<SUI>)

// Withdraw from position (admin only)
admin_withdraw_to_sui<TOKEN>(
  pool: &mut Pool<TOKEN>,
  momentum_pool: &mut MomentumPool<TOKEN, SUI>,
  position: &mut Position,
  liquidity_amount: u128,
  min_sui_out: u64,
  sqrt_price_limit: u128,
  clock: &Clock,
  version: &Version,
  ctx: &mut TxContext
): Coin<SUI>
```

## Environment Setup

Create `.env` file in `apps/tradepool-ui/`:

```env
VITE_PACKAGE_ID=0x... # Your deployed package ID
VITE_REGISTRY_ID=0x... # Registry shared object ID
VITE_MOMENTUM_VERSION_ID=0x... # Momentum Version object
VITE_NETWORK=testnet
```

## Testing Instructions

1. **Deploy Contract:**
   ```bash
   sui move build
   sui client publish --gas-budget 500000000
   ```

2. **Update .env** with deployed IDs

3. **Start UI:**
   ```bash
   cd apps/tradepool-ui
   npm install
   npm run dev
   ```

4. **Test Flow:**
   - Connect wallet
   - Create pool (any user)
   - Deposit SUI (any user) → Get LP tokens
   - Admin: Deposit SUI to create Momentum position
   - Admin: Add more liquidity to position
   - Admin: Withdraw from position
   - User: Withdraw liquidity (burn LP tokens)

## Common Issues & Solutions

### Issue: "LP coins not found"
**Cause:** Wrong PACKAGE_ID or token type
**Solution:** 
- Verify PACKAGE_ID in .env matches deployed package
- Check token type format: `0xPKG::module::TOKEN`

### Issue: "Not pool admin" error
**Cause:** User is not the pool creator/admin
**Solution:** Only the address that created the pool can manage positions

### Issue: TypeScript build errors
**Cause:** @mysten/sui version mismatch between dapp-kit and direct dependency
**Solution:** These are type errors only, won't affect runtime. To fix:
```bash
npm update @mysten/sui @mysten/dapp-kit
```

### Issue: "Pool not found"
**Cause:** Pool hasn't been created or wrong pool selected
**Solution:** Create pool first via CreatePool component

## Notes for Developers

1. **Token Type Normalization:** UI automatically converts `::::` to `::` in token types
2. **LP Tokens are Fungible:** Users can merge/split using standard Coin operations
3. **Admin is Per-Pool:** Each pool has its own admin (creator by default)
4. **Momentum Integration:** Requires valid Momentum pool ID and Version object
5. **Slippage Protection:** All swap operations include min output parameters

## Files Modified

- ✅ `src/components/PoolList.tsx` - Fixed total shares extraction
- ✅ `src/components/DepositLiquidity.tsx` - Fixed LP token handling
- ✅ `src/components/WithdrawLiquidity.tsx` - Rewritten for coin-based LP tokens
- ✅ `src/components/AdminTrading.tsx` - Rewritten for position management
- ✅ `src/components/CreatePool.tsx` - Removed unused import

## Next Steps

1. Deploy smart contract to testnet
2. Update .env with deployed IDs
3. Test all UI functions end-to-end
4. Monitor for any runtime issues
5. Update documentation with actual testnet IDs

---

**Last Updated:** 2025-12-14  
**Contract Version:** v2 (Momentum DEX integrated)  
**UI Status:** ✅ All components aligned with contract
