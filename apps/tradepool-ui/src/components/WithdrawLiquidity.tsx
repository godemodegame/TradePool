import { useState } from 'react'
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID } from '../types'

export function WithdrawLiquidity() {
  const [poolId, setPoolId] = useState('')
  const [tokenType, setTokenType] = useState('')
  const [receiptId, setReceiptId] = useState('')
  const [loading, setLoading] = useState(false)

  const { mutate: signAndExecute } = useSignAndExecuteTransaction()

  const handleWithdraw = async () => {
    if (!poolId || !tokenType || !receiptId) {
      alert('Please fill in all fields')
      return
    }

    setLoading(true)

    try {
      const tx = new Transaction()

      tx.moveCall({
        target: `${PACKAGE_ID}::tradepool::withdraw`,
        arguments: [
          tx.object(poolId),
          tx.object(receiptId),
        ],
        typeArguments: [tokenType],
      })

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log('Withdrawal successful:', result)
            alert('Withdrawal successful! You received SUI and tokens.')
            setPoolId('')
            setReceiptId('')
          },
          onError: (error) => {
            console.error('Error withdrawing:', error)
            alert('Error withdrawing: ' + error.message)
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
      </div>

      <div>
        <label className="label">LP Receipt ID</label>
        <input
          type="text"
          className="input"
          placeholder="0x..."
          value={receiptId}
          onChange={(e) => setReceiptId(e.target.value)}
        />
      </div>

      <button
        className="btn btn-danger w-full"
        onClick={handleWithdraw}
        disabled={loading}
      >
        {loading ? 'Withdrawing...' : 'Withdraw Liquidity'}
      </button>

      <p className="text-xs text-gray-500">
        Warning: This will burn your LP receipt and withdraw your liquidity
      </p>
    </div>
  )
}
