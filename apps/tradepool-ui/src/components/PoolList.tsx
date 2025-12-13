import { useState, useEffect } from 'react'
import { useSuiClient } from '@mysten/dapp-kit'
import { PREDEFINED_POOLS } from '../types'

export function PoolList() {
  const [pools, setPools] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const client = useSuiClient()

  const fetchPools = async () => {
    setLoading(true)
    try {
      // Fetch data for each predefined pool
      const poolDataPromises = PREDEFINED_POOLS.map(async (poolConfig) => {
        try {
          const poolObject = await client.getObject({
            id: poolConfig.id,
            options: {
              showType: true,
              showContent: true,
            },
          })

          return {
            ...poolConfig,
            data: poolObject.data,
          }
        } catch (error) {
          console.error(`Error fetching pool ${poolConfig.name}:`, error)
          return {
            ...poolConfig,
            data: null,
            error: (error as Error).message,
          }
        }
      })

      const poolsData = await Promise.all(poolDataPromises)
      setPools(poolsData)
    } catch (error) {
      console.error('Error fetching pools:', error)
      alert('Error fetching pools: ' + (error as Error).message)
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
        <h2 className="text-xl font-semibold text-white">Available Pools</h2>
        <button className="btn btn-primary" onClick={fetchPools} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Pools'}
        </button>
      </div>

      {loading && pools.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>Loading pools...</p>
        </div>
      ) : pools.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No pools configured</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pools.map((pool, index) => (
            <div key={index} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">{pool.name}</h3>
                {pool.error ? (
                  <span className="text-red-400 text-xs">Error loading</span>
                ) : pool.data ? (
                  <span className="text-green-400 text-xs">Active</span>
                ) : (
                  <span className="text-yellow-400 text-xs">Loading...</span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Token Pair</p>
                  <p className="text-white font-medium">SUI / DEEP</p>
                </div>

                <div>
                  <p className="text-gray-400 text-xs">Token Type</p>
                  <p className="font-mono text-xs text-white break-all">{pool.tokenType}</p>
                </div>

                <div>
                  <p className="text-gray-400 text-xs">Pool ID</p>
                  <p className="font-mono text-xs text-white break-all">{pool.id}</p>
                </div>

                {pool.data?.content?.fields && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-xs">SUI Balance</p>
                        <p className="font-semibold text-white">
                          {(Number(pool.data.content.fields.sui_balance) / 1e9).toFixed(4)} SUI
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Token Balance</p>
                        <p className="font-semibold text-white">
                          {(Number(pool.data.content.fields.token_balance) / 1e9).toFixed(4)} DEEP
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-gray-400 text-xs">Total Shares</p>
                      <p className="font-semibold text-white">
                        {Number(pool.data.content.fields.total_shares).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-400 text-xs">Momentum Pool ID</p>
                      <p className="font-mono text-xs text-white break-all">
                        {pool.momentumPoolId}
                      </p>
                    </div>
                  </>
                )}

                {pool.error && (
                  <div className="text-red-400 text-xs bg-red-900/20 p-2 rounded">
                    Error: {pool.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
