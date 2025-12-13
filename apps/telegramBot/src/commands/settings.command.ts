import TelegramBot from 'node-telegram-bot-api';
import { authMiddleware, errorHandler } from '../middleware';
import { database } from '../database';

export function registerSettingsCommand(bot: TelegramBot): void {
  bot.onText(/\/settings/, async (msg) => {
    await authMiddleware(bot, msg, async () => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;

      if (!userId) return;

      try {
        const user = await database.getUser(userId);
        const settings = user?.settings || {
          slippage_tolerance: 1,
          notifications: { trades: true, price_alerts: true },
        };

        const keyboard: TelegramBot.InlineKeyboardMarkup = {
          inline_keyboard: [
            [
              { text: `Slippage: ${settings.slippage_tolerance}%`, callback_data: 'settings_slippage' },
            ],
            [
              {
                text: `Trade Alerts: ${settings.notifications?.trades ? '✅' : '❌'}`,
                callback_data: 'settings_toggle_trades',
              },
            ],
            [
              {
                text: `Price Alerts: ${settings.notifications?.price_alerts ? '✅' : '❌'}`,
                callback_data: 'settings_toggle_price',
              },
            ],
            [{ text: '🏠 Back to Menu', callback_data: 'settings_back' }],
          ],
        };

        await bot.sendMessage(
          chatId,
          '⚙️ *Settings*\n\nConfigure your preferences:',
          { parse_mode: 'Markdown', reply_markup: keyboard }
        );

      } catch (error) {
        errorHandler(bot, chatId, error);
      }
    });
  });

  bot.on('callback_query', async (query) => {
    if (!query.data?.startsWith('settings_') || !query.message || !query.from) return;

    const chatId = query.message.chat.id;
    const userId = query.from.id;

    await bot.answerCallbackQuery(query.id);

    try {
      if (query.data === 'settings_slippage') {
        await bot.sendMessage(
          chatId,
          '⚙️ Enter new slippage tolerance (0.1 - 50):'
        );
      }

      if (query.data === 'settings_toggle_trades') {
        const user = await database.getUser(userId);
        const currentValue = user?.settings?.notifications?.trades ?? true;

        await database.updateUserSettings(userId, {
          notifications: {
            trades: !currentValue,
            price_alerts: user?.settings?.notifications?.price_alerts ?? true,
          },
        });

        await bot.sendMessage(
          chatId,
          `✅ Trade notifications ${!currentValue ? 'enabled' : 'disabled'}`
        );
      }

      if (query.data === 'settings_toggle_price') {
        const user = await database.getUser(userId);
        const currentValue = user?.settings?.notifications?.price_alerts ?? true;

        await database.updateUserSettings(userId, {
          notifications: {
            trades: user?.settings?.notifications?.trades ?? true,
            price_alerts: !currentValue,
          },
        });

        await bot.sendMessage(
          chatId,
          `✅ Price alerts ${!currentValue ? 'enabled' : 'disabled'}`
        );
      }

      if (query.data === 'settings_back') {
        await bot.sendMessage(chatId, 'Use /menu to return to the main menu.');
      }

    } catch (error) {
      errorHandler(bot, chatId, error);
    }
  });
}
