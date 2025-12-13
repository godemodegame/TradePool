# TradePool Scripts

Bash scripts for interacting with TradePool contracts on Sui testnet.

## Configuration

All scripts use the following deployed contracts:

- **Package ID**: `0x30c77ff0dab6574c4948b5d0172433954fb665a6ea0bd4ca2341b669324f721c`
- **Pool Factory Registry**: `0x95b3116be34791654236e1eae704e032a0d8079e59a467282456d76b822bbe26`
- **TradePool Registry**: `0x9e0405c2094b6621abcf85051d66634d892101f70540e44bc425f13b490747b6`

## Available Scripts

### 1. Create Simple Pool (SUI-only)

Create a simple liquidity pool that only accepts SUI deposits.

```bash
./scripts/create_pool.sh "My Pool Name"
```

**Example:**
```bash
./scripts/create_pool.sh "Community Pool #1"
```

### 2. Deposit to Pool

Deposit SUI to a pool and receive LP tokens.

```bash
./scripts/deposit_to_pool.sh <POOL_ID> <AMOUNT_IN_SUI>
```

**Example:**
```bash
./scripts/deposit_to_pool.sh 0xabc123... 1.5
```

### 3. Create Trading Pool (Momentum DEX)

Create a trading pool with Momentum DEX integration for any token pair.

```bash
./scripts/create_tradepool.sh <TOKEN_TYPE> <POOL_NAME> <MOMENTUM_POOL_ID>
```

**Example - DEEP/SUI pool:**
```bash
./scripts/create_tradepool.sh \
  "0x2cee0cb40dcda8dcbed23df9eafdf1638cdc9578380597cd00912bee45d41762::tDEEP::TDEEP" \
  "DEEP-SUI-Community" \
  "0xaa740e3d58ecfd2323eb5ab4cedab5f07554385d96aea2d5050471aba1e2e0ea"
```

## Momentum DEX Testnet Pools

Available pools for integration:

| Pair | Pool ID |
|------|---------|
| DEEP/SUI | `0xaa740e3d58ecfd2323eb5ab4cedab5f07554385d96aea2d5050471aba1e2e0ea` |
| MMT/USDC | `0x53ceda0bbe1bdb3c1c0b1c53ecb49856f135a9fffc91e5a50aa4045a3f8240f7` |
| DEEP/USDC | `0xf0d3fa213889a7c2bc79505c030b6a105d549e6608aeab201811af333f9b18a4` |

## Token Types

| Token | Type |
|-------|------|
| tDEEP | `0x2cee0cb40dcda8dcbed23df9eafdf1638cdc9578380597cd00912bee45d41762::tDEEP::TDEEP` |
| MMT | `0x2cee0cb40dcda8dcbed23df9eafdf1638cdc9578380597cd00912bee45d41762::mmt::MMT` |
| tUSDC | `0x2cee0cb40dcda8dcbed23df9eafdf1638cdc9578380597cd00912bee45d41762::tUSDC::TUSDC` |

## Prerequisites

- `sui` CLI installed and configured
- Active Sui testnet account with SUI tokens
- `bc` calculator (for amount conversions)

## Making Scripts Executable

```bash
chmod +x scripts/*.sh
```

## Notes

- All amounts are in SUI (automatically converted to MIST)
- Gas budget is set to 100,000,000 MIST (0.1 SUI)
- Scripts will show colored output for success/failure
- Transaction details will be displayed after execution

## Support

For issues or questions, check the main project documentation or create an issue on GitHub.
