# Momentum DEX Integration - Quick Reference

## 🎯 TL;DR

TradePool now integrates with Momentum DEX using **Programmable Transaction Blocks (PTB)**.  
✅ Contract ready ✅ Build passing ✅ Documentation complete

## 🔑 Key Information

| Item | Value |
|------|-------|
| **Momentum Package** | `0x70285592c97965e811e0c6f98dccc3a9c2b4ad854b3594faab9597ada267b860` |
| **Integration Method** | Programmable Transaction Blocks (PTB) |
| **Module Name** | `mmt_v3` |
| **DEX Type** | CLMM (Concentrated Liquidity - Uniswap v3 style) |
| **Network** | Sui Mainnet |

## 📝 What Changed in TradePool

### Pool Struct
```move
public struct Pool<phantom TOKEN> has key {
    id: UID,
    name: String,
    sui_balance: Balance<SUI>,
    token_balance: Balance<TOKEN>,
    total_shares: u64,
    momentum_pool_id: ID,  // 👈 NEW - Reference to Momentum pool
}
```

### create_pool Function
```move
public fun create_pool<TOKEN>(
    _admin_cap: &AdminCap,
    registry: &mut PoolRegistry,
    name: vector<u8>,
    momentum_pool_id: ID,  // 👈 NEW - Must provide Momentum pool ID
    ctx: &mut TxContext
)
```

## 🚀 Quick Start

### 1. Create Pool
```typescript
tx.moveCall({
  target: `${PACKAGE}::tradepool::create_pool`,
  arguments: [
    adminCap,
    registry,
    tx.pure('SUI-USDC'),
    tx.pure('0xMOMENTUM_POOL_ID'), // 👈 Get from Momentum
  ],
  typeArguments: ['0xUSDC::usdc::USDC'],
});
```

### 2. Execute Swap (PTB)
```typescript
const tx = new TransactionBlock();

// Flash swap on Momentum
const [balX, balY, receipt] = tx.moveCall({
  target: `0x70285...::trade::flash_swap`,
  arguments: [momentumPool, isXtoY, exactInput, amount, priceLimit, clock, version],
  typeArguments: ['0x2::sui::SUI', tokenType],
});

// Repay swap
tx.moveCall({
  target: `0x70285...::trade::repay_flash_swap`,
  arguments: [momentumPool, receipt, balX, balY, version],
  typeArguments: ['0x2::sui::SUI', tokenType],
});
```

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `INTEGRATION_SUMMARY.md` | Complete integration overview |
| `MOMENTUM_PTB_GUIDE.md` | Full PTB code examples |
| `MOMENTUM_INTEGRATION.md` | Original integration plan |
| `CLAUDE.md` | Development guide |

## 💡 Key Concepts

### Flash Swap Pattern
1. **Borrow** tokens from Momentum pool (get receipt)
2. **Execute** your trading logic
3. **Repay** tokens + fees (destroy receipt)

### PTB Benefits
- ✅ No on-chain contract changes needed for updates
- ✅ Flexible composition of operations
- ✅ Atomic execution (all succeed or all fail)
- ✅ Gas efficient

## ⚡ Common Operations

### Get Momentum Pool for Token Pair
```typescript
// Use Momentum SDK or frontend to find pool IDs
import { getPoolId } from '@mmt-finance/clmm-sdk';
const poolId = await getPoolId('SUI', 'USDC');
```

### Calculate Slippage Protection
```typescript
const sqrtPriceLimit = Math.sqrt(price) * Math.pow(2, 64);
```

### Account for Fees
```typescript
const fee = 0.003; // 0.3% typical
const minOut = expectedOut * (1 - fee) * (1 - slippage);
```

## 🧪 Testing

```bash
# Build
sui move build

# Test
sui move test

# Deploy to testnet
sui client publish --gas-budget 100000000
```

## ⚠️ Important

1. **Pool Direction**: Momentum uses ordered pairs `Pool<X, Y>`
2. **Version Object**: Required for Momentum calls - get from docs
3. **Clock Object**: Always `0x6` on Sui
4. **Slippage**: Always set `sqrt_price_limit` to protect trades

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid pool ID" | Verify Momentum pool exists for your token pair |
| "High slippage" | Adjust `sqrt_price_limit` parameter |
| "Insufficient liquidity" | Check Momentum pool has enough reserves |
| Build warnings | Non-critical - deprecated function warnings |

## 📞 Resources

- **Momentum Docs**: https://docs.mmt.finance
- **Momentum GitHub**: https://github.com/mmt-finance/v3-core
- **Sui PTB Guide**: https://docs.sui.io/concepts/transactions/programmable-transaction-blocks
- **Full Integration Guide**: See `MOMENTUM_PTB_GUIDE.md`

## ✅ Build Status

```
✅ Contract compiles successfully
✅ All dependencies resolved
✅ Ready for deployment
⚠️ Minor warnings (non-critical)
```

---

**Last Updated**: 2025-12-13  
**Version**: 1.0.0  
**Status**: Production Ready
