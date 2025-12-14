import { useState, useEffect } from 'react'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID } from '../types'

interface PoolOption {
  id: string
  name: string
  tokenType: string
}

interface PoolDetails {
  name: string
  admin: string
  suiBalance: string
  tokenBalance: string
  totalShares: string
  momentumPoolId: string
  shareValue: { sui: string; token: string } | null
}

export function PoolInfo() {
  const account = useCurrentAccount()
  const client = useSuiClient()
  const [pools, setPools] = useState<PoolOption[]>([])
  const [selectedPoolIndex, setSelectedPoolIndex] = useState(-1)
  const [poolDetails, setPoolDetails] = useState<PoolDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPools, setLoadingPools] = useState(false)
  const [sharesInput, setSharesInput] = useState('')

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

  // Fetch pool details when pool is selected
  useEffect(() => {
    if (!selectedPool) {
      setPoolDetails(null)
      return
    }

    const fetchPoolDetails = async () => {
      setLoading(true)
      try {
        const poolObject = await client.getObject({
          id: selectedPool.id,
          options: {
            showContent: true,
            showType: true,
          },
        })

        if (poolObject.data?.content && 'fields' in poolObject.data.content) {
          const fields = poolObject.data.content.fields as any

          setPoolDetails({
            name: fields.name || 'Unknown',
            admin: fields.admin || 'Unknown',
            suiBalance: fields.sui_balance || '0',
            tokenBalance: fields.token_balance || '0',
            totalShares: fields.lp_supply?.fields?.value || '0',
            momentumPoolId: fields.momentum_pool_id || '',
            shareValue: null,
          })
        }
      } catch (error) {
        console.error('Error fetching pool details:', error)
        setPoolDetails(null)
      } finally {
        setLoading(false)
      }
    }

    fetchPoolDetails()
  }, [selectedPool])

  const calculateShareValue = async () => {
    if (!selectedPool || !sharesInput || !poolDetails) {
      alert('Please select a pool and enter shares amount')
      return
    }

    setLoading(true)
    try {
      const normalizedTokenType = selectedPool.tokenType.replace(/:{3,}/g, '::')

      // Create a transaction to call the view function
      const tx = new Transaction()

      tx.moveCall({
        target: `${PACKAGE_ID}::tradepool::calculate_share_value`,
        arguments: [
          tx.object(selectedPool.id),
          tx.pure.u64(sharesInput),
        ],
        typeArguments: [normalizedTokenType],
      })

      // Call devInspectTransactionBlock with proper Transaction object
      const result = await client.devInspectTransactionBlock({
        sender: account?.address || '0x0',
        transactionBlock: tx,
      })

      console.log('Share value result:', result)

      if (result.results && result.results[0]?.returnValues) {
        const returnValues = result.results[0].returnValues
        // The function returns (u64, u64) for (sui_value, token_value)
        const suiValue = returnValues[0]?.[0] ? BigInt('0x' + Buffer.from(returnValues[0][0]).toString('hex')).toString() : '0'
        const tokenValue = returnValues[1]?.[0] ? BigInt('0x' + Buffer.from(returnValues[1][0]).toString('hex')).toString() : '0'

        setPoolDetails({
          ...poolDetails,
          shareValue: {
            sui: suiValue,
            token: tokenValue,
          },
        })
      }
    } catch (error) {
      console.error('Error calculating share value:', error)
      alert('Error calculating share value: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Select Pool</label>
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
      </div>

      {loading && !poolDetails && (
        <div className="text-center py-4 text-gray-400">
          Loading pool details...
        </div>
      )}

      {poolDetails && (
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="bg-[#0a1628]/50 rounded-lg p-4 border border-gray-600/50">
            <h3 className="text-lg font-semibold text-white mb-3">Pool Information</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Name:</span>
                <span className="text-white font-medium">{poolDetails.name}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Admin:</span>
                <span className="text-white font-mono text-xs">
                  {poolDetails.admin.slice(0, 6)}...{poolDetails.admin.slice(-4)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">SUI Balance:</span>
                <span className="text-green-400 font-semibold">
                  {(Number(poolDetails.suiBalance) / 1e9).toFixed(4)} SUI
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Token Balance:</span>
                <span className="text-blue-400 font-semibold">
                  {(Number(poolDetails.tokenBalance) / 1e9).toFixed(4)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Total LP Shares:</span>
                <span className="text-white font-semibold">
                  {Number(poolDetails.totalShares).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Momentum Pool ID */}
          <div className="bg-[#0a1628]/50 rounded-lg p-4 border border-gray-600/50">
            <h3 className="text-sm font-semibold text-white mb-2">Momentum Pool ID</h3>
            <p className="text-xs font-mono text-gray-400 break-all">
              {poolDetails.momentumPoolId || 'Not set'}
            </p>
          </div>

          {/* Share Value Calculator */}
          <div className="bg-[#0a1628]/50 rounded-lg p-4 border border-gray-600/50">
            <h3 className="text-sm font-semibold text-white mb-3">Calculate Share Value</h3>

            <div className="space-y-3">
              <div>
                <label className="label">Shares Amount</label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g., 1000"
                  value={sharesInput}
                  onChange={(e) => setSharesInput(e.target.value)}
                />
              </div>

              <button
                className="btn btn-glow w-full"
                onClick={calculateShareValue}
                disabled={loading || !sharesInput}
              >
                {loading ? 'Calculating...' : 'Calculate Value'}
              </button>

              {poolDetails.shareValue && (
                <div className="info-box-green rounded-lg p-3 mt-3">
                  <p className="text-xs text-gray-400 mb-2">Value of {sharesInput} shares:</p>
                  <div className="space-y-1">
                    <p className="text-green-400 font-semibold">
                      SUI: {(Number(poolDetails.shareValue.sui) / 1e9).toFixed(4)} SUI
                    </p>
                    <p className="text-blue-400 font-semibold">
                      Token: {(Number(poolDetails.shareValue.token) / 1e9).toFixed(4)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pool ID */}
          <div className="bg-[#0a1628]/50 rounded-lg p-4 border border-gray-600/50">
            <h3 className="text-sm font-semibold text-white mb-2">Pool Object ID</h3>
            <p className="text-xs font-mono text-gray-400 break-all">
              {selectedPool?.id}
            </p>
          </div>
        </div>
      )}

      {!selectedPool && !loading && (
        <div className="text-center py-8 text-gray-400">
          <p>Select a pool to view details</p>
        </div>
      )}
    </div>
  )
}
