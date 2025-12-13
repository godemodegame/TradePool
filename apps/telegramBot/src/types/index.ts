export interface User {
  telegram_id: number;
  wallet_address: string;
  encrypted_key: string;
  salt: string;
  iv: string;
  auth_tag: string;
  created_at: Date;
  last_active: Date;
  settings: UserSettings;
}

export interface UserSettings {
  slippage_tolerance: number;
  auto_approve_threshold?: number;
  notifications: {
    trades: boolean;
    price_alerts: boolean;
  };
}

export interface Transaction {
  id: number;
  user_id: number;
  tx_hash: string;
  tx_type: 'deposit' | 'withdraw' | 'buy' | 'sell';
  pool_id: string;
  amount_in?: string;
  amount_out?: string;
  token_type?: string;
  status: 'pending' | 'success' | 'failed';
  created_at: Date;
}

export interface PriceAlert {
  id: number;
  user_id: number;
  pool_id: string;
  condition: 'above' | 'below';
  target_price: string;
  is_active: boolean;
  created_at: Date;
}

export interface PoolData {
  id: string;
  name: string;
  token_type: string;
  sui_reserve: string;
  token_reserve: string;
  lp_supply: string;
  tvl_usd?: number;
  volume_24h_usd?: number;
}

export interface LPReceipt {
  id: string;
  pool_id: string;
  token_type: string;
  sui_amount: string;
  token_amount: string;
  shares: string;
}

export interface TradeQuote {
  input_amount: string;
  output_amount: string;
  price_impact: number;
  minimum_received: string;
  gas_estimate: string;
}

export interface BotSession {
  userId: number;
  state: string;
  data: Record<string, any>;
  expiresAt: number;
}

export interface PendingTransaction {
  userId: number;
  confirmCode: string;
  txData: any;
  expiresAt: number;
}

export interface WalletInfo {
  address: string;
  sui_balance: string;
  tokens: Array<{
    type: string;
    balance: string;
    symbol?: string;
  }>;
}
