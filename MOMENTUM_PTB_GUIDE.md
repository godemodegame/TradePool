# Momentum DEX Integration via Programmable Transaction Blocks (PTB)

This guide shows how to integrate TradePool with Momentum DEX using Programmable Transaction Blocks from the client side.

## 🎯 Overview

Momentum DEX (v3) is deployed on Sui at address: `0x70285592c97965e811e0c6f98dccc3a9c2b4ad854b3594faab9597ada267b860`

The integration uses PTB to compose TradePool operations with Momentum flash swaps, providing:
- ✅ Maximum flexibility
- ✅ No on-chain contract changes needed
- ✅ Direct access to Momentum's CLMM pools
- ✅ Easy upgrades when Momentum releases new features

## 📦 Required Packages

```bash
npm install @mysten/sui.js @mmt-finance/clmm-sdk
```

## 🔑 Key Concepts

### Momentum Flash Swap Pattern

Momentum DEX uses a flash swap pattern with hot potato receipts:

1. **flash_swap** - Borrow tokens from pool, get receipt
2. **Your logic** - Use the borrowed tokens
3. **repay_flash_swap** - Return tokens + fees, destroy receipt

### TradePool + Momentum Flow

```
User → TradePool (deposit liquidity)
Admin → Momentum Flash Swap (borrow tokens)
Admin → Execute trades
Admin → Repay Flash Swap
Admin → TradePool (update balances)
```

## 💻 TypeScript Implementation

### Setup

```typescript
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SuiClient } from '@mysten/sui.js/client';

const TRADEPOOL_PACKAGE = '0xYOUR_DEPLOYED_PACKAGE_ADDRESS';
const MOMENTUM_PACKAGE = '0x70285592c97965e811e0c6f98dccc3a9c2b4ad854b3594faab9597ada267b860';
const MOMENTUM_VERSION = '0xVERSION_OBJECT_ID'; // Get from Momentum docs
const CLOCK_ID = '0x6'; // Sui Clock object
```

### Example 1: Buy TOKEN with SUI via Momentum

```typescript
async function buyTokenWithMomentum(
  adminCap: string,
  tradePoolId: string,
  momentumPoolId: string,
  suiCoinId: string,
  suiAmount: number,
  minTokenOut: number,
  tokenType: string, // e.g., '0xUSDC_PACKAGE::usdc::USDC'
) {
  const tx = new TransactionBlock();

  // Step 1: Execute flash swap on Momentum (SUI → TOKEN)
  const [balanceSUI, balanceTOKEN, flashReceipt] = tx.moveCall({
    target: `${MOMENTUM_PACKAGE}::trade::flash_swap`,
    arguments: [
      tx.object(momentumPoolId),           // Pool<SUI, TOKEN>
      tx.pure(true),                        // is_x_to_y: true (SUI → TOKEN)
      tx.pure(true),                        // exact_input: true
      tx.pure(suiAmount),                   // amount_specified
      tx.pure('4295048016'),                // sqrt_price_limit (adjust as needed)
      tx.object(CLOCK_ID),                  // clock
      tx.object(MOMENTUM_VERSION),          // version
    ],
    typeArguments: ['0x2::sui::SUI', tokenType],
  });

  // Step 2: Convert balances to coins
  const suiCoinFromSwap = tx.moveCall({
    target: '0x2::coin::from_balance',
    arguments: [balanceSUI],
    typeArguments: ['0x2::sui::SUI'],
  });

  const tokenCoinFromSwap = tx.moveCall({
    target: '0x2::coin::from_balance',
    arguments: [balanceTOKEN],
    typeArguments: [tokenType],
  });

  // Step 3: Prepare repayment (if any SUI remaining, merge it)
  const [originalSuiCoin] = tx.splitCoins(tx.object(suiCoinId), [tx.pure(suiAmount)]);
  const suiForRepay = tx.mergeCoins(originalSuiCoin, [suiCoinFromSwap]);

  // Step 4: Repay the flash swap
  tx.moveCall({
    target: `${MOMENTUM_PACKAGE}::trade::repay_flash_swap`,
    arguments: [
      tx.object(momentumPoolId),
      flashReceipt,
      tx.moveCall({
        target: '0x2::coin::into_balance',
        arguments: [suiForRepay],
        typeArguments: ['0x2::sui::SUI'],
      }),
      tx.moveCall({
        target: '0x2::coin::into_balance',
        arguments: [tx.pure(0)], // Empty TOKEN balance (we're selling SUI)
        typeArguments: [tokenType],
      }),
      tx.object(MOMENTUM_VERSION),
    ],
    typeArguments: ['0x2::sui::SUI', tokenType],
  });

  // Step 5: Transfer received tokens to admin or pool
  tx.transferObjects([tokenCoinFromSwap], tx.pure(adminAddress));

  return tx;
}
```

### Example 2: Sell TOKEN for SUI via Momentum

```typescript
async function sellTokenWithMomentum(
  adminCap: string,
  tradePoolId: string,
  momentumPoolId: string,
  tokenCoinId: string,
  tokenAmount: number,
  minSuiOut: number,
  tokenType: string,
) {
  const tx = new TransactionBlock();

  // Step 1: Execute flash swap on Momentum (TOKEN → SUI)
  const [balanceTOKEN, balanceSUI, flashReceipt] = tx.moveCall({
    target: `${MOMENTUM_PACKAGE}::trade::flash_swap`,
    arguments: [
      tx.object(momentumPoolId),           // Pool<TOKEN, SUI>
      tx.pure(true),                        // is_x_to_y: true (TOKEN → SUI)
      tx.pure(true),                        // exact_input: true
      tx.pure(tokenAmount),                 // amount_specified
      tx.pure('4295048016'),                // sqrt_price_limit
      tx.object(CLOCK_ID),
      tx.object(MOMENTUM_VERSION),
    ],
    typeArguments: [tokenType, '0x2::sui::SUI'],
  });

  // Step 2: Convert balances to coins
  const tokenCoinFromSwap = tx.moveCall({
    target: '0x2::coin::from_balance',
    arguments: [balanceTOKEN],
    typeArguments: [tokenType],
  });

  const suiCoinFromSwap = tx.moveCall({
    target: '0x2::coin::from_balance',
    arguments: [balanceSUI],
    typeArguments: ['0x2::sui::SUI'],
  });

  // Step 3: Prepare repayment
  const [originalTokenCoin] = tx.splitCoins(tx.object(tokenCoinId), [tx.pure(tokenAmount)]);
  const tokenForRepay = tx.mergeCoins(originalTokenCoin, [tokenCoinFromSwap]);

  // Step 4: Repay flash swap
  tx.moveCall({
    target: `${MOMENTUM_PACKAGE}::trade::repay_flash_swap`,
    arguments: [
      tx.object(momentumPoolId),
      flashReceipt,
      tx.moveCall({
        target: '0x2::coin::into_balance',
        arguments: [tokenForRepay],
        typeArguments: [tokenType],
      }),
      tx.moveCall({
        target: '0x2::coin::into_balance',
        arguments: [tx.pure(0)], // Empty SUI balance
        typeArguments: ['0x2::sui::SUI'],
      }),
      tx.object(MOMENTUM_VERSION),
    ],
    typeArguments: [tokenType, '0x2::sui::SUI'],
  });

  // Step 5: Transfer received SUI
  tx.transferObjects([suiCoinFromSwap], tx.pure(adminAddress));

  return tx;
}
```

### Example 3: Full Integration with TradePool

```typescript
async function tradePoolSwapViaMomentum(
  adminCap: string,
  tradePoolId: string,
  momentumPoolId: string,
  suiAmount: number,
  tokenType: string,
) {
  const tx = new TransactionBlock();

  // Step 1: Admin withdraws SUI from TradePool
  // (You'd implement this based on your TradePool design)
  
  // Step 2: Execute Momentum swap (as shown above)
  const [_, balanceTOKEN, flashReceipt] = tx.moveCall({
    target: `${MOMENTUM_PACKAGE}::trade::flash_swap`,
    arguments: [
      tx.object(momentumPoolId),
      tx.pure(true), // is_x_to_y
      tx.pure(true), // exact_input
      tx.pure(suiAmount),
      tx.pure('4295048016'),
      tx.object(CLOCK_ID),
      tx.object(MOMENTUM_VERSION),
    ],
    typeArguments: ['0x2::sui::SUI', tokenType],
  });

  // Step 3: Convert and handle tokens
  const tokenReceived = tx.moveCall({
    target: '0x2::coin::from_balance',
    arguments: [balanceTOKEN],
    typeArguments: [tokenType],
  });

  // Step 4: Repay flash swap (using SUI from pool)
  // ... repayment logic ...

  // Step 5: Deposit received tokens back to TradePool
  tx.moveCall({
    target: `${TRADEPOOL_PACKAGE}::tradepool::deposit`,
    arguments: [
      tx.object(tradePoolId),
      tx.pure(0), // No new SUI
      tokenReceived,
    ],
    typeArguments: [tokenType],
  });

  return tx;
}
```

## 🔍 Key Parameters

### sqrt_price_limit

This is used for slippage protection in Momentum:

```typescript
// For SUI → TOKEN (price going down), use minimum acceptable price
const minSqrtPrice = calculateSqrtPrice(minPrice);

// For TOKEN → SUI (price going up), use maximum acceptable price  
const maxSqrtPrice = calculateSqrtPrice(maxPrice);

function calculateSqrtPrice(price: number): string {
  // Price is in TOKEN per SUI
  // sqrt_price = sqrt(price) * 2^64
  const sqrtPrice = Math.sqrt(price) * Math.pow(2, 64);
  return sqrtPrice.toFixed(0);
}
```

### Fee Calculations

Momentum charges swap fees. Account for this:

```typescript
const feeRate = 0.003; // 0.3% default (check Momentum pool)
const expectedOut = calculateExpectedOut(amountIn, poolReserves);
const minOut = expectedOut * (1 - feeRate) * (1 - slippageTolerance);
```

## 📚 Resources

- **Momentum v3 Contracts**: https://github.com/mmt-finance/v3-core
- **Momentum Developer Docs**: https://docs.mmt.finance
- **Sui PTB Documentation**: https://docs.sui.io/concepts/transactions/programmable-transaction-blocks
- **@mmt-finance/clmm-sdk**: TypeScript SDK for easier integration

## ⚠️ Important Notes

1. **Version Object**: Momentum requires a `Version` object for access control. Get the current version from Momentum docs.

2. **Pool Direction**: Momentum pools are ordered (Pool<X, Y>). Ensure you use the correct order:
   - If trading SUI → TOKEN, use `Pool<SUI, TOKEN>`
   - If trading TOKEN → SUI, use `Pool<TOKEN, SUI>`

3. **Gas Optimization**: PTB execution is atomic and gas-efficient. All steps succeed or fail together.

4. **Testing**: Always test on testnet first. Momentum has testnet deployments.

5. **Slippage**: Set appropriate `sqrt_price_limit` to protect against MEV and sandwich attacks.

## 🚀 Next Steps

1. Deploy your TradePool contract
2. Get Momentum pool IDs for your token pairs from Momentum frontend or SDK
3. Implement PTB composition in your frontend/backend
4. Test thoroughly on testnet
5. Deploy to mainnet

## 📞 Support

- Momentum Discord: Check official docs for invite
- Sui Discord: https://discord.gg/sui
- TradePool Issues: Open issues in this repository

---

**Last Updated**: 2025-12-13  
**Momentum Package**: `0x70285592c97965e811e0c6f98dccc3a9c2b4ad854b3594faab9597ada267b860`
