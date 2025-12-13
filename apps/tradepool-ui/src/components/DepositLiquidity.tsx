import { useState } from 'react'
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID, POOL_SUI_DEEP_ID, TDEEP_COIN_TYPE } from '../types'
import { useCoins } from '../hooks/useCoins'

export function DepositLiquidity() {
  const account = useCurrentAccount()
  const [poolId, setPoolId] = useState(POOL_SUI_DEEP_ID)
  const [tokenType, setTokenType] = useState(TDEEP_COIN_TYPE)
  const [suiAmount, setSuiAmount] = useState('')
  const [tokenAmount, setTokenAmount] = useState('')
  const [suiOnly, setSuiOnly] = useState(false) // Default to dual token mode
  const [loading, setLoading] = useState(false)

  const { mutate: signAndExecute } = useSignAndExecuteTransaction()

  // Automatically fetch user's coins
  const { coins: suiCoins, totalBalance: suiBalance, loading: suiLoading } = useCoins('0x2::sui::SUI')
  const { coins: tokenCoins, totalBalance: tokenBalance, loading: tokenLoading } = useCoins(tokenType)

  const handleDeposit = async () => {
    if (!account) {
      alert('Please connect your wallet')
      return
    }

    if (!poolId || !tokenType) {
      alert('Please select a pool')
      return
    }

    if (suiOnly) {
      // SUI-only mode: only need SUI amount
      if (!suiAmount) {
        alert('Please enter SUI amount')
        return
      }
    } else {
      // Dual token mode: need both amounts
      if (!suiAmount || !tokenAmount) {
        alert('Please fill in both amounts')
        return
      }
      if (tokenCoins.length === 0) {
        alert('You don\'t have any DEEP tokens. Please switch to "SUI Only" mode.')
        return
      }
    }

    setLoading(true)

    try {
      const tx = new Transaction()

      // Normalize token type: replace multiple colons with double colons
      const normalizedTokenType = tokenType.replace(/:{3,}/g, '::')

      if (suiOnly) {
        // SUI-only mode: deposit only SUI using deposit_sui_only function
        const suiAmountMist = Math.floor(parseFloat(suiAmount) * 1e9)

        // Split SUI coin for deposit
        const [suiCoin] = tx.splitCoins(tx.gas, [suiAmountMist])

        // Call deposit_sui_only function and capture the returned LP receipt
        const [receipt] = tx.moveCall({
          target: `${PACKAGE_ID}::tradepool::deposit_sui_only`,
          arguments: [
            tx.object(poolId),
            suiCoin,
          ],
          typeArguments: [normalizedTokenType],
        })

        // Transfer the LP receipt to the user
        tx.transferObjects([receipt], tx.pure.address(account.address))
      } else {
        // Dual token mode: deposit both SUI and DEEP
        const suiAmountMist = Math.floor(parseFloat(suiAmount) * 1e9)
        const tokenAmountMist = Math.floor(parseFloat(tokenAmount) * 1e9)

        // Split SUI coins from gas coin
        const [suiCoin] = tx.splitCoins(tx.gas, [suiAmountMist])

        // Use the first available token coin and split it
        const firstTokenCoin = tokenCoins[0]
        const [tokenCoin] = tx.splitCoins(
          tx.object(firstTokenCoin.coinObjectId),
          [tokenAmountMist]
        )

        // Call deposit function and capture the returned LP receipt
        const [receipt] = tx.moveCall({
          target: `${PACKAGE_ID}::tradepool::deposit`,
          arguments: [
            tx.object(poolId),
            suiCoin,
            tokenCoin,
          ],
          typeArguments: [normalizedTokenType],
        })

        // Transfer the LP receipt to the user
        tx.transferObjects([receipt], tx.pure.address(account.address))
      }

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log('Deposit successful:', result)
            alert('Deposit successful! You received an LP receipt.')
            setSuiAmount('')
            setTokenAmount('')
          },
          onError: (error) => {
            console.error('Error depositing:', error)
            alert('Error depositing: ' + error.message)
          },
        }
      )
    } catch (error) {
      console.error('Error:', error)
      alert('Error: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Wallet Balance Display */}
      <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
        <p className="text-xs text-gray-400 mb-2">Your Balance</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-white font-medium">
              {suiLoading ? 'Loading...' : `${(Number(suiBalance) / 1e9).toFixed(4)} SUI`}
            </p>
          </div>
          <div>
            <p className="text-white font-medium">
              {tokenLoading ? 'Loading...' : `${(Number(tokenBalance) / 1e9).toFixed(4)} DEEP`}
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="label">Pool</label>
        <select
          className="input"
          value={poolId}
          onChange={(e) => setPoolId(e.target.value)}
        >
          <option value={POOL_SUI_DEEP_ID}>SUI-DEEP Pool</option>
        </select>
      </div>

      {/* SUI Only Mode Toggle */}
      <div className="flex items-center gap-3 bg-gray-900 rounded-lg p-3 border border-gray-700">
        <input
          type="checkbox"
          id="suiOnly"
          checked={suiOnly}
          onChange={(e) => setSuiOnly(e.target.checked)}
          className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
        />
        <label htmlFor="suiOnly" className="text-sm text-white cursor-pointer">
          Deposit SUI only (no DEEP tokens required)
        </label>
      </div>

      {suiOnly ? (
        /* SUI Only Mode - Single Input */
        <div>
          <label className="label">SUI Amount</label>
          <input
            type="number"
            step="0.01"
            className="input"
            placeholder="1.0"
            value={suiAmount}
            onChange={(e) => setSuiAmount(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Available: {(Number(suiBalance) / 1e9).toFixed(4)} SUI
          </p>
          <p className="text-xs text-green-500 mt-1">
            ✅ Deposit only SUI - no DEEP tokens required!
          </p>
        </div>
      ) : (
        /* Dual Token Mode - Two Inputs */
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">SUI Amount</label>
            <input
              type="number"
              step="0.01"
              className="input"
              placeholder="1.0"
              value={suiAmount}
              onChange={(e) => setSuiAmount(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Available: {(Number(suiBalance) / 1e9).toFixed(4)} SUI
            </p>
          </div>

          <div>
            <label className="label">DEEP Amount</label>
            <input
              type="number"
              step="0.01"
              className="input"
              placeholder="1.0"
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Available: {(Number(tokenBalance) / 1e9).toFixed(4)} DEEP
            </p>
          </div>
        </div>
      )}

      <button
        className="btn btn-success w-full"
        onClick={handleDeposit}
        disabled={loading || !account}
      >
        {loading ? 'Depositing...' : !account ? 'Connect Wallet' : 'Deposit Liquidity'}
      </button>

      <p className="text-xs text-gray-400">
        💡 Coins will be automatically selected from your wallet
      </p>
    </div>
  )
}
