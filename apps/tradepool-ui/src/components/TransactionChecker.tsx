import { useState } from 'react'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { POOL_SUI_DEEP_ID, PACKAGE_ID } from '../types'

export function TransactionChecker() {
  const account = useCurrentAccount()
  const client = useSuiClient()
  const [checking, setChecking] = useState(false)
  const [results, setResults] = useState<any>(null)

  const checkTransactions = async () => {
    if (!account) {
      alert('Please connect your wallet first')
      return
    }

    setChecking(true)
    setResults(null)

    try {
      console.log('\n=== CHECKING YOUR TRANSACTIONS ===')
      console.log('Your address:', account.address)
      console.log('Pool ID:', POOL_SUI_DEEP_ID)
      console.log('Package ID:', PACKAGE_ID)

      // Get transactions from your address
      const txs = await client.queryTransactionBlocks({
        filter: {
          FromAddress: account.address,
        },
        options: {
          showEffects: true,
          showInput: true,
          showEvents: true,
          showObjectChanges: true,
        },
        limit: 20,
      })

      console.log(`Found ${txs.data.length} transactions from your address`)

      // Filter transactions related to our pool
      const poolTxs = txs.data.filter(tx => {
        const input = tx.transaction?.data.transaction
        if (input && 'kind' in input && input.kind === 'ProgrammableTransaction') {
          const commands = input.transactions || []
          return commands.some((cmd: any) => {
            if (cmd.MoveCall) {
              return cmd.MoveCall.package === PACKAGE_ID
            }
            return false
          })
        }
        return false
      })

      console.log(`Found ${poolTxs.length} pool-related transactions`)

      const txResults = poolTxs.map(tx => {
        const createdObjects = tx.effects?.created || []
        const lpReceipts = createdObjects.filter(obj => {
          return obj.owner && typeof obj.owner === 'object' && 'AddressOwner' in obj.owner
        })

        return {
          digest: tx.digest,
          success: tx.effects?.status.status === 'success',
          timestamp: tx.timestampMs,
          createdObjects: createdObjects.length,
          lpReceipts: lpReceipts.map(obj => ({
            id: obj.reference.objectId,
            owner: 'AddressOwner' in obj.owner ? obj.owner.AddressOwner : 'unknown'
          })),
          events: tx.events?.map(e => ({
            type: e.type,
            data: e.parsedJson
          })) || [],
          explorer: `https://suiscan.xyz/testnet/tx/${tx.digest}`
        }
      })

      setResults(txResults)

      console.log('\n=== RESULTS ===')
      txResults.forEach((result, idx) => {
        console.log(`\nTransaction ${idx + 1}:`)
        console.log('- Digest:', result.digest)
        console.log('- Success:', result.success)
        console.log('- Created objects:', result.createdObjects)
        console.log('- LP Receipts:', result.lpReceipts)
        console.log('- Explorer:', result.explorer)
      })

    } catch (error) {
      console.error('Error checking transactions:', error)
      alert('Error: ' + (error as Error).message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4 text-white">🔍 Transaction Checker</h2>

      <p className="text-sm text-gray-400 mb-4">
        Check your recent transactions to see if LP receipts were created
      </p>

      <button
        onClick={checkTransactions}
        disabled={checking || !account}
        className="btn btn-primary w-full mb-4"
      >
        {checking ? 'Checking...' : !account ? 'Connect Wallet' : 'Check My Transactions'}
      </button>

      {results && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-white">
            Found {results.length} pool transaction(s):
          </p>
          {results.map((tx: any, idx: number) => (
            <div key={idx} className="bg-gray-900 rounded-lg p-3 border border-gray-700">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-gray-400">Transaction {idx + 1}</p>
                  <p className={`text-sm font-semibold ${tx.success ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.success ? '✅ Success' : '❌ Failed'}
                  </p>
                </div>
                <a
                  href={tx.explorer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Explorer →
                </a>
              </div>

              <div className="text-xs space-y-1">
                <p className="text-gray-400">
                  Created: {tx.createdObjects} object(s)
                </p>

                {tx.lpReceipts.length > 0 && (
                  <div className="bg-green-900/20 border border-green-700 rounded p-2 mt-2">
                    <p className="text-green-400 font-semibold mb-1">
                      LP Receipts ({tx.lpReceipts.length}):
                    </p>
                    {tx.lpReceipts.map((receipt: any, i: number) => (
                      <div key={i} className="font-mono text-xs text-white break-all">
                        {receipt.id}
                      </div>
                    ))}
                  </div>
                )}

                {tx.events.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-blue-400">
                      Events ({tx.events.length})
                    </summary>
                    <div className="mt-1 space-y-1">
                      {tx.events.map((event: any, i: number) => (
                        <div key={i} className="bg-gray-800 p-1 rounded">
                          <p className="text-gray-300">{event.type.split('::').pop()}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {results && results.length === 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">
            No pool transactions found from your address
          </p>
        </div>
      )}
    </div>
  )
}
