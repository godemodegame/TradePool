import { useState } from 'react'
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID, ADMIN_CAP_ID, CLOCK_ID, MOMENTUM_VERSION_ID } from '../types'

export function AdminTrading() {
  const [operation, setOperation] = useState<'buy' | 'sell'>('buy')
  const [poolId, setPoolId] = useState('')
  const [momentumPoolId, setMomentumPoolId] = useState('')
  const [tokenType, setTokenType] = useState('')
  const [amount, setAmount] = useState('')
  const [minOut, setMinOut] = useState('')
  const [coinId, setCoinId] = useState('')
  const [sqrtPriceLimit, setSqrtPriceLimit] = useState('')
  const [loading, setLoading] = useState(false)

  const { mutate: signAndExecute } = useSignAndExecuteTransaction()

  const handleTrade = async () => {
    if (!poolId || !momentumPoolId || !tokenType || !amount || !minOut || !coinId) {
      alert('Please fill in all fields')
      return
    }

    setLoading(true)

    try {
      const tx = new Transaction()

      // Normalize token type: replace multiple colons with double colons
      const normalizedTokenType = tokenType.replace(/:{3,}/g, '::')

      const target =
        operation === 'buy'
          ? `${PACKAGE_ID}::tradepool::admin_buy_token`
          : `${PACKAGE_ID}::tradepool::admin_sell_token`

      tx.moveCall({
        target,
        arguments: [
          tx.object(ADMIN_CAP_ID),
          tx.object(poolId),
          tx.object(momentumPoolId),
          tx.object(coinId),
          tx.pure.u64(minOut),
          tx.pure.u128(sqrtPriceLimit || (operation === 'buy' ? '0' : '340282366920938463463374607431768211455')),
          tx.object(CLOCK_ID),
          tx.object(MOMENTUM_VERSION_ID),
        ],
        typeArguments: [normalizedTokenType],
      })

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log('Trade successful:', result)
            alert(`${operation === 'buy' ? 'Buy' : 'Sell'} successful!`)
            setAmount('')
            setMinOut('')
            setCoinId('')
          },
          onError: (error) => {
            console.error('Error trading:', error)
            alert('Error trading: ' + error.message)
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
      {/* Operation Tabs */}
      <div className="flex gap-2">
        <button
          className={`flex-1 btn ${operation === 'buy' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setOperation('buy')}
        >
          Buy Token (SUI → TOKEN)
        </button>
        <button
          className={`flex-1 btn ${operation === 'sell' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setOperation('sell')}
        >
          Sell Token (TOKEN → SUI)
        </button>
      </div>

      <div>
        <label className="label">Pool ID</label>
        <input
          type="text"
          className="input"
          placeholder="0x..."
          value={poolId}
          onChange={(e) => setPoolId(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Momentum Pool ID</label>
        <input
          type="text"
          className="input"
          placeholder="0x..."
          value={momentumPoolId}
          onChange={(e) => setMomentumPoolId(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Token Type</label>
        <input
          type="text"
          className="input"
          placeholder="0x...::token::TOKEN"
          value={tokenType}
          onChange={(e) => setTokenType(e.target.value)}
        />
        {tokenType && tokenType.includes('::::') && (
          <p className="text-xs text-yellow-600 mt-1">
            ⚠️ Multiple colons detected - will be normalized to "::"
          </p>
        )}
      </div>

      <div>
        <label className="label">
          {operation === 'buy' ? 'SUI Amount' : 'Token Amount'}
        </label>
        <input
          type="text"
          className="input"
          placeholder="1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div>
        <label className="label">
          Minimum {operation === 'buy' ? 'Token' : 'SUI'} Out (Slippage Protection)
        </label>
        <input
          type="text"
          className="input"
          placeholder="950"
          value={minOut}
          onChange={(e) => setMinOut(e.target.value)}
        />
      </div>

      <div>
        <label className="label">
          {operation === 'buy' ? 'SUI Coin ID' : 'Token Coin ID'}
        </label>
        <input
          type="text"
          className="input"
          placeholder="0x..."
          value={coinId}
          onChange={(e) => setCoinId(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Sqrt Price Limit (Optional)</label>
        <input
          type="text"
          className="input"
          placeholder={operation === 'buy' ? '0 (no limit)' : 'max u128 (no limit)'}
          value={sqrtPriceLimit}
          onChange={(e) => setSqrtPriceLimit(e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">
          Leave empty for no price limit
        </p>
      </div>

      <button
        className="btn btn-primary w-full"
        onClick={handleTrade}
        disabled={loading}
      >
        {loading
          ? 'Trading...'
          : operation === 'buy'
          ? 'Buy Token'
          : 'Sell Token'}
      </button>

      <p className="text-xs text-gray-500">
        ⚠️ Admin only: Requires AdminCap ownership
      </p>
    </div>
  )
}
