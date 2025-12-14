import { useState } from 'react'
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID, REGISTRY_ID } from '../types'

// Popular token presets with their Momentum pool IDs
const TOKEN_PRESETS = [
  {
    name: 'DEEP',
    symbol: 'DEEP',
    type: '0x2cee0cb40dcda8dcbed23df9eafdf1638cdc9578380597cd00912bee45d41762::tDEEP::TDEEP',
    momentumPoolId: '0xaa740e3d58ecfd2323eb5ab4cedab5f07554385d96aea2d5050471aba1e2e0ea',
  },
  {
    name: 'Custom Token',
    symbol: 'CUSTOM',
    type: '',
    momentumPoolId: '',
  },
]

export function CreatePool() {
  const [selectedPreset, setSelectedPreset] = useState(0)
  const [poolName, setPoolName] = useState('')
  const [customTokenType, setCustomTokenType] = useState('')
  const [customMomentumPoolId, setCustomMomentumPoolId] = useState('')
  const [advancedMode, setAdvancedMode] = useState(false)
  const [adminAddress, setAdminAddress] = useState('')
  const [loading, setLoading] = useState(false)

  const { mutate: signAndExecute } = useSignAndExecuteTransaction()
  const currentAccount = useCurrentAccount()

  const selectedToken = TOKEN_PRESETS[selectedPreset]
  const isCustomToken = selectedToken.symbol === 'CUSTOM'

  const effectiveTokenType = isCustomToken ? customTokenType : selectedToken.type
  const effectiveMomentumPoolId = isCustomToken ? customMomentumPoolId : selectedToken.momentumPoolId
  const effectivePoolName = poolName || `SUI-${selectedToken.symbol}`

  const handleCreatePool = async () => {
    if (!currentAccount) {
      alert('Please connect your wallet')
      return
    }

    if (!effectivePoolName || !effectiveTokenType || !effectiveMomentumPoolId) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      const tx = new Transaction()

      // Normalize token type
      const normalizedTokenType = effectiveTokenType.replace(/:{3,}/g, '::')

      // Convert pool name to bytes
      const nameBytes = Array.from(new TextEncoder().encode(effectivePoolName))

      // Build admin option
      const adminOption = adminAddress.trim()
        ? tx.pure.option('address', adminAddress.trim())
        : tx.pure.option('address', null)

      tx.moveCall({
        target: `${PACKAGE_ID}::tradepool::create_pool_public`,
        arguments: [
          tx.object(REGISTRY_ID),
          tx.pure.vector('u8', nameBytes),
          tx.pure.address(effectiveMomentumPoolId),
          adminOption,
        ],
        typeArguments: [normalizedTokenType],
      })

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log('Pool created successfully:', result)
            alert(`Pool "${effectivePoolName}" created successfully!\n\nTransaction: ${result.digest}`)
            setPoolName('')
            setCustomTokenType('')
            setCustomMomentumPoolId('')
            setAdminAddress('')
            setSelectedPreset(0)
            setAdvancedMode(false)
          },
          onError: (error) => {
            console.error('Error creating pool:', error)
            alert('Error creating pool: ' + error.message)
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
      {/* Token Selection */}
      <div>
        <label className="label">Select Token</label>
        <select
          className="input"
          value={selectedPreset}
          onChange={(e) => setSelectedPreset(Number(e.target.value))}
        >
          {TOKEN_PRESETS.map((preset, index) => (
            <option key={index} value={index}>
              {preset.name}
            </option>
          ))}
        </select>
      </div>

      {/* Pool Name */}
      <div>
        <label className="label">Pool Name (Optional)</label>
        <input
          type="text"
          className="input"
          placeholder={`Default: SUI-${selectedToken.symbol}`}
          value={poolName}
          onChange={(e) => setPoolName(e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">
          Leave empty to use: "{effectivePoolName}"
        </p>
      </div>

      {/* Custom Token Fields */}
      {isCustomToken && (
        <>
          <div>
            <label className="label">Token Type</label>
            <input
              type="text"
              className="input"
              placeholder="0x...::module::TOKEN"
              value={customTokenType}
              onChange={(e) => setCustomTokenType(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Full token type path (e.g., 0xABC...::token::TOKEN)
            </p>
          </div>

          <div>
            <label className="label">Momentum Pool ID</label>
            <input
              type="text"
              className="input"
              placeholder="0x..."
              value={customMomentumPoolId}
              onChange={(e) => setCustomMomentumPoolId(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Momentum DEX pool ID for this token pair
            </p>
          </div>
        </>
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
          <div>
            <label className="label">Custom Admin Address (Optional)</label>
            <input
              type="text"
              className="input"
              placeholder="0x... (leave empty to use your address)"
              value={adminAddress}
              onChange={(e) => setAdminAddress(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to make yourself the pool admin
            </p>
          </div>

          {!isCustomToken && (
            <div className="bg-blue-900/20 border border-blue-700 rounded p-3">
              <p className="text-xs text-blue-300 font-semibold mb-1">Token Details:</p>
              <p className="text-xs text-gray-400 font-mono break-all mb-2">
                Type: {selectedToken.type}
              </p>
              <p className="text-xs text-gray-400 font-mono break-all">
                Momentum Pool: {selectedToken.momentumPoolId}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
        <p className="text-xs text-gray-400 mb-2">Preview:</p>
        <p className="text-sm text-white font-semibold">
          Pool Name: {effectivePoolName}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Token: {selectedToken.name}
        </p>
        <p className="text-xs text-gray-400">
          Admin: {adminAddress || 'You (current wallet)'}
        </p>
      </div>

      {/* Create Button */}
      <button
        className="btn btn-primary w-full"
        onClick={handleCreatePool}
        disabled={loading || !currentAccount || (!effectiveTokenType || !effectiveMomentumPoolId)}
      >
        {loading ? 'Creating...' : !currentAccount ? 'Connect Wallet' : 'Create Pool'}
      </button>

      {/* Info */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
        <p className="text-xs text-blue-300">
          💡 <strong>Quick Start:</strong> Select a token from the dropdown and click "Create Pool".
          The pool name will be auto-generated as "SUI-{selectedToken.symbol}".
        </p>
      </div>
    </div>
  )
}
