# TradePool Deployment Info

## Network: Sui Testnet

### Package Information

**Current Version**: 2
**Package ID**: `0x30c77ff0dab6574c4948b5d0172433954fb665a6ea0bd4ca2341b669324f721c`
**UpgradeCap**: `0x1c96f9b7d877c8b82db8a4bb6002c9f2761b5e998d5cfffe12f53b04ac1f727a`

## Modules

### 1. Pool Factory (Simple SUI-only pools)

Basic liquidity pools that only accept SUI deposits.

**Registry**: `0x95b3116be34791654236e1eae704e032a0d8079e59a467282456d76b822bbe26`
**FactoryCap**: `0x757d7d348b96abb4a658ec6cbeb20e2b07be0f6609f905c194afa1beb78372ef`

**Key Functions**:
- `create_pool(registry, name, token_type)` - Create new SUI pool
- `deposit(pool, sui_coin)` - Deposit SUI, get LP tokens
- `withdraw(pool, lp_receipt)` - Burn LP tokens, get SUI back

### 2. TradePool (Momentum DEX Integration)

Advanced trading pools with Momentum DEX CLMM integration for any SUI/TOKEN pair.

**Registry**: `0x9e0405c2094b6621abcf85051d66634d892101f70540e44bc425f13b490747b6`
**AdminCap**: `0xc6ece2bf3117a86b4b21451ebde2446f380eaea930fdd49133d43352ab115acd`

**Key Functions**:
- `create_pool_public<TOKEN>(registry, name, momentum_pool_id, admin)` - Create trading pool
- `deposit<TOKEN>(pool, sui_coin)` - Deposit SUI, get LP tokens
- `withdraw<TOKEN>(pool, lp_coin, amount)` - Burn LP tokens, get SUI + TOKEN
- `admin_deposit_sui_simple<TOKEN>(...)` - Create Momentum position from SUI
- `admin_add_sui_to_position<TOKEN>(...)` - Add more liquidity to position
- `admin_withdraw_to_sui<TOKEN>(...)` - Remove liquidity, convert all to SUI

## Deployed Pools

### DEEP-SUI-v2 (Trading Pool)
**Pool ID**: `0xf8a5ae91e20bca012947ba05dd3d4d3e71e832686f93ffd8632d64e132df148e`
**Token**: tDEEP
**Momentum Pool**: `0xaa740e3d58ecfd2323eb5ab4cedab5f07554385d96aea2d5050471aba1e2e0ea`
**Liquidity**: 0.1 SUI

## Quick Start Scripts

```bash
# Create simple SUI pool
./scripts/create_pool.sh "My Pool"

# Create trading pool
./scripts/create_tradepool.sh \
  "0x2cee0cb40dcda8dcbed23df9eafdf1638cdc9578380597cd00912bee45d41762::tDEEP::TDEEP" \
  "DEEP-SUI" \
  "0xaa740e3d58ecfd2323eb5ab4cedab5f07554385d96aea2d5050471aba1e2e0ea"

# Deposit to pool
./scripts/deposit_to_pool.sh <POOL_ID> 1.5
```

**Last Updated**: 2024-12-14
