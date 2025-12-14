import { useState, useEffect } from 'react'
import { useSignAndExecuteTransaction, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID, CLOCK_ID, MOMENTUM_VERSION_ID } from '../types'

interface PoolOption {
  id: string
  name: string
  tokenType: string
  admin: string
}

export function AdminTrading() {
  const [operation, setOperation] = useState<'deposit' | 'add' | 'withdraw'>('deposit')
  const [pools, setPools] = useState<PoolOption[]>([])
  const [loadingPools, setLoadingPools] = useState(false)
  const [selectedPoolIndex, setSelectedPoolIndex] = useState(-1)
  const [momentumPoolId, setMomentumPoolId] = useState('0xaa740e3d58ecfd2323eb5ab4cedab5f07554385d96aea2d5050471aba1e2e0ea')
  const [suiAmount, setSuiAmount] = useState('')
  const [tickLower, setTickLower] = useState('')
  const [tickUpper, setTickUpper] = useState('')
  const [minTokenOut, setMinTokenOut] = useState('')
  const [minSuiOut, setMinSuiOut] = useState('')
  const [liquidityAmount, setLiquidityAmount] = useState('')
  const [positionId, setPositionId] = useState('')
  const [sqrtPriceLimit, setSqrtPriceLimit] = useState('0')
  const [loading, setLoading] = useState(false)

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

        const poolOptions: PoolOption[] = await Promise.all(
          events.data.map(async (event) => {
            const parsedEvent = event.parsedJson as any
            const poolId = parsedEvent.pool_id
            
            // Fetch pool object to get admin
            try {
              const poolObject = await client.getObject({
                id: poolId,
                options: { showContent: true },
              })
              
              const admin = poolObject.data?.content && 'fields' in poolObject.data.content 
                ? (poolObject.data.content.fields as any).admin 
                : parsedEvent.creator

              return {
                id: poolId,
                name: parsedEvent.pool_name || 'Unknown Pool',
                tokenType: parsedEvent.token_type?.name || '',
                admin: admin,
              }
            } catch {
              return {
                id: poolId,
                name: parsedEvent.pool_name || 'Unknown Pool',
                tokenType: parsedEvent.token_type?.name || '',
                admin: parsedEvent.creator || '',
              }
            }
          })
        )

        setPools(poolOptions)
      } catch (error) {
        console.error('Error fetching pools:', error)
      } finally {
        setLoadingPools(false)
      }
    }

    fetchPools()
  }, [])

  const handleOperation = async () => {
    if (!currentAccount) {
      alert('Please connect your wallet')
      return
    }

    if (!selectedPool) {
      alert('Please select a pool')
      return
    }

    // Check if user is admin
    if (currentAccount.address !== selectedPool.admin) {
      alert('Only the pool admin can perform this operation')
      return
    }

    setLoading(true)

    try {
      const tx = new Transaction()
      const normalizedTokenType = selectedPool.tokenType.replace(/:{3,}/g, '::')

      if (operation === 'deposit') {
        if (!suiAmount || !tickLower || !tickUpper || !minTokenOut) {
          alert('Please fill in all fields for deposit')
          return
        }

        const suiAmountMist = Math.floor(parseFloat(suiAmount) * 1e9)
        const [suiCoin] = tx.splitCoins(tx.gas, [suiAmountMist])

        // Returns (Position, Coin<TOKEN>, Coin<SUI>)
        const [position, tokenRefund, suiRefund] = tx.moveCall({
          target: `${PACKAGE_ID}::tradepool::admin_deposit_sui_simple`,
          arguments: [
            tx.object(selectedPool.id),
            tx.object(momentumPoolId),
            tx.pure.u32(parseInt(tickLower)),
            tx.pure.u32(parseInt(tickUpper)),
            suiCoin,
            tx.pure.u64(parseInt(minTokenOut)),
            tx.pure.u128(sqrtPriceLimit),
            tx.object(CLOCK_ID),
            tx.object(MOMENTUM_VERSION_ID),
          ],
          typeArguments: [normalizedTokenType],
        })

        tx.transferObjects([position, tokenRefund, suiRefund], tx.pure.address(currentAccount.address))
      } else if (operation === 'add') {
        if (!positionId || !suiAmount || !minTokenOut) {
          alert('Please fill in all fields for adding liquidity')
          return
        }

        const suiAmountMist = Math.floor(parseFloat(suiAmount) * 1e9)
        const [suiCoin] = tx.splitCoins(tx.gas, [suiAmountMist])

        const [tokenRefund, suiRefund] = tx.moveCall({
          target: `${PACKAGE_ID}::tradepool::admin_add_sui_to_position`,
          arguments: [
            tx.object(selectedPool.id),
            tx.object(momentumPoolId),
            tx.object(positionId),
            suiCoin,
            tx.pure.u64(parseInt(minTokenOut)),
            tx.pure.u128(sqrtPriceLimit),
            tx.object(CLOCK_ID),
            tx.object(MOMENTUM_VERSION_ID),
          ],
          typeArguments: [normalizedTokenType],
        })

        tx.transferObjects([tokenRefund, suiRefund], tx.pure.address(currentAccount.address))
      } else if (operation === 'withdraw') {
        if (!positionId || !liquidityAmount || !minSuiOut) {
          alert('Please fill in all fields for withdrawal')
          return
        }

        const [suiCoin] = tx.moveCall({
          target: `${PACKAGE_ID}::tradepool::admin_withdraw_to_sui`,
          arguments: [
            tx.object(selectedPool.id),
            tx.object(momentumPoolId),
            tx.object(positionId),
            tx.pure.u128(liquidityAmount),
            tx.pure.u64(parseInt(minSuiOut)),
            tx.pure.u128(sqrtPriceLimit),
            tx.object(CLOCK_ID),
            tx.object(MOMENTUM_VERSION_ID),
          ],
          typeArguments: [normalizedTokenType],
        })

        tx.transferObjects([suiCoin], tx.pure.address(currentAccount.address))
      }

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log('Operation successful:', result)
            alert(`${operation} successful!`)
            setSuiAmount('')
            setMinTokenOut('')
            setMinSuiOut('')
            setLiquidityAmount('')
          },
          onError: (error) => {
            console.error('Error:', error)
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
      {/* Operation Tabs */}
      <div className="flex gap-2">
        <button
          className={`flex-1 btn text-xs ${operation === 'deposit' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setOperation('deposit')}
        >
          Deposit SUI
        </button>
        <button
          className={`flex-1 btn text-xs ${operation === 'add' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setOperation('add')}
        >
          Add Liquidity
        </button>
        <button
          className={`flex-1 btn text-xs ${operation === 'withdraw' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setOperation('withdraw')}
        >
          Withdraw
        </button>
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
              {pool.name} {pool.admin === currentAccount?.address ? '(You are admin)' : ''}
            </option>
          ))}
        </select>
        {selectedPool && currentAccount && selectedPool.admin !== currentAccount.address && (
          <p className="text-xs text-red-400 mt-1">
            ⚠️ You are not the admin of this pool
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
      </div>

      {(operation === 'add' || operation === 'withdraw') && (
        <div>
          <label className="label">Position ID</label>
          <input
            type="text"
            className="input"
            placeholder="0x..."
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
          />
        </div>
      )}

      {operation === 'deposit' && (
        <>
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
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Tick Lower (u32)</label>
              <input
                type="number"
                className="input"
                placeholder="443580"
                value={tickLower}
                onChange={(e) => setTickLower(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Tick Upper (u32)</label>
              <input
                type="number"
                className="input"
                placeholder="443640"
                value={tickUpper}
                onChange={(e) => setTickUpper(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Min Token Out</label>
            <input
              type="number"
              className="input"
              placeholder="0"
              value={minTokenOut}
              onChange={(e) => setMinTokenOut(e.target.value)}
            />
          </div>
        </>
      )}

      {operation === 'add' && (
        <>
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
          </div>

          <div>
            <label className="label">Min Token Out</label>
            <input
              type="number"
              className="input"
              placeholder="0"
              value={minTokenOut}
              onChange={(e) => setMinTokenOut(e.target.value)}
            />
          </div>
        </>
      )}

      {operation === 'withdraw' && (
        <>
          <div>
            <label className="label">Liquidity Amount (u128)</label>
            <input
              type="text"
              className="input"
              placeholder="1000000"
              value={liquidityAmount}
              onChange={(e) => setLiquidityAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Min SUI Out</label>
            <input
              type="number"
              className="input"
              placeholder="0"
              value={minSuiOut}
              onChange={(e) => setMinSuiOut(e.target.value)}
            />
          </div>
        </>
      )}

      <div>
        <label className="label">Sqrt Price Limit</label>
        <input
          type="text"
          className="input"
          placeholder="0"
          value={sqrtPriceLimit}
          onChange={(e) => setSqrtPriceLimit(e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">
          Use 0 for no limit
        </p>
      </div>

      <button
        className="btn btn-primary w-full"
        onClick={handleOperation}
        disabled={loading || !selectedPool || !currentAccount}
      >
        {loading ? 'Processing...' : `Execute ${operation}`}
      </button>

      <p className="text-xs text-gray-500">
        ⚠️ Admin only: Only pool admin can manage Momentum positions
      </p>
    </div>
  )
}
