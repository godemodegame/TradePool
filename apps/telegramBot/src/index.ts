import dotenv from 'dotenv';
import path from 'path';

// Load .env file BEFORE importing config
// In production: dist/src/index.js -> ../../.env (goes to app root)
// In development: src/index.ts -> ../.env (goes to app root)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import TelegramBot from 'node-telegram-bot-api';
import { config, validateConfig } from '../config';
import { database } from './database';
import logger from './utils/logger';

import { registerStartCommand, registerWalletCallbacks } from './commands/start.command';
import { registerMenuCommand } from './commands/menu.command';
import { registerPoolsCommand } from './commands/pools.command';
import { registerBalanceCommand } from './commands/balance.command';
import { registerLiquidityCommands } from './commands/liquidity.command';
import { registerTradeCommands } from './commands/trade.command';
import { registerHistoryCommand } from './commands/history.command';
import { registerSettingsCommand } from './commands/settings.command';

async function main() {
  try {
    validateConfig();
    logger.info('Configuration validated');

    await database.initialize();
    logger.info('Database initialized');

    const bot = new TelegramBot(config.telegram.botToken, { polling: true });
    logger.info('Bot initialized');

    registerStartCommand(bot);
    registerWalletCallbacks(bot);
    registerMenuCommand(bot);
    registerPoolsCommand(bot);
    registerBalanceCommand(bot);
    registerLiquidityCommands(bot);
    registerTradeCommands(bot);
    registerHistoryCommand(bot);
    registerSettingsCommand(bot);

    bot.on('polling_error', (error) => {
      logger.error('Polling error:', error);
    });

    logger.info('TradePool Telegram Bot is running...');

    process.on('SIGINT', async () => {
      logger.info('Shutting down bot...');
      await bot.stopPolling();
      await database.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down bot...');
      await bot.stopPolling();
      await database.close();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

main();
