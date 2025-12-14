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
  const [selectedCoinId, setSelectedCoinId] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingCoins, setLoadingCoins] = useState(false)

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

  // Fetch user's LP coins for selected pool
  const fetchLpCoins = async () => {
    if (!currentAccount?.address || !selectedPool) {
      setLpCoins([])
      setSelectedCoinId('')
      return
    }

    setLoadingCoins(true)
    try {
      const normalizedTokenType = selectedPool.tokenType.replace(/:{3,}/g, '::')
      const lpCoinType = `0x2::coin::Coin<${PACKAGE_ID}::tradepool::LPToken<${normalizedTokenType}>>`

      console.log('Fetching LP coins for address:', currentAccount.address)
      console.log('LP Coin Type:', lpCoinType)

      // Get all coins owned by the user
      const ownedObjects = await client.getOwnedObjects({
        owner: currentAccount.address,
        options: {
          showContent: true,
          showType: true,
        },
      })

      console.log('Total objects found:', ownedObjects.data.length)
      console.log('Looking for LP token type:', `${PACKAGE_ID}::tradepool::LPToken<${normalizedTokenType}>`)

      // Filter for LP coins of this specific token type
      const poolLpCoins: UserLPCoin[] = ownedObjects.data
        .filter((obj) => {
          const objType = obj.data?.type
          if (!objType) return false

          // Check if it's a Coin type with exact LP token type match
          if (typeof objType === 'string') {
            const isMatch = objType.includes(`${PACKAGE_ID}::tradepool::LPToken<${normalizedTokenType}>`)
            if (objType.includes('LPToken')) {
              console.log('LP Token found:', objType)
              console.log('Expected type:', `${PACKAGE_ID}::tradepool::LPToken<${normalizedTokenType}>`)
              console.log('Match:', isMatch)
            }
            return isMatch
          } else if ('type' in objType) {
            return (objType as any).type?.includes(`${PACKAGE_ID}::tradepool::LPToken<${normalizedTokenType}>`)
          }
          return false
        })
        .map((obj) => {
          const content = obj.data?.content
          if (content && 'fields' in content) {
            const fields = content.fields as any
            return {
              id: obj.data?.objectId || '',
              balance: fields.balance || '0',
              coinType: selectedPool.tokenType,
            }
          }
          return null
        })
        .filter((coin): coin is UserLPCoin => coin !== null)

      console.log(`Found ${poolLpCoins.length} LP coins for pool ${selectedPool.name}`)
      setLpCoins(poolLpCoins)

      // Auto-select first coin if available
      if (poolLpCoins.length > 0) {
        setSelectedCoinId(poolLpCoins[0].id)
      } else {
        setSelectedCoinId('')
      }
    } catch (error) {
      console.error('Error fetching LP coins:', error)
      alert('Error fetching LP coins: ' + (error as Error).message)
      setLpCoins([])
    } finally {
      setLoadingCoins(false)
    }
  }

  // Fetch LP coins when account or pool changes
  useEffect(() => {
    fetchLpCoins()
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

    const selectedCoin = lpCoins.find(c => c.id === selectedCoinId)
    if (!selectedCoin) {
      alert('Selected coin not found')
      return
    }

    if (!withdrawAmount) {
      alert('Please enter withdrawal amount')
      return
    }

    const withdrawAmountMist = Math.floor(parseFloat(withdrawAmount) * 1e9).toString()

    if (BigInt(withdrawAmountMist) > BigInt(selectedCoin.balance)) {
      alert('Withdrawal amount exceeds your LP balance')
      return
    }

    // Auto-detect if withdrawing all
    const isWithdrawingAll = withdrawAmountMist === selectedCoin.balance

    setLoading(true)

    try {
      const tx = new Transaction()

      // Normalize token type: replace multiple colons with double colons
      const normalizedTokenType = selectedPool.tokenType.replace(/:{3,}/g, '::')

      let lpCoinToWithdraw

      if (isWithdrawingAll) {
        // Use the entire coin
        lpCoinToWithdraw = tx.object(selectedCoinId)
      } else {
        // Split the coin to get the partial amount
        const [splitCoin] = tx.splitCoins(tx.object(selectedCoinId), [tx.pure.u64(withdrawAmountMist)])
        lpCoinToWithdraw = splitCoin
      }

      // Call withdraw function - it returns (Coin<SUI>, Coin<TOKEN>)
      const [suiCoin, tokenCoin] = tx.moveCall({
        target: `${PACKAGE_ID}::tradepool::withdraw`,
        arguments: [
          tx.object(selectedPool.id),
          lpCoinToWithdraw,
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
            alert(`Withdrawal successful! Burned ${withdrawAmount} LP tokens. You received SUI and tokens.`)
            setSelectedCoinId('')
            setWithdrawAmount('')
            // Refresh LP coins after successful withdrawal
            fetchLpCoins()
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

  const selectedCoin = lpCoins.find(c => c.id === selectedCoinId)

  return (
    <div className="space-y-4">
      {/* Pool Selection */}
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
      </div>

      {selectedPool && (
        <>
          {loadingCoins ? (
            <div className="text-center py-4 text-gray-400">Loading LP tokens...</div>
          ) : lpCoins.length === 0 ? (
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
              <p className="text-yellow-400 text-sm font-semibold">No LP tokens found for "{selectedPool.name}"</p>
              <p className="text-xs text-gray-400 mt-2">
                You don't have any LP tokens for this specific pool. Deposit liquidity to this pool first.
              </p>
              <p className="text-xs text-gray-500 mt-3 font-mono">
                Looking for: LPToken&lt;{selectedPool.tokenType.split('::').slice(-2).join('::')}...&gt;
              </p>
            </div>
          ) : (
            <>
              {/* LP Token Selection */}
              <div>
                <label className="label">Your LP Tokens ({selectedPool.name})</label>
                <select
                  className="input"
                  value={selectedCoinId}
                  onChange={(e) => setSelectedCoinId(e.target.value)}
                >
                  <option value="">-- Select LP token --</option>
                  {lpCoins.map((coin) => (
                    <option key={coin.id} value={coin.id}>
                      {(Number(coin.balance) / 1e9).toFixed(4)} LP
                    </option>
                  ))}
                </select>
                {selectedCoin && (
                  <p className="text-xs text-gray-400 mt-1 font-mono break-all">
                    {selectedCoin.id}
                  </p>
                )}
                <p className="text-xs text-blue-400 mt-2">
                  💡 Only LP tokens from this specific pool are shown
                </p>
              </div>

              {/* Amount Input */}
              {selectedCoinId && (
                <div>
                  <label className="label">Amount to Withdraw</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.0001"
                      className="input pr-16"
                      placeholder="0.0"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                      onClick={() => {
                        if (selectedCoin) {
                          setWithdrawAmount((Number(selectedCoin.balance) / 1e9).toString())
                        }
                      }}
                    >
                      MAX
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {selectedCoin ? (Number(selectedCoin.balance) / 1e9).toFixed(4) : '0'} LP
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Withdraw Button */}
      <button
        className="btn btn-danger w-full"
        onClick={handleWithdraw}
        disabled={loading || !selectedPool || !selectedCoinId || !currentAccount || !withdrawAmount}
      >
        {loading ? 'Withdrawing...' : `Withdraw ${withdrawAmount || '0'} LP`}
      </button>

      {/* Info */}
      {selectedCoinId && withdrawAmount && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
          <p className="text-xs text-blue-300">
            💡 Burns <strong>{withdrawAmount}</strong> LP tokens and returns proportional SUI + tokens
          </p>
        </div>
      )}
    </div>
  )
}
