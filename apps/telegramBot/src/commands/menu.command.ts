import TelegramBot from 'node-telegram-bot-api';
import { authMiddleware, errorHandler } from '../middleware';

export function registerMenuCommand(bot: TelegramBot): void {
  bot.onText(/\/menu/, async (msg) => {
    await authMiddleware(bot, msg, async () => {
      const chatId = msg.chat.id;

      const keyboard: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: '📊 My Pools', callback_data: 'menu_pools' },
            { text: '💱 Trade', callback_data: 'menu_trade' },
          ],
          [
            { text: '➕ Add Liquidity', callback_data: 'menu_add_liquidity' },
            { text: '➖ Remove Liquidity', callback_data: 'menu_remove_liquidity' },
          ],
          [
            { text: '💰 Balance', callback_data: 'menu_balance' },
            { text: '📜 History', callback_data: 'menu_history' },
          ],
          [
            { text: '⚙️ Settings', callback_data: 'menu_settings' },
            { text: '❓ Help', callback_data: 'menu_help' },
          ],
        ],
      };

      try {
        await bot.sendMessage(
          chatId,
          `╔════════════════════════════╗\n` +
          `║   🌊 TradePool Dashboard   ║\n` +
          `╚════════════════════════════╝\n\n` +
          `Select an option:`,
          { reply_markup: keyboard }
        );
      } catch (error) {
        errorHandler(bot, chatId, error);
      }
    });
  });

  bot.on('callback_query', async (query) => {
    if (!query.data?.startsWith('menu_') || !query.message) return;

    const chatId = query.message.chat.id;
    await bot.answerCallbackQuery(query.id);

    const action = query.data.replace('menu_', '');

    switch (action) {
      case 'help':
        await bot.sendMessage(
          chatId,
          `📚 *TradePool Help*\n\n` +
          `*Pool Management:*\n` +
          `/pools - View all pools\n` +
          `/pool_info <id> - Pool details\n` +
          `/create_pool - Create pool (admin)\n\n` +
          `*Liquidity:*\n` +
          `/add_liquidity - Add to pool\n` +
          `/remove_liquidity - Withdraw\n` +
          `/my_positions - View LP positions\n\n` +
          `*Trading (Admin):*\n` +
          `/buy - Buy tokens\n` +
          `/sell - Sell tokens\n` +
          `/trade - Interactive trading\n\n` +
          `*Account:*\n` +
          `/balance - Check balances\n` +
          `/history - Transactions\n` +
          `/settings - Preferences\n\n` +
          `*Need help?*\n` +
          `Contact support or visit our docs.`,
          { parse_mode: 'Markdown' }
        );
        break;

      case 'pools':
        await bot.sendMessage(chatId, 'Use /pools to view all available pools.');
        break;

      case 'trade':
        await bot.sendMessage(chatId, 'Use /trade to start trading.');
        break;

      case 'add_liquidity':
        await bot.sendMessage(chatId, 'Use /add_liquidity to add liquidity to a pool.');
        break;

      case 'remove_liquidity':
        await bot.sendMessage(chatId, 'Use /remove_liquidity to withdraw liquidity.');
        break;

      case 'balance':
        await bot.sendMessage(chatId, 'Use /balance to check your wallet balances.');
        break;

      case 'history':
        await bot.sendMessage(chatId, 'Use /history to view your transaction history.');
        break;

      case 'settings':
        await bot.sendMessage(chatId, 'Use /settings to manage your preferences.');
        break;
    }
  });
}
