import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit'
import { CreatePool } from './components/CreatePool'
import { DepositLiquidity } from './components/DepositLiquidity'
import { WithdrawLiquidity } from './components/WithdrawLiquidity'
import { AdminPositions } from './components/AdminPositions'
import { PoolList } from './components/PoolList'
import { PoolInfo } from './components/PoolInfo'

function App() {
  const account = useCurrentAccount()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">TradePool</h1>
              <p className="text-sm text-gray-400">Liquidity Pool Testing Interface</p>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!account ? (
          <div className="card text-center max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4">Welcome to TradePool</h2>
            <p className="text-gray-400 mb-6">
              Connect your Sui wallet to interact with liquidity pools
            </p>
            <ConnectButton className="mx-auto" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pool List */}
            <PoolList />

            {/* Pool Info */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4 text-white">Pool Details</h2>
              <PoolInfo />
            </div>

            {/* Tabs for different operations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create Pool */}
              <div className="card">
                <h2 className="text-xl font-semibold mb-4 text-white">Create Pool</h2>
                <CreatePool />
              </div>

              {/* Deposit Liquidity */}
              <div className="card">
                <h2 className="text-xl font-semibold mb-4 text-white">Deposit Liquidity</h2>
                <DepositLiquidity />
              </div>

              {/* Withdraw Liquidity */}
              <div className="card">
                <h2 className="text-xl font-semibold mb-4 text-white">Withdraw Liquidity</h2>
                <WithdrawLiquidity />
              </div>

              {/* Admin Positions */}
              <div className="card">
                <h2 className="text-xl font-semibold mb-4 text-white">Admin Positions</h2>
                <AdminPositions />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700 mt-12 bg-gray-900/50">
        <div className="container mx-auto px-4 py-6 text-center text-gray-400">
          <p className="text-sm">
            TradePool - Sui Liquidity Pools with Momentum DEX Integration
          </p>
          <p className="text-xs mt-2">
            Testnet Only - Not for Production Use
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
