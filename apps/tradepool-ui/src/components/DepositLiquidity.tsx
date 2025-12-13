import { useState } from 'react'
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID } from '../types'

export function DepositLiquidity() {
  const [poolId, setPoolId] = useState('')
  const [tokenType, setTokenType] = useState('')
  const [suiAmount, setSuiAmount] = useState('')
  const [tokenAmount, setTokenAmount] = useState('')
  const [suiCoinId, setSuiCoinId] = useState('')
  const [tokenCoinId, setTokenCoinId] = useState('')
  const [loading, setLoading] = useState(false)

  const { mutate: signAndExecute } = useSignAndExecuteTransaction()

  const handleDeposit = async () => {
    if (!poolId || !tokenType || !suiAmount || !tokenAmount || !suiCoinId || !tokenCoinId) {
      alert('Please fill in all fields')
      return
    }

    setLoading(true)

    try {
      const tx = new Transaction()

      // Normalize token type: replace multiple colons with double colons
      const normalizedTokenType = tokenType.replace(/:{3,}/g, '::')

      tx.moveCall({
        target: `${PACKAGE_ID}::tradepool::deposit`,
        arguments: [
          tx.object(poolId),
          tx.object(suiCoinId),
          tx.object(tokenCoinId),
        ],
        typeArguments: [normalizedTokenType],
      })

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log('Deposit successful:', result)
            alert('Deposit successful! You received an LP receipt.')
            setPoolId('')
            setSuiAmount('')
            setTokenAmount('')
            setSuiCoinId('')
            setTokenCoinId('')
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">SUI Amount</label>
          <input
            type="text"
            className="input"
            placeholder="1000"
            value={suiAmount}
            onChange={(e) => setSuiAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Token Amount</label>
          <input
            type="text"
            className="input"
            placeholder="1000"
            value={tokenAmount}
            onChange={(e) => setTokenAmount(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">SUI Coin Object ID</label>
        <input
          type="text"
          className="input"
          placeholder="0x..."
          value={suiCoinId}
          onChange={(e) => setSuiCoinId(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Token Coin Object ID</label>
        <input
          type="text"
          className="input"
          placeholder="0x..."
          value={tokenCoinId}
          onChange={(e) => setTokenCoinId(e.target.value)}
        />
      </div>

      <button
        className="btn btn-success w-full"
        onClick={handleDeposit}
        disabled={loading}
      >
        {loading ? 'Depositing...' : 'Deposit Liquidity'}
      </button>

      <p className="text-xs text-gray-500">
        Note: Make sure you have both SUI and TOKEN coins in your wallet
      </p>
    </div>
  )
}
