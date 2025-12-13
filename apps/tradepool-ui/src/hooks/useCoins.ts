import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { useEffect, useState } from 'react'
import { CoinStruct } from '@mysten/sui/client'

export function useCoins(coinType: string) {
  const account = useCurrentAccount()
  const client = useSuiClient()
  const [coins, setCoins] = useState<CoinStruct[]>([])
  const [loading, setLoading] = useState(false)
  const [totalBalance, setTotalBalance] = useState('0')

  useEffect(() => {
    if (!account?.address || !coinType) {
      setCoins([])
      setTotalBalance('0')
      return
    }

    const fetchCoins = async () => {
      setLoading(true)
      try {
        const result = await client.getCoins({
          owner: account.address,
          coinType,
        })

        setCoins(result.data)

        // Calculate total balance
        const total = result.data.reduce((sum, coin) => {
          return sum + BigInt(coin.balance)
        }, BigInt(0))
        setTotalBalance(total.toString())
      } catch (error) {
        console.error('Error fetching coins:', error)
        setCoins([])
        setTotalBalance('0')
      } finally {
        setLoading(false)
      }
    }

    fetchCoins()
  }, [account?.address, coinType, client])

  return { coins, loading, totalBalance }
}
