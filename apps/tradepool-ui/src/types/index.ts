export interface PoolInfo {
  id: string;
  name: string;
  tokenType: string;
  suiBalance: string;
  tokenBalance: string;
  totalShares: string;
  momentumPoolId: string;
}

export interface LPReceipt {
  id: string;
  poolId: string;
  tokenType: string;
  shares: string;
}

export const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0x0';
export const REGISTRY_ID = import.meta.env.VITE_REGISTRY_ID || '0x0';
export const ADMIN_CAP_ID = import.meta.env.VITE_ADMIN_CAP_ID || '0x0';
export const CLOCK_ID = '0x6';
export const MOMENTUM_VERSION_ID = import.meta.env.VITE_MOMENTUM_VERSION_ID || '0x0';
export const MOMENTUM_PACKAGE_ID = import.meta.env.VITE_MOMENTUM_PACKAGE_ID || '0x0';

// SUI-DEEP Pool Configuration
export const POOL_SUI_DEEP_ID = import.meta.env.VITE_POOL_SUI_DEEP_ID || '0x0';
export const MOMENTUM_POOL_SUI_DEEP_ID = import.meta.env.VITE_MOMENTUM_POOL_SUI_DEEP_ID || '0x0';
export const TDEEP_COIN_TYPE = import.meta.env.VITE_TDEEP_COIN_TYPE || '0x0';

// Predefined pools for display
export const PREDEFINED_POOLS = [
  {
    id: POOL_SUI_DEEP_ID,
    name: 'SUI-DEEP',
    tokenType: TDEEP_COIN_TYPE,
    momentumPoolId: MOMENTUM_POOL_SUI_DEEP_ID,
  },
];
