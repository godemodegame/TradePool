import TelegramBot from 'node-telegram-bot-api';
import { authMiddleware, adminMiddleware, errorHandler } from '../middleware';
import { suiService } from '../services/sui.service';
import { walletService } from '../services/wallet.service';
import { database } from '../database';
import { config } from '../../config';
import { formatSuiAmount, parseSuiAmount, formatPercentage } from '../utils/formatting';
import logger from '../utils/logger';

interface TradeSession {
  step: string;
  poolId?: string;
  tokenType?: string;
  action?: 'buy' | 'sell';
  amount?: string;
  quote?: any;
  password?: string;
}

export function registerTradeCommands(bot: TelegramBot): void {
  const sessions = new Map<number, TradeSession>();

  bot.onText(/\/trade/, async (msg) => {
    await authMiddleware(bot, msg, async () => {
      await adminMiddleware(bot, msg, config.telegram.adminIds, async () => {
        const chatId = msg.chat.id;
        const userId = msg.from?.id;

        if (!userId) return;

        try {
          const pools = await suiService.getAllPools();

          if (pools.length === 0) {
            await bot.sendMessage(chatId, '📭 No pools available.');
            return;
          }

          const buttons = pools.map(pool => [
            { text: pool.name, callback_data: `trade_pool_${pool.id}` },
          ]);

          const keyboard: TelegramBot.InlineKeyboardMarkup = {
            inline_keyboard: [...buttons, [{ text: '❌ Cancel', callback_data: 'trade_cancel' }]],
          };

          await bot.sendMessage(
            chatId,
            '💱 *Trade*\n\nSelect a pool:',
            { parse_mode: 'Markdown', reply_markup: keyboard }
          );

        } catch (error) {
          errorHandler(bot, chatId, error);
        }
      });
    });
  });

  bot.on('callback_query', async (query) => {
    if (!query.data?.startsWith('trade_') || !query.message || !query.from) return;

    const chatId = query.message.chat.id;
    const userId = query.from.id;

    await bot.answerCallbackQuery(query.id);

    if (query.data === 'trade_cancel') {
      sessions.delete(userId);
      await bot.sendMessage(chatId, '❌ Trade cancelled.');
      return;
    }

    if (query.data.startsWith('trade_pool_')) {
      const poolId = query.data.replace('trade_pool_', '');
      const pool = await suiService.getPoolData(poolId);

      if (!pool) {
        await bot.sendMessage(chatId, '❌ Pool not found.');
        return;
      }

      sessions.set(userId, {
        step: 'awaiting_action',
        poolId: pool.id,
        tokenType: pool.token_type,
      });

      const keyboard: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: '🟢 Buy Token', callback_data: 'trade_action_buy' },
            { text: '🔴 Sell Token', callback_data: 'trade_action_sell' },
          ],
          [{ text: '❌ Cancel', callback_data: 'trade_cancel' }],
        ],
      };

      await bot.sendMessage(
        chatId,
        `Selected pool: *${pool.name}*\n\nWhat would you like to do?`,
        { parse_mode: 'Markdown', reply_markup: keyboard }
      );
    }

    if (query.data === 'trade_action_buy') {
      const session = sessions.get(userId);
      if (!session) return;

      session.action = 'buy';
      session.step = 'awaiting_amount';

      await bot.sendMessage(
        chatId,
        `🟢 *Buy Token*\n\nEnter the amount of SUI to spend:`,
        { parse_mode: 'Markdown' }
      );
    }

    if (query.data === 'trade_action_sell') {
      const session = sessions.get(userId);
      if (!session) return;

      session.action = 'sell';
      session.step = 'awaiting_amount';

      await bot.sendMessage(
        chatId,
        `🔴 *Sell Token*\n\nEnter the amount of tokens to sell:`,
        { parse_mode: 'Markdown' }
      );
    }

    if (query.data === 'trade_confirm_yes') {
      const session = sessions.get(userId);
      if (!session || session.step !== 'awaiting_confirmation') return;

      session.step = 'awaiting_password';

      await bot.sendMessage(chatId, '🔐 Enter your wallet password to confirm trade:');
    }

    if (query.data === 'trade_confirm_no') {
      sessions.delete(userId);
      await bot.sendMessage(chatId, '❌ Trade cancelled.');
    }
  });

  bot.on('message', async (msg) => {
    if (!msg.from || !msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const session = sessions.get(userId);

    if (!session) return;

    try {
      if (session.step === 'awaiting_amount') {
        const amount = parseFloat(msg.text);

        if (isNaN(amount) || amount <= 0) {
          await bot.sendMessage(chatId, '⚠️ Invalid amount. Please enter a positive number:');
          return;
        }

        const parsedAmount = parseSuiAmount(amount.toString());
        session.amount = parsedAmount;

        const pool = await suiService.getPoolData(session.poolId!);
        if (!pool) {
          await bot.sendMessage(chatId, '❌ Pool not found.');
          sessions.delete(userId);
          return;
        }

        const user = await database.getUser(userId);
        const slippage = user?.settings?.slippage_tolerance || 1;

        let quote;
        if (session.action === 'buy') {
          quote = suiService.calculateBuyQuote(
            parsedAmount,
            pool.sui_reserve,
            pool.token_reserve,
            slippage
          );
        } else {
          quote = suiService.calculateSellQuote(
            parsedAmount,
            pool.sui_reserve,
            pool.token_reserve,
            slippage
          );
        }

        session.quote = quote;
        session.step = 'awaiting_confirmation';

        const inputFormatted = formatSuiAmount(quote.input_amount);
        const outputFormatted = formatSuiAmount(quote.output_amount);
        const minReceived = formatSuiAmount(quote.minimum_received);

        const keyboard: TelegramBot.InlineKeyboardMarkup = {
          inline_keyboard: [
            [
              { text: '✅ Confirm', callback_data: 'trade_confirm_yes' },
              { text: '❌ Cancel', callback_data: 'trade_confirm_no' },
            ],
          ],
        };

        await bot.sendMessage(
          chatId,
          `⚠️ *Confirm Trade*\n\n` +
          `Type: ${session.action === 'buy' ? '🟢 BUY' : '🔴 SELL'}\n` +
          `Input: ${inputFormatted} ${session.action === 'buy' ? 'SUI' : 'TOKEN'}\n` +
          `Expected Output: ${outputFormatted} ${session.action === 'buy' ? 'TOKEN' : 'SUI'}\n` +
          `Price Impact: ${formatPercentage(quote.price_impact)}\n` +
          `Slippage Tolerance: ${formatPercentage(slippage)}\n` +
          `Minimum Received: ${minReceived}\n\n` +
          `Proceed with trade?`,
          { parse_mode: 'Markdown', reply_markup: keyboard }
        );

      } else if (session.step === 'awaiting_password') {
        const password = msg.text;

        await bot.sendMessage(chatId, '⏳ Executing trade...');

        const keypair = await walletService.getKeypair(userId, password);
        const address = keypair.getPublicKey().toSuiAddress();

        let tx;
        if (session.action === 'buy') {
          tx = await suiService.buildAdminBuyTransaction(
            session.poolId!,
            session.amount!,
            session.quote.minimum_received,
            session.tokenType!
          );
        } else {
          tx = await suiService.buildAdminSellTransaction(
            session.poolId!,
            session.amount!,
            session.quote.minimum_received,
            session.tokenType!,
            address
          );
        }

        const txHash = await suiService.executeTransaction(tx, keypair);

        await database.createTransaction(
          userId,
          txHash,
          session.action!,
          session.poolId,
          session.amount,
          session.quote.output_amount,
          session.tokenType
        );

        await database.updateTransactionStatus(txHash, 'success');

        const explorerUrl = suiService.getExplorerUrl(txHash);
        const outputFormatted = formatSuiAmount(session.quote.output_amount);

        await bot.sendMessage(
          chatId,
          `✅ *Trade Successful!*\n\n` +
          `${session.action === 'buy' ? 'Bought' : 'Sold'}: ${outputFormatted} ` +
          `${session.action === 'buy' ? 'TOKEN' : 'SUI'}\n\n` +
          `TX: [View on Explorer](${explorerUrl})`,
          { parse_mode: 'Markdown' }
        );

        sessions.delete(userId);
        logger.info(`Trade successful for user ${userId}: ${txHash}`);
      }

    } catch (error) {
      errorHandler(bot, chatId, error);
      sessions.delete(userId);
    }
  });
}
