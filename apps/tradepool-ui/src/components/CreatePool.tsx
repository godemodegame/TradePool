import { useState } from 'react'
import { useSignAndExecuteTransaction, useSuiClient, useCurrentAccount } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID, REGISTRY_ID } from '../types'

export function CreatePool() {
  const [poolName, setPoolName] = useState('')
  const [tokenType, setTokenType] = useState('')
  const [momentumPoolId, setMomentumPoolId] = useState('')
  const [loading, setLoading] = useState(false)

  const { mutate: signAndExecute } = useSignAndExecuteTransaction()
  const currentAccount = useCurrentAccount()
  const client = useSuiClient()

  const handleCreatePool = async () => {
    if (!currentAccount) {
      alert('Please connect your wallet')
      return
    }

    if (!poolName || !tokenType || !momentumPoolId) {
      alert('Please fill in all fields')
      return
    }

    setLoading(true)

    try {
      const tx = new Transaction()

      // Normalize token type: replace multiple colons with double colons
      const normalizedTokenType = tokenType.replace(/:{3,}/g, '::')

      // Convert pool name string to bytes (vector<u8>)
      const nameBytes = Array.from(new TextEncoder().encode(poolName))

      tx.moveCall({
        target: `${PACKAGE_ID}::tradepool::create_pool_public`,
        arguments: [
          tx.object(REGISTRY_ID),
          tx.pure.vector('u8', nameBytes),
          tx.pure.address(momentumPoolId),
        ],
        typeArguments: [normalizedTokenType],
      })

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log('Pool created successfully:', result)
            alert(`Pool created successfully! Transaction: ${result.digest}`)
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
        <p className="text-xs text-gray-500 mt-1">
          A human-readable name for the pool (e.g., "SUI-USDC", "SUI-DEEP")
        </p>
      </div>

      <div>
        <label className="label">Token Type (Full Type)</label>
        <input
          type="text"
          className="input"
          placeholder="0x...::module::TOKEN"
          value={tokenType}
          onChange={(e) => setTokenType(e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">
          Full token type path. Example: 0x2cee0cb40dcda8dcbed23df9eafdf1638cdc9578380597cd00912bee45d41762::tDEEP::TDEEP
        </p>
        {tokenType && tokenType.includes('::::') && (
          <p className="text-xs text-yellow-600 mt-1">
            ⚠️ Multiple colons detected - will be normalized to "::"
          </p>
        )}
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
        <p className="text-xs text-gray-500 mt-1">
          The ID of the Momentum DEX pool for this token pair
        </p>
      </div>

      <button
        className="btn btn-primary w-full"
        onClick={handleCreatePool}
        disabled={loading || !currentAccount}
      >
        {loading ? 'Creating...' : !currentAccount ? 'Connect Wallet' : 'Create Pool'}
      </button>
    </div>
  )
}
