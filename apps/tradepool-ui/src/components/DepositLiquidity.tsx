import { useState, useEffect } from 'react'
import { useSignAndExecuteTransaction, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID } from '../types'
import { useCoins } from '../hooks/useCoins'

interface PoolOption {
  id: string
  name: string
  tokenType: string
}

export function DepositLiquidity() {
  const account = useCurrentAccount()
  const client = useSuiClient()
  const [pools, setPools] = useState<PoolOption[]>([])
  const [loadingPools, setLoadingPools] = useState(false)
  const [selectedPoolIndex, setSelectedPoolIndex] = useState(-1)
  const [suiAmount, setSuiAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const { mutate: signAndExecute } = useSignAndExecuteTransaction()

  const selectedPool = selectedPoolIndex >= 0 ? pools[selectedPoolIndex] : null

  // Fetch available pools
  useEffect(() => {
    const fetchPools = async () => {
      setLoadingPools(true)
      try {
        const events = await client.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::tradepool::PoolCreatedEvent`,
          },
          limit: 50,
        })

        const poolOptions: PoolOption[] = events.data.map((event) => {
          const parsedEvent = event.parsedJson as any
          let tokenType = parsedEvent.token_type?.name || ''

          // Add 0x prefix if missing
          if (tokenType && !tokenType.startsWith('0x')) {
            tokenType = '0x' + tokenType
          }

          return {
            id: parsedEvent.pool_id,
            name: parsedEvent.pool_name || 'Unknown Pool',
            tokenType,
          }
        })

        setPools(poolOptions)
      } catch (error) {
        console.error('Error fetching pools:', error)
      } finally {
        setLoadingPools(false)
      }
    }

    fetchPools()
  }, [])

  // Automatically fetch user's SUI balance
  const { totalBalance: suiBalance, loading: suiLoading } = useCoins('0x2::sui::SUI')

  const handleDeposit = async () => {
    if (!account) {
      alert('Please connect your wallet')
      return
    }

    if (!selectedPool) {
      alert('Please select a pool')
      return
    }

    if (!suiAmount) {
      alert('Please enter SUI amount')
      return
    }

    setLoading(true)

    try {
      const tx = new Transaction()

      // Normalize token type: replace multiple colons with double colons
      const normalizedTokenType = selectedPool.tokenType.replace(/:{3,}/g, '::')

      // Convert SUI amount to MIST
      const suiAmountMist = Math.floor(parseFloat(suiAmount) * 1e9)

      // Split SUI coin for deposit
      const [suiCoin] = tx.splitCoins(tx.gas, [suiAmountMist])

      // Call deposit function and capture the returned LP receipt
      const [receipt] = tx.moveCall({
        target: `${PACKAGE_ID}::tradepool::deposit`,
        arguments: [
          tx.object(selectedPool.id),
          suiCoin,
        ],
        typeArguments: [normalizedTokenType],
      })

      // Transfer the LP receipt to the user
      tx.transferObjects([receipt], tx.pure.address(account.address))

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log('Deposit successful:', result)
            alert('Deposit successful! You received an LP receipt.')
            setSuiAmount('')
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
        <p className="text-xs text-gray-400 mb-2">Your SUI Balance</p>
        <p className="text-white font-semibold text-lg">
          {suiLoading ? 'Loading...' : `${(Number(suiBalance) / 1e9).toFixed(4)} SUI`}
        </p>
      </div>

      <div>
        <label className="label">Pool</label>
        <select
          className="input"
          value={selectedPoolIndex}
          onChange={(e) => setSelectedPoolIndex(Number(e.target.value))}
          disabled={loadingPools}
        >
          <option value={-1}>-- Select a pool --</option>
          {pools.map((pool, index) => (
            <option key={pool.id} value={index}>
              {pool.name}
            </option>
          ))}
        </select>
        {loadingPools && <p className="text-xs text-gray-400 mt-1">Loading pools...</p>}
        {pools.length === 0 && !loadingPools && (
          <p className="text-xs text-yellow-400 mt-1">No pools found. Create a pool first!</p>
        )}
        {selectedPool && (
          <div className="mt-2 p-2 bg-gray-900 rounded border border-gray-700">
            <p className="text-xs text-gray-400">Selected Pool</p>
            <p className="text-sm text-white font-medium">{selectedPool.name}</p>
            <p className="text-xs text-gray-400 mt-1 font-mono break-all">
              Token: {selectedPool.tokenType}
            </p>
          </div>
        )}
      </div>

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

      <button
        className="btn btn-success w-full"
        onClick={handleDeposit}
        disabled={loading || !account}
      >
        {loading ? 'Depositing...' : !account ? 'Connect Wallet' : 'Deposit Liquidity'}
      </button>

      <p className="text-xs text-gray-400">
        💡 Pool accepts only SUI deposits. Tokens are acquired through admin trading.
      </p>
    </div>
  )
}
