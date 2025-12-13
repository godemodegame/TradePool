import { useState, useEffect } from 'react'
import { useSignAndExecuteTransaction, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID } from '../types'

interface PoolOption {
  id: string
  name: string
  tokenType: string
}

interface UserLPReceipt {
  id: string
  poolId: string
  shares: string
  tokenType: string
}

export function WithdrawLiquidity() {
  const [pools, setPools] = useState<PoolOption[]>([])
  const [loadingPools, setLoadingPools] = useState(false)
  const [selectedPoolIndex, setSelectedPoolIndex] = useState<number>(-1)
  const [receipts, setReceipts] = useState<UserLPReceipt[]>([])
  const [allReceipts, setAllReceipts] = useState<any[]>([])
  const [selectedReceiptId, setSelectedReceiptId] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingReceipts, setLoadingReceipts] = useState(false)
  const [showDebug, setShowDebug] = useState(true)

  const { mutate: signAndExecute } = useSignAndExecuteTransaction()
  const currentAccount = useCurrentAccount()
  const client = useSuiClient()

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
          return {
            id: parsedEvent.pool_id,
            name: parsedEvent.pool_name || 'Unknown Pool',
            tokenType: parsedEvent.token_type?.name || '',
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

  // Fetch user's LP receipts
  const fetchReceipts = async () => {
    if (!currentAccount?.address || !selectedPool) {
      setReceipts([])
      setAllReceipts([])
      setSelectedReceiptId('')
      return
    }

    setLoadingReceipts(true)
    try {
      console.log('Fetching LP receipts for address:', currentAccount.address)
      console.log('PACKAGE_ID:', PACKAGE_ID)
      console.log('Looking for type:', `${PACKAGE_ID}::tradepool::LPReceipt`)

      // Get all objects owned by the user
      const ownedObjects = await client.getOwnedObjects({
        owner: currentAccount.address,
        filter: {
          StructType: `${PACKAGE_ID}::tradepool::LPReceipt`,
        },
        options: {
          showContent: true,
          showType: true,
        },
      })

        console.log('All LP receipts found:', ownedObjects.data.length)

        // Store all receipts for debugging display
        const allReceiptsData = ownedObjects.data.map((obj) => {
          const content = obj.data?.content
          if (content && 'fields' in content) {
            const fields = content.fields as any
            return {
              id: obj.data?.objectId,
              pool_id: fields.pool_id,
              shares: fields.shares,
              token_type: fields.token_type
            }
          }
          return null
        }).filter(r => r !== null)

        setAllReceipts(allReceiptsData)

        // Log all receipts for debugging
        allReceiptsData.forEach((receipt, idx) => {
          console.log(`Receipt ${idx}:`, receipt)
        })

        // Filter receipts for the selected pool
        const poolReceipts: UserLPReceipt[] = ownedObjects.data
          .filter((obj) => {
            const content = obj.data?.content
            if (content && 'fields' in content) {
              const fields = content.fields as any
              console.log(`Comparing pool_id: ${fields.pool_id} with selected: ${selectedPool.id}`)
              return fields.pool_id === selectedPool.id
            }
            return false
          })
          .map((obj) => {
            const content = obj.data?.content
            const fields = (content as any).fields
            return {
              id: obj.data?.objectId || '',
              poolId: fields.pool_id,
              shares: fields.shares,
              tokenType: fields.token_type?.fields?.name || selectedPool.tokenType,
            }
          })

        console.log(`Found ${poolReceipts.length} receipts for pool ${selectedPool.name}`)
        setReceipts(poolReceipts)

        // Auto-select first receipt if available
        if (poolReceipts.length > 0) {
          setSelectedReceiptId(poolReceipts[0].id)
        } else {
          setSelectedReceiptId('')
        }
      } catch (error) {
        console.error('Error fetching receipts:', error)
        alert('Error fetching receipts: ' + (error as Error).message)
        setReceipts([])
        setAllReceipts([])
      } finally {
        setLoadingReceipts(false)
      }
    }

  // Fetch receipts when account or pool changes
  useEffect(() => {
    fetchReceipts()
  }, [currentAccount?.address, selectedPool])

  const handleWithdraw = async () => {
    if (!currentAccount) {
      alert('Please connect your wallet')
      return
    }

    if (!selectedPool || !selectedReceiptId) {
      alert('Please select a pool and LP receipt')
      return
    }

    setLoading(true)

    try {
      const tx = new Transaction()

      // Normalize token type: replace multiple colons with double colons
      const normalizedTokenType = selectedPool.tokenType.replace(/:{3,}/g, '::')

      // Call withdraw function - it returns (Coin<SUI>, Coin<TOKEN>)
      const [suiCoin, tokenCoin] = tx.moveCall({
        target: `${PACKAGE_ID}::tradepool::withdraw`,
        arguments: [
          tx.object(selectedPool.id),
          tx.object(selectedReceiptId),
        ],
        typeArguments: [normalizedTokenType],
      })

      // Transfer the returned coins to the user
      tx.transferObjects([suiCoin, tokenCoin], tx.pure.address(currentAccount.address))

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log('Withdrawal successful:', result)
            alert('Withdrawal successful! You received SUI and tokens.')
            setSelectedReceiptId('')
            // Refresh receipts after successful withdrawal
            fetchReceipts()
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
        {pools.length === 0 && !loadingPools && (
          <p className="text-xs text-yellow-400 mt-1">No pools found. Create a pool first!</p>
        )}
      </div>

      {selectedPool && (
        <>
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Pool</p>
                <p className="font-semibold text-white">{selectedPool.name}</p>
                <p className="text-xs text-gray-400 mt-2 break-all">Pool ID: {selectedPool.id}</p>
              </div>
              <button
                onClick={fetchReceipts}
                disabled={loadingReceipts}
                className="btn btn-primary text-xs px-3 py-1"
              >
                {loadingReceipts ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Debug section */}
          {showDebug && allReceipts.length > 0 && (
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-blue-400 text-sm font-semibold">
                  🐛 Debug: All LP Receipts ({allReceipts.length} found)
                </p>
                <button
                  onClick={() => setShowDebug(false)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Hide
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {allReceipts.map((receipt: any, idx) => (
                  <div key={idx} className="bg-gray-900 p-2 rounded text-xs">
                    <p className="text-white">Receipt {idx + 1}:</p>
                    <p className="text-gray-400 font-mono break-all">ID: {receipt.id}</p>
                    <p className="text-gray-400 font-mono break-all">Pool: {receipt.pool_id}</p>
                    <p className="text-green-400">Shares: {receipt.shares}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingReceipts ? (
            <div className="text-center py-4 text-gray-400">
              Loading your LP positions...
            </div>
          ) : receipts.length === 0 ? (
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
              <p className="text-yellow-400 text-sm font-semibold mb-2">
                ⚠️ No LP positions found for this pool
              </p>
              {allReceipts.length === 0 ? (
                <>
                  <p className="text-xs text-gray-400 mb-2">
                    No LP receipts found in your wallet at all.
                  </p>
                  <p className="text-xs text-gray-400 mb-2">
                    Possible reasons:
                  </p>
                  <ul className="text-xs text-gray-400 list-disc list-inside space-y-1 mb-3">
                    <li>You haven't deposited liquidity yet</li>
                    <li>Deposit transaction failed</li>
                    <li>Wrong PACKAGE_ID in .env file</li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-400 mb-2">
                    Found {allReceipts.length} LP receipt(s), but none match this pool.
                  </p>
                  <p className="text-xs text-gray-400 mb-2">
                    Check the debug section above to see all your receipts.
                  </p>
                </>
              )}
              {currentAccount && (
                <a
                  href={`https://suiscan.xyz/testnet/account/${currentAccount.address}/objects`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  View your objects on Sui Explorer →
                </a>
              )}
            </div>
          ) : (
            <div>
              <label className="label">Your LP Positions</label>
              <div className="space-y-2">
                {receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className={`bg-gray-900 rounded-lg p-3 border cursor-pointer transition-colors ${
                      selectedReceiptId === receipt.id
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                    onClick={() => setSelectedReceiptId(receipt.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-white font-semibold">
                          {Number(receipt.shares).toLocaleString()} shares
                        </p>
                        <p className="font-mono text-xs text-gray-400 mt-1 break-all">
                          {receipt.id.slice(0, 20)}...{receipt.id.slice(-6)}
                        </p>
                      </div>
                      <div className="ml-2">
                        <input
                          type="radio"
                          checked={selectedReceiptId === receipt.id}
                          onChange={() => setSelectedReceiptId(receipt.id)}
                          className="w-4 h-4"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!currentAccount ? (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">
            Please connect your wallet to view and withdraw your LP positions
          </p>
        </div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Configuration</p>
          <p className="text-xs font-mono text-gray-300 break-all">
            Package: {PACKAGE_ID === '0x0' ? '⚠️ NOT SET' : PACKAGE_ID}
          </p>
          {currentAccount && (
            <p className="text-xs font-mono text-gray-300 break-all mt-1">
              Wallet: {currentAccount.address}
            </p>
          )}
        </div>
      )}

      <button
        className="btn btn-danger w-full"
        onClick={handleWithdraw}
        disabled={loading || !selectedPool || !selectedReceiptId || !currentAccount}
      >
        {loading ? 'Withdrawing...' : 'Withdraw Liquidity'}
      </button>

      {selectedReceiptId && (
        <p className="text-xs text-gray-500">
          ⚠️ This will burn your LP receipt and withdraw your liquidity
        </p>
      )}
    </div>
  )
}
