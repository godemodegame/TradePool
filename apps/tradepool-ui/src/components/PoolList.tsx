import { useState, useEffect } from 'react'
import { useSuiClient } from '@mysten/dapp-kit'
import { PACKAGE_ID } from '../types'

interface PoolData {
  id: string
  name: string
  tokenType: string
  suiBalance: string
  tokenBalance: string
  totalShares: string
  momentumPoolId: string
  creator: string
  admin: string
}

export function PoolList() {
  const [pools, setPools] = useState<PoolData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const client = useSuiClient()

  const fetchPools = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('Fetching pools for package:', PACKAGE_ID)

      // Query PoolCreatedEvent to find all pools
      const events = await client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::tradepool::PoolCreatedEvent`,
        },
        limit: 50,
      })

      console.log('Found pool events:', events.data.length)

      // Fetch pool data for each event
      const poolDataPromises = events.data.map(async (event) => {
        try {
          const parsedEvent = event.parsedJson as any
          const poolId = parsedEvent.pool_id

          const poolObject = await client.getObject({
            id: poolId,
            options: {
              showType: true,
              showContent: true,
            },
          })

          if (poolObject.data?.content && 'fields' in poolObject.data.content) {
            const fields = poolObject.data.content.fields as any

            let tokenType = parsedEvent.token_type?.name || 'Unknown'

            // Add 0x prefix if missing
            if (tokenType && tokenType !== 'Unknown' && !tokenType.startsWith('0x')) {
              tokenType = '0x' + tokenType
            }

            return {
              id: poolId,
              name: fields.name || 'Unknown',
              tokenType,
              suiBalance: fields.sui_balance || '0',
              tokenBalance: fields.token_balance || '0',
              totalShares: fields.lp_supply?.fields?.value || '0',
              momentumPoolId: fields.momentum_pool_id || '',
              creator: parsedEvent.creator || '',
              admin: fields.admin || parsedEvent.creator || '',
            }
          }
          return null
        } catch (error) {
          console.error(`Error fetching pool ${event.parsedJson}:`, error)
          return null
        }
      })

      const poolsData = (await Promise.all(poolDataPromises)).filter((p): p is PoolData => p !== null)
      console.log('Loaded pools:', poolsData.length)
      setPools(poolsData)
    } catch (error) {
      console.error('Error fetching pools:', error)
      setError((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch pools on mount
  useEffect(() => {
    fetchPools()
  }, [])

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Available Pools</h2>
          <p className="text-xs text-gray-400 mt-1">
            {pools.length} pool{pools.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <button className="btn btn-primary" onClick={fetchPools} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Pools'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm">Error loading pools: {error}</p>
        </div>
      )}

      {loading && pools.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>Loading pools from registry...</p>
        </div>
      ) : pools.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="mb-2">No pools found</p>
          <p className="text-xs">Create a pool to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pools.map((pool) => (
            <div key={pool.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{pool.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Pool Admin: {pool.admin.slice(0, 6)}...{pool.admin.slice(-4)}
                  </p>
                </div>
                <span className="text-green-400 text-xs bg-green-900/20 px-2 py-1 rounded">Active</span>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Token Type</p>
                  <p className="font-mono text-xs text-white break-all">{pool.tokenType}</p>
                </div>

                <div>
                  <p className="text-gray-400 text-xs">Pool ID</p>
                  <p className="font-mono text-xs text-white break-all">{pool.id}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-xs">SUI Balance</p>
                    <p className="font-semibold text-white">
                      {(Number(pool.suiBalance) / 1e9).toFixed(4)} SUI
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Token Balance</p>
                    <p className="font-semibold text-white">
                      {(Number(pool.tokenBalance) / 1e9).toFixed(4)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 text-xs">Total Shares</p>
                  <p className="font-semibold text-white">
                    {Number(pool.totalShares).toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-gray-400 text-xs">Momentum Pool ID</p>
                  <p className="font-mono text-xs text-white break-all">
                    {pool.momentumPoolId || 'Not set'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
