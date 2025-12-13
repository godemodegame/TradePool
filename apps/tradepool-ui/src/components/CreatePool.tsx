import { useState } from 'react'
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID, REGISTRY_ID, ADMIN_CAP_ID } from '../types'

export function CreatePool() {
  const [poolName, setPoolName] = useState('')
  const [tokenType, setTokenType] = useState('')
  const [momentumPoolId, setMomentumPoolId] = useState('')
  const [loading, setLoading] = useState(false)

  const { mutate: signAndExecute } = useSignAndExecuteTransaction()
  const client = useSuiClient()

  const handleCreatePool = async () => {
    if (!poolName || !tokenType || !momentumPoolId) {
      alert('Please fill in all fields')
      return
    }

    setLoading(true)

    try {
      const tx = new Transaction()

      tx.moveCall({
        target: `${PACKAGE_ID}::tradepool::create_pool`,
        arguments: [
          tx.object(ADMIN_CAP_ID),
          tx.object(REGISTRY_ID),
          tx.pure.string(poolName),
          tx.pure.id(momentumPoolId),
        ],
        typeArguments: [tokenType],
      })

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log('Pool created successfully:', result)
            alert('Pool created successfully!')
            setPoolName('')
            setTokenType('')
            setMomentumPoolId('')
          },
          onError: (error) => {
            console.error('Error creating pool:', error)
            alert('Error creating pool: ' + error.message)
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
        <label className="label">Pool Name</label>
        <input
          type="text"
          className="input"
          placeholder="e.g., SUI-USDC"
          value={poolName}
          onChange={(e) => setPoolName(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Token Type (Full Type)</label>
        <input
          type="text"
          className="input"
          placeholder="0x...::token::TOKEN"
          value={tokenType}
          onChange={(e) => setTokenType(e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">
          Example: 0x2::sui::SUI or your custom token type
        </p>
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

      <button
        className="btn btn-primary w-full"
        onClick={handleCreatePool}
        disabled={loading}
      >
        {loading ? 'Creating...' : 'Create Pool'}
      </button>
    </div>
  )
}
