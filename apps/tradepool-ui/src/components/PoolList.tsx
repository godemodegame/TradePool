import { useState } from 'react'
import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit'
import { PACKAGE_ID } from '../types'

export function PoolList() {
  const [pools, setPools] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const client = useSuiClient()
  const account = useCurrentAccount()

  const fetchPools = async () => {
    if (!account) return

    setLoading(true)
    try {
      // Fetch all objects owned by the package
      const objects = await client.getOwnedObjects({
        owner: account.address,
        options: {
          showType: true,
          showContent: true,
        },
      })

      // Filter for Pool objects
      const poolObjects = objects.data.filter((obj) =>
        obj.data?.type?.includes('tradepool::Pool')
      )

      setPools(poolObjects)
    } catch (error) {
      console.error('Error fetching pools:', error)
      alert('Error fetching pools: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Your Pools</h2>
        <button className="btn btn-primary" onClick={fetchPools} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Pools'}
        </button>
      </div>

      {pools.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No pools found</p>
          <p className="text-sm mt-2">Click "Refresh Pools" to load your pools</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pools.map((pool, index) => (
            <div key={index} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Object ID</p>
                  <p className="font-mono text-xs text-white break-all">
                    {pool.data?.objectId || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Type</p>
                  <p className="font-mono text-xs text-white break-all">
                    {pool.data?.type || 'N/A'}
                  </p>
                </div>
              </div>

              {pool.data?.content && (
                <div className="mt-4 text-xs">
                  <p className="text-gray-400 mb-2">Pool Data:</p>
                  <pre className="bg-gray-950 p-3 rounded overflow-x-auto text-gray-300">
                    {JSON.stringify(pool.data.content, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
