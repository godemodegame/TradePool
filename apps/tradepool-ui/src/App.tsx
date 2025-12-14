import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit'
import { CreatePool } from './components/CreatePool'
import { DepositLiquidity } from './components/DepositLiquidity'
import { WithdrawLiquidity } from './components/WithdrawLiquidity'
import { AdminPositions } from './components/AdminPositions'
import { PoolList } from './components/PoolList'
import { PoolInfo } from './components/PoolInfo'
import BackgroundEffects from './components/BackgroundEffects'

function App() {
  const account = useCurrentAccount()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background Effects */}
      <BackgroundEffects />
      
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo with glow effect */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl blur-md opacity-50"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  <span className="gradient-text">TradePool</span>
                </h1>
                <p className="text-xs text-gray-400 -mt-0.5">Liquidity Protocol</p>
              </div>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!account ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <div className="card-glow text-center max-w-lg w-full animate-glow-pulse">
              {/* Logo with enhanced glow */}
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-3xl blur-2xl opacity-50 animate-pulse-slow"></div>
                  <div className="relative w-20 h-20 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Title with glow effect */}
              <h2 className="text-4xl font-bold mb-3">
                <span className="text-white">Welcome to</span>
                <br />
                <span className="gradient-text-glow text-5xl">TradePool</span>
              </h2>
              
              {/* Description */}
              <p className="text-gray-300 mb-10 text-base leading-relaxed">
                Connect your Sui wallet to access decentralized liquidity pools<br />
                <span className="text-sm text-gray-400">Powered by Momentum DEX v3</span>
              </p>
              
              {/* Connect Button with enhanced styling */}
              <div className="flex justify-center">
                <ConnectButton className="btn-hero" />
              </div>

              {/* Decorative elements */}
              <div className="mt-8 pt-8 border-t border-white/10">
                <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                    <span>Testnet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    <span>Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pool List */}
            <PoolList />

            {/* Pool Info */}
            <div className="card-glow">
              <h2 className="text-xl font-semibold mb-4 gradient-text">Pool Details</h2>
              <PoolInfo />
            </div>

            {/* Tabs for different operations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create Pool */}
              <div className="card-glow">
                <h2 className="text-xl font-semibold mb-4 gradient-text">Create Pool</h2>
                <CreatePool />
              </div>

              {/* Deposit Liquidity */}
              <div className="card-glow">
                <h2 className="text-xl font-semibold mb-4 gradient-text">Deposit Liquidity</h2>
                <DepositLiquidity />
              </div>

              {/* Withdraw Liquidity */}
              <div className="card-glow">
                <h2 className="text-xl font-semibold mb-4 gradient-text">Withdraw Liquidity</h2>
                <WithdrawLiquidity />
              </div>

              {/* Admin Positions */}
              <div className="card-glow">
                <h2 className="text-xl font-semibold mb-4 gradient-text">Admin Positions</h2>
                <AdminPositions />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12 bg-slate-900/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-sm text-gray-400">
            Powered by <span className="gradient-text font-semibold">Momentum DEX</span>
          </p>
          <p className="text-xs mt-2 text-gray-500">
            Testnet Only • Not for Production Use
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
            <span>v0.2.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
