export interface Config {
  telegram: {
    botToken: string;
    adminIds: number[];
  };
  sui: {
    rpcUrl: string;
    network: string;
    packageId: string;
    registryId: string;
    adminCapId: string;
  };
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  security: {
    jwtSecret: string;
    encryptionKey: string;
  };
  app: {
    nodeEnv: string;
    port: number;
    logLevel: string;
  };
  explorer: {
    baseUrl: string;
  };
  coingecko?: {
    apiKey: string;
  };
}

export const config: Config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    adminIds: (process.env.TELEGRAM_ADMIN_IDS || '').split(',').map(Number).filter(Boolean),
  },
  sui: {
    rpcUrl: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
    network: process.env.SUI_NETWORK || 'testnet',
    packageId: process.env.SUI_PACKAGE_ID || '',
    registryId: process.env.SUI_REGISTRY_ID || '',
    adminCapId: process.env.SUI_ADMIN_CAP_ID || '',
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || '',
    encryptionKey: process.env.ENCRYPTION_KEY || '',
  },
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  explorer: {
    baseUrl: process.env.EXPLORER_BASE_URL || 'https://suiscan.xyz/testnet/tx/',
  },
  coingecko: {
    apiKey: process.env.COINGECKO_API_KEY,
  },
};

export function validateConfig(): void {
  const required = [
    'telegram.botToken',
    'sui.packageId',
    'sui.registryId',
    'database.url',
    'security.encryptionKey',
  ];

  for (const key of required) {
    const value = key.split('.').reduce((obj, k) => obj?.[k], config as any);
    if (!value) {
      throw new Error(`Missing required config: ${key}`);
    }
  }

  if (config.security.encryptionKey.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters');
  }
}
