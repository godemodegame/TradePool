import { useState, useEffect } from 'react'
import { useSignAndExecuteTransaction, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID } from '../types'

interface PoolOption {
  id: string
  name: string
  tokenType: string
}

interface UserLPCoin {
  id: string
  balance: string
  coinType: string
}

export function WithdrawLiquidity() {
  const [pools, setPools] = useState<PoolOption[]>([])
  const [loadingPools, setLoadingPools] = useState(false)
  const [selectedPoolIndex, setSelectedPoolIndex] = useState<number>(-1)
  const [lpCoins, setLpCoins] = useState<UserLPCoin[]>([])
  const [allLpCoins, setAllLpCoins] = useState<any[]>([])
  const [selectedCoinId, setSelectedCoinId] = useState('')
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

  // Fetch user's LP coins (LP tokens are now fungible coins)
  const fetchLPCoins = async () => {
    if (!currentAccount?.address || !selectedPool) {
      setLpCoins([])
      setAllLpCoins([])
      setSelectedCoinId('')
      return
    }

    setLoadingReceipts(true)
    try {
      console.log('Fetching LP coins for address:', currentAccount.address)
      console.log('PACKAGE_ID:', PACKAGE_ID)
      
      // Normalize token type
      const normalizedTokenType = selectedPool.tokenType.replace(/:{3,}/g, '::')
      const lpCoinType = `${PACKAGE_ID}::tradepool::LPToken<${normalizedTokenType}>`
      console.log('Looking for coin type:', lpCoinType)

      // Get all LP coins owned by the user for this pool
      const coins = await client.getCoins({
        owner: currentAccount.address,
        coinType: lpCoinType,
      })

      console.log('LP coins found:', coins.data.length)

      // Map coins to our interface
      const userLPCoins: UserLPCoin[] = coins.data.map((coin) => ({
        id: coin.coinObjectId,
        balance: coin.balance,
        coinType: coin.coinType,
      }))

      setLpCoins(userLPCoins)
      setAllLpCoins(userLPCoins)

      // Auto-select first coin if available
      if (userLPCoins.length > 0) {
        setSelectedCoinId(userLPCoins[0].id)
      } else {
        setSelectedCoinId('')
      }
    } catch (error) {
      console.error('Error fetching LP coins:', error)
      alert('Error fetching LP coins: ' + (error as Error).message)
      setLpCoins([])
      setAllLpCoins([])
    } finally {
      setLoadingReceipts(false)
    }
  }

  // Fetch LP coins when account or pool changes
  useEffect(() => {
    fetchLPCoins()
  }, [currentAccount?.address, selectedPool])

  const handleWithdraw = async () => {
    if (!currentAccount) {
      alert('Please connect your wallet')
      return
    }

    if (!selectedPool || !selectedCoinId) {
      alert('Please select a pool and LP coin')
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
          tx.object(selectedCoinId),
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
            setSelectedCoinId('')
            // Refresh LP coins after successful withdrawal
            fetchLPCoins()
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
                onClick={fetchLPCoins}
                disabled={loadingReceipts}
                className="btn btn-primary text-xs px-3 py-1"
              >
                {loadingReceipts ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Debug section */}
          {showDebug && allLpCoins.length > 0 && (
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-blue-400 text-sm font-semibold">
                  🐛 Debug: All LP Coins ({allLpCoins.length} found)
                </p>
                <button
                  onClick={() => setShowDebug(false)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Hide
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {allLpCoins.map((coin: any, idx) => (
                  <div key={idx} className="bg-gray-900 p-2 rounded text-xs">
                    <p className="text-white">LP Coin {idx + 1}:</p>
                    <p className="text-gray-400 font-mono break-all">ID: {coin.id}</p>
                    <p className="text-green-400">Balance: {coin.balance}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingReceipts ? (
            <div className="text-center py-4 text-gray-400">
              Loading your LP positions...
            </div>
          ) : lpCoins.length === 0 ? (
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
              <p className="text-yellow-400 text-sm font-semibold mb-2">
                ⚠️ No LP positions found for this pool
              </p>
              <p className="text-xs text-gray-400 mb-2">
                No LP coins found in your wallet for this pool.
              </p>
              <p className="text-xs text-gray-400 mb-2">
                Possible reasons:
              </p>
              <ul className="text-xs text-gray-400 list-disc list-inside space-y-1 mb-3">
                <li>You haven't deposited liquidity yet</li>
                <li>Deposit transaction failed</li>
                <li>Wrong PACKAGE_ID in .env file</li>
                <li>Wrong pool selected</li>
              </ul>
              {currentAccount && (
                <a
                  href={`https://suiscan.xyz/testnet/account/${currentAccount.address}/coins`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  View your coins on Sui Explorer →
                </a>
              )}
            </div>
          ) : (
            <div>
              <label className="label">Your LP Positions</label>
              <div className="space-y-2">
                {lpCoins.map((coin) => (
                  <div
                    key={coin.id}
                    className={`bg-gray-900 rounded-lg p-3 border cursor-pointer transition-colors ${
                      selectedCoinId === coin.id
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                    onClick={() => setSelectedCoinId(coin.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-white font-semibold">
                          {Number(coin.balance).toLocaleString()} LP tokens
                        </p>
                        <p className="font-mono text-xs text-gray-400 mt-1 break-all">
                          {coin.id.slice(0, 20)}...{coin.id.slice(-6)}
                        </p>
                      </div>
                      <div className="ml-2">
                        <input
                          type="radio"
                          checked={selectedCoinId === coin.id}
                          onChange={() => setSelectedCoinId(coin.id)}
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
        disabled={loading || !selectedPool || !selectedCoinId || !currentAccount}
      >
        {loading ? 'Withdrawing...' : 'Withdraw Liquidity'}
      </button>

      {selectedCoinId && (
        <p className="text-xs text-gray-500">
          ⚠️ This will burn your LP tokens and withdraw your liquidity
        </p>
      )}
    </div>
  )
}
