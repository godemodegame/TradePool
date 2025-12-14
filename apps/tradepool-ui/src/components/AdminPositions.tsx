import { useState, useEffect } from 'react'
import { useSignAndExecuteTransaction, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID, CLOCK_ID, MOMENTUM_VERSION_ID } from '../types'
import { useCoins } from '../hooks/useCoins'

interface PoolOption {
  id: string
  name: string
  tokenType: string
  momentumPoolId: string
  hasPosition?: boolean
  positionId?: string
}

// Tick range presets for common ranges
// NOTE: For negative ticks, we need to pass the absolute value
// The smart contract will interpret values > 2^31 as negative using i32::from()
const TICK_PRESETS = [
  { name: 'Narrow Range (100 to 200)', lower: 100, upper: 200, description: 'High fees, concentrated liquidity' },
  { name: 'Medium Range (500 to 1000)', lower: 500, upper: 1000, description: 'Balanced fees and liquidity' },
  { name: 'Wide Range (1000 to 2000)', lower: 1000, upper: 2000, description: 'Low fees, broad coverage' },
  { name: 'Custom', lower: 0, upper: 0, description: 'Enter your own tick range' },
]

export function AdminPositions() {
  const account = useCurrentAccount()
  const client = useSuiClient()
  const [pools, setPools] = useState<PoolOption[]>([])
  const [selectedPoolIndex, setSelectedPoolIndex] = useState(-1)
  const [operation, setOperation] = useState<'deposit' | 'withdraw'>('deposit')
  const [loading, setLoading] = useState(false)
  const [loadingPools, setLoadingPools] = useState(false)

  // Simplified inputs
  const [tickPreset, setTickPreset] = useState(1) // Default to medium range
  const [customTickLower, setCustomTickLower] = useState('')
  const [customTickUpper, setCustomTickUpper] = useState('')
  const [suiAmount, setSuiAmount] = useState('')
  const [slippagePercent, setSlippagePercent] = useState('1') // 1% default slippage
  const [advancedMode, setAdvancedMode] = useState(false)
  const [minTokenOut, setMinTokenOut] = useState('')
  const [minSuiOut, setMinSuiOut] = useState('')
  const [withdrawAll, setWithdrawAll] = useState(true) // Full withdrawal by default

  const { mutate: signAndExecute } = useSignAndExecuteTransaction()

  const selectedPool = selectedPoolIndex >= 0 ? pools[selectedPoolIndex] : null
  const selectedTickPreset = TICK_PRESETS[tickPreset]
  const isCustomTicks = selectedTickPreset.name === 'Custom'

  // Calculate effective tick values
  const effectiveTickLower = isCustomTicks ? customTickLower : selectedTickPreset.lower.toString()
  const effectiveTickUpper = isCustomTicks ? customTickUpper : selectedTickPreset.upper.toString()

  // Auto-calculate slippage protection
  const calculateMinOut = (amount: string, isToken: boolean = true) => {
    if (!amount || !slippagePercent) return '0'
    const amountNum = parseFloat(amount)
    const slippage = parseFloat(slippagePercent) / 100
    return Math.floor(amountNum * (1 - slippage) * 1e9).toString()
  }

  // Fetch available pools and check for positions
  useEffect(() => {
    const fetchPools = async () => {
      if (!account) return

      console.log('\n=== [AdminPositions] Starting pool fetch ===')
      console.log(`[AdminPositions] Package ID: ${PACKAGE_ID}`)
      console.log(`[AdminPositions] Connected account: ${account.address}`)

      setLoadingPools(true)
      try {
        const events = await client.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::tradepool::PoolCreatedEvent` },
          limit: 50,
        })

        console.log(`[AdminPositions] Found ${events.data.length} pool creation events`)

        const poolOptions: PoolOption[] = await Promise.all(
          events.data.map(async (event) => {
            const parsedEvent = event.parsedJson as any
            const poolId = parsedEvent.pool_id

            let tokenType = parsedEvent.token_type?.name || ''

            // Add 0x prefix if missing
            if (tokenType && !tokenType.startsWith('0x')) {
              tokenType = '0x' + tokenType
            }

            let poolData = {
              id: poolId,
              name: parsedEvent.pool_name || 'Unknown Pool',
              tokenType,
              momentumPoolId: '',
              hasPosition: false,
              positionId: undefined,
            }

            try {
              const poolObject = await client.getObject({
                id: poolId,
                options: { showContent: true },
              })

              if (poolObject.data?.content && 'fields' in poolObject.data.content) {
                const fields = poolObject.data.content.fields as any
                poolData.name = fields.name || parsedEvent.pool_name || 'Unknown Pool'
                poolData.momentumPoolId = fields.momentum_pool_id || ''
              }
            } catch (error) {
              console.error('Error fetching pool details:', error)
            }

            // Check if user has a position for this pool (Momentum Position NFT)
            try {
              console.log(`\n[AdminPositions] Checking positions for pool: ${poolData.name}`)
              console.log(`[AdminPositions] Pool ID: ${poolId}`)
              console.log(`[AdminPositions] Momentum Pool ID: ${poolData.momentumPoolId}`)
              console.log(`[AdminPositions] User address: ${account.address}`)

              const ownedObjects = await client.getOwnedObjects({
                owner: account.address,
                filter: {
                  StructType: `0xbde23516c6b5d169501064365c66b5e8e0bd832a5dd33ca580e204e9f86193d9::position::Position`,
                },
                options: { showContent: true },
              })

              console.log(`[AdminPositions] Total Momentum positions found: ${ownedObjects.data.length}`)

              // Find position that matches this pool's momentum pool
              const position = ownedObjects.data.find((obj) => {
                if (obj.data?.content && 'fields' in obj.data.content) {
                  const fields = obj.data.content.fields as any
                  const positionPoolId = fields.pool
                  console.log(`[AdminPositions] Checking position ${obj.data.objectId}`)
                  console.log(`[AdminPositions]   Position pool: ${positionPoolId}`)
                  console.log(`[AdminPositions]   Expected pool: ${poolData.momentumPoolId}`)
                  console.log(`[AdminPositions]   Match: ${positionPoolId === poolData.momentumPoolId}`)
                  return positionPoolId === poolData.momentumPoolId
                }
                return false
              })

              if (position && position.data) {
                poolData.hasPosition = true
                poolData.positionId = position.data.objectId
                console.log(`[AdminPositions] ✓ Position found: ${position.data.objectId}`)
              } else {
                console.log(`[AdminPositions] ✗ No position found for this pool`)
              }
            } catch (error) {
              console.error('[AdminPositions] Error checking for positions:', error)
            }

            return poolData
          })
        )

        const poolsWithPositions = poolOptions.filter(p => p.hasPosition).length
        const poolsWithoutPositions = poolOptions.length - poolsWithPositions

        console.log(`\n=== [AdminPositions] Summary ===`)
        console.log(`[AdminPositions] Total pools: ${poolOptions.length}`)
        console.log(`[AdminPositions] Pools with active positions: ${poolsWithPositions}`)
        console.log(`[AdminPositions] Pools without positions: ${poolsWithoutPositions}`)

        poolOptions.forEach((pool, idx) => {
          console.log(`[AdminPositions] Pool ${idx + 1}: ${pool.name} - ${pool.hasPosition ? '✓ HAS POSITION' : '✗ No position'}`)
          if (pool.hasPosition) {
            console.log(`[AdminPositions]   Position ID: ${pool.positionId}`)
          }
        })
        console.log('=== [AdminPositions] Fetch complete ===\n')

        setPools(poolOptions)
      } catch (error) {
        console.error('[AdminPositions] Error fetching pools:', error)
      } finally {
        setLoadingPools(false)
      }
    }

    fetchPools()
  }, [account])

  const { totalBalance: suiBalance, loading: suiLoading } = useCoins('0x2::sui::SUI')

  const handleOperation = async () => {
    if (!account || !selectedPool) {
      alert('Please connect wallet and select a pool')
      return
    }

    console.log('\n=== [AdminPositions] Starting operation ===')
    console.log(`[AdminPositions] Operation: ${operation}`)
    console.log(`[AdminPositions] Pool: ${selectedPool.name}`)
    console.log(`[AdminPositions] Pool ID: ${selectedPool.id}`)
    console.log(`[AdminPositions] Has position: ${selectedPool.hasPosition}`)
    console.log(`[AdminPositions] Position ID: ${selectedPool.positionId}`)
    console.log(`[AdminPositions] Token type: ${selectedPool.tokenType}`)

    setLoading(true)

    try {
      const tx = new Transaction()
      const normalizedTokenType = selectedPool.tokenType.replace(/:{3,}/g, '::')

      console.log(`[AdminPositions] Normalized token type: ${normalizedTokenType}`)

      if (operation === 'deposit') {
        // Auto-detect: create new position or add to existing
        const isNewPosition = !selectedPool.hasPosition

        console.log(`[AdminPositions] ${isNewPosition ? 'Creating NEW position' : 'Adding to EXISTING position'}`)

        if (isNewPosition) {
          // Validate for new position creation
          if (!effectiveTickLower || !effectiveTickUpper || !suiAmount) {
            alert('Please fill in all required fields')
            setLoading(false)
            return
          }

          const suiAmountMist = Math.floor(parseFloat(suiAmount) * 1e9)
          const [suiCoin] = tx.splitCoins(tx.gas, [suiAmountMist])
          const minOut = advancedMode && minTokenOut ? minTokenOut : calculateMinOut(suiAmount, true)

          console.log(`[AdminPositions] Create position params:`)
          console.log(`[AdminPositions]   Pool ID: ${selectedPool.id}`)
          console.log(`[AdminPositions]   Momentum pool ID: ${selectedPool.momentumPoolId}`)
          console.log(`[AdminPositions]   SUI amount: ${suiAmount} SUI (${suiAmountMist} MIST)`)
          console.log(`[AdminPositions]   Tick lower: ${effectiveTickLower}`)
          console.log(`[AdminPositions]   Tick upper: ${effectiveTickUpper}`)
          console.log(`[AdminPositions]   Min token out: ${minOut}`)
          console.log(`[AdminPositions]   Clock: ${CLOCK_ID}`)
          console.log(`[AdminPositions]   Version: ${MOMENTUM_VERSION_ID}`)
          console.log(`[AdminPositions]   Type argument: ${normalizedTokenType}`)

          const [position, tokenRefund, suiRefund] = tx.moveCall({
            target: `${PACKAGE_ID}::tradepool::admin_deposit_sui_simple`,
            arguments: [
              tx.object(selectedPool.id),
              tx.object(selectedPool.momentumPoolId),
              tx.pure.u32(parseInt(effectiveTickLower)),
              tx.pure.u32(parseInt(effectiveTickUpper)),
              suiCoin,
              tx.pure.u64(minOut),
              tx.pure.u128('0'),
              tx.object(CLOCK_ID),
              tx.object(MOMENTUM_VERSION_ID),
            ],
            typeArguments: [normalizedTokenType],
          })

          console.log(`[AdminPositions] Transaction built, ready to sign`)

          tx.transferObjects([position, tokenRefund, suiRefund], tx.pure.address(account.address))
        } else {
          // Add to existing position
          if (!suiAmount || !selectedPool.positionId) {
            alert('Please enter SUI amount')
            setLoading(false)
            return
          }

          const suiAmountMist = Math.floor(parseFloat(suiAmount) * 1e9)
          const [suiCoin] = tx.splitCoins(tx.gas, [suiAmountMist])
          const minOut = advancedMode && minTokenOut ? minTokenOut : calculateMinOut(suiAmount, true)

          console.log(`[AdminPositions] Add to position params:`)
          console.log(`[AdminPositions]   SUI amount: ${suiAmount} SUI (${suiAmountMist} MIST)`)
          console.log(`[AdminPositions]   Position ID: ${selectedPool.positionId}`)
          console.log(`[AdminPositions]   Min token out: ${minOut}`)

          const [tokenRefund, suiRefund] = tx.moveCall({
            target: `${PACKAGE_ID}::tradepool::admin_add_sui_to_position`,
            arguments: [
              tx.object(selectedPool.id),
              tx.object(selectedPool.momentumPoolId),
              tx.object(selectedPool.positionId),
              suiCoin,
              tx.pure.u64(minOut),
              tx.pure.u128('0'),
              tx.object(CLOCK_ID),
              tx.object(MOMENTUM_VERSION_ID),
            ],
            typeArguments: [normalizedTokenType],
          })

          console.log(`[AdminPositions] Transaction built, ready to sign`)

          tx.transferObjects([tokenRefund, suiRefund], tx.pure.address(account.address))
        }
      } else if (operation === 'withdraw') {
        // Withdraw/close position
        if (!selectedPool.positionId) {
          alert('No position found for this pool')
          setLoading(false)
          return
        }

        console.log(`[AdminPositions] Withdraw operation:`)
        console.log(`[AdminPositions]   Mode: ${withdrawAll ? 'CLOSE (full)' : 'PARTIAL'}`)
        console.log(`[AdminPositions]   Position ID: ${selectedPool.positionId}`)

        const minOut = advancedMode && minSuiOut ? minSuiOut : '0'

        console.log(`[AdminPositions]   Min SUI out: ${minOut}`)

        if (withdrawAll) {
          // Close position completely
          console.log(`[AdminPositions] Calling admin_close_position`)
          const [suiCoin] = tx.moveCall({
            target: `${PACKAGE_ID}::tradepool::admin_close_position`,
            arguments: [
              tx.object(selectedPool.id),
              tx.object(selectedPool.momentumPoolId),
              tx.object(selectedPool.positionId),
              tx.pure.u64(minOut),
              tx.pure.u128('340282366920938463463374607431768211455'),
              tx.object(CLOCK_ID),
              tx.object(MOMENTUM_VERSION_ID),
            ],
            typeArguments: [normalizedTokenType],
          })

          tx.transferObjects([suiCoin], tx.pure.address(account.address))
        } else {
          // Partial withdrawal
          console.log(`[AdminPositions] Calling admin_withdraw_to_sui`)
          const [suiCoin, tokenRefund, suiRefund] = tx.moveCall({
            target: `${PACKAGE_ID}::tradepool::admin_withdraw_to_sui`,
            arguments: [
              tx.object(selectedPool.id),
              tx.object(selectedPool.momentumPoolId),
              tx.object(selectedPool.positionId),
              tx.pure.u64('0'), // min_withdraw_sui
              tx.pure.u64('0'), // min_withdraw_token
              tx.pure.u64(minOut),
              tx.pure.u128('340282366920938463463374607431768211455'),
              tx.object(CLOCK_ID),
              tx.object(MOMENTUM_VERSION_ID),
            ],
            typeArguments: [normalizedTokenType],
          })

          tx.transferObjects([suiCoin, tokenRefund, suiRefund], tx.pure.address(account.address))
        }
      }

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('\n=== [AdminPositions] Operation SUCCESS ===')
            console.log('[AdminPositions] Transaction digest:', result.digest)
            console.log('[AdminPositions] Full result:', result)

            let message = ''
            if (operation === 'deposit') {
              message = selectedPool.hasPosition ? 'Liquidity added successfully!' : 'Position created successfully!'
            } else {
              message = withdrawAll ? 'Position closed successfully!' : 'Liquidity withdrawn successfully!'
            }

            console.log(`[AdminPositions] ${message}`)
            console.log('=== [AdminPositions] Complete ===\n')

            alert(message)
            setSuiAmount('')

            // Refresh pools to update position status
            setTimeout(() => {
              console.log('[AdminPositions] Reloading page to refresh positions...')
              window.location.reload()
            }, 1000)
          },
          onError: (error) => {
            console.error('\n=== [AdminPositions] Operation FAILED ===')
            console.error('[AdminPositions] Error:', error)
            console.error('[AdminPositions] Error message:', error.message)
            console.error('=== [AdminPositions] Failed ===\n')
            alert('Error: ' + error.message)
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
      {/* Operation Tabs - Simplified to 2 buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          className={`btn text-sm py-2 ${operation === 'deposit' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setOperation('deposit')}
        >
          {selectedPool?.hasPosition ? 'Add Liquidity' : 'Create Position'}
        </button>
        <button
          className={`btn text-sm py-2 ${operation === 'withdraw' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setOperation('withdraw')}
          disabled={!selectedPool?.hasPosition}
        >
          Remove Liquidity
        </button>
      </div>

      {/* SUI Balance Display */}
      <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
        <p className="text-xs text-gray-400 mb-1">Your SUI Balance</p>
        <p className="text-white font-semibold text-lg">
          {suiLoading ? 'Loading...' : `${(Number(suiBalance) / 1e9).toFixed(4)} SUI`}
        </p>
      </div>

      {/* Pool Selection */}
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
      </div>

      {selectedPool && (
        <>
          {/* Position Status Info */}
          {selectedPool.hasPosition && (
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
              <p className="text-xs text-green-300 font-semibold mb-1">✓ Active Position Found</p>
              <p className="text-xs text-gray-400 font-mono break-all">
                Position ID: {selectedPool.positionId}
              </p>
            </div>
          )}

          {/* Tick Range (for creating new position only) */}
          {operation === 'deposit' && !selectedPool.hasPosition && (
            <div>
              <label className="label">Price Range</label>
              <select
                className="input"
                value={tickPreset}
                onChange={(e) => setTickPreset(Number(e.target.value))}
              >
                {TICK_PRESETS.map((preset, index) => (
                  <option key={index} value={index}>
                    {preset.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {selectedTickPreset.description}
              </p>

              {isCustomTicks && (
                <div className="mt-3 space-y-2">
                  <input
                    type="number"
                    className="input"
                    placeholder="Lower Tick (u32)"
                    value={customTickLower}
                    onChange={(e) => setCustomTickLower(e.target.value)}
                  />
                  <input
                    type="number"
                    className="input"
                    placeholder="Upper Tick (u32)"
                    value={customTickUpper}
                    onChange={(e) => setCustomTickUpper(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* SUI Amount (for deposit) */}
          {operation === 'deposit' && (
            <div>
              <label className="label">SUI Amount</label>
              <input
                type="number"
                step="0.1"
                className="input"
                placeholder="1.0"
                value={suiAmount}
                onChange={(e) => setSuiAmount(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Available: {(Number(suiBalance) / 1e9).toFixed(4)} SUI
              </p>
            </div>
          )}

          {/* Withdrawal Option */}
          {operation === 'withdraw' && (
            <div>
              <label className="label">Withdrawal Type</label>
              <div className="flex gap-2">
                <button
                  className={`flex-1 py-2 px-3 rounded text-sm ${
                    withdrawAll
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  onClick={() => setWithdrawAll(true)}
                >
                  Close Position (Full)
                </button>
                <button
                  className={`flex-1 py-2 px-3 rounded text-sm ${
                    !withdrawAll
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  onClick={() => setWithdrawAll(false)}
                >
                  Partial Withdrawal
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {withdrawAll ? 'Completely close the position and withdraw all liquidity' : 'Withdraw liquidity while keeping position open'}
              </p>
            </div>
          )}

          {/* Slippage (simplified) */}
          {operation === 'deposit' && !advancedMode && (
            <div>
              <label className="label">Slippage Tolerance (%)</label>
              <div className="flex gap-2">
                {['0.5', '1', '2', '5'].map((pct) => (
                  <button
                    key={pct}
                    className={`flex-1 py-2 px-3 rounded text-sm ${
                      slippagePercent === pct
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    onClick={() => setSlippagePercent(pct)}
                  >
                    {pct}%
                  </button>
                ))}
                <input
                  type="number"
                  step="0.1"
                  className="input flex-1 text-center"
                  placeholder="Custom"
                  value={slippagePercent}
                  onChange={(e) => setSlippagePercent(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Advanced Options Toggle */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-sm text-blue-400 hover:text-blue-300"
              onClick={() => setAdvancedMode(!advancedMode)}
            >
              {advancedMode ? '▼' : '▶'} Advanced Options
            </button>
          </div>

          {/* Advanced Options */}
          {advancedMode && (
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-3">
              {(operation === 'deposit' || operation === 'add') && (
                <div>
                  <label className="label">Min Token Out (Manual)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Leave empty for auto-calculation"
                    value={minTokenOut}
                    onChange={(e) => setMinTokenOut(e.target.value)}
                  />
                </div>
              )}
              {operation === 'withdraw' && (
                <div>
                  <label className="label">Min SUI Out (Manual)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Leave empty for no minimum"
                    value={minSuiOut}
                    onChange={(e) => setMinSuiOut(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            className="btn btn-primary w-full"
            onClick={handleOperation}
            disabled={loading || !account || !selectedPool || (operation === 'withdraw' && !selectedPool.hasPosition)}
          >
            {loading
              ? 'Processing...'
              : !account
              ? 'Connect Wallet'
              : operation === 'deposit'
              ? selectedPool.hasPosition ? 'Add Liquidity' : 'Create Position'
              : withdrawAll ? 'Close Position' : 'Withdraw Liquidity'}
          </button>

          {/* Info Box */}
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
            <p className="text-xs text-blue-300">
              {operation === 'deposit' && !selectedPool.hasPosition && (
                <>💡 <strong>Create Position:</strong> Deposits SUI, auto-swaps half to tokens, and creates a Momentum position.</>
              )}
              {operation === 'deposit' && selectedPool.hasPosition && (
                <>💡 <strong>Add Liquidity:</strong> Add more SUI to your existing position (auto-swaps and adds).</>
              )}
              {operation === 'withdraw' && withdrawAll && (
                <>⚠️ <strong>Close Position:</strong> Permanently closes the position and returns everything as SUI.</>
              )}
              {operation === 'withdraw' && !withdrawAll && (
                <>💡 <strong>Partial Withdrawal:</strong> Remove some liquidity while keeping the position active.</>
              )}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
