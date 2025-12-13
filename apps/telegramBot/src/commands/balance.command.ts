import TelegramBot from 'node-telegram-bot-api';
import { authMiddleware, errorHandler } from '../middleware';
import { suiService } from '../services/sui.service';
import { walletService } from '../services/wallet.service';
import { formatSuiAmount } from '../utils/formatting';

export function registerBalanceCommand(bot: TelegramBot): void {
  bot.onText(/\/balance/, async (msg) => {
    await authMiddleware(bot, msg, async () => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;

      if (!userId) return;

      try {
        await bot.sendMessage(chatId, '⏳ Fetching balances...');

        const address = await walletService.getWalletAddress(userId);
        if (!address) {
          await bot.sendMessage(chatId, '❌ Wallet not found.');
          return;
        }

        const walletInfo = await suiService.getWalletInfo(address);

        const suiBalance = formatSuiAmount(walletInfo.sui_balance);

        let message = `💰 *Your Wallet*\n\n`;
        message += `Address: \`${address}\`\n\n`;
        message += `*Balances:*\n`;
        message += `SUI: ${suiBalance}\n`;

        if (walletInfo.tokens.length > 0) {
          message += `\n*Tokens:*\n`;
          for (const token of walletInfo.tokens) {
            const balance = formatSuiAmount(token.balance);
            const symbol = token.symbol || 'Unknown';
            message += `${symbol}: ${balance}\n`;
          }
        }

        const keyboard: TelegramBot.InlineKeyboardMarkup = {
          inline_keyboard: [
            [
              { text: '📊 View Pools', callback_data: 'balance_view_pools' },
              { text: '📜 History', callback_data: 'balance_history' },
            ],
          ],
        };

        await bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });

      } catch (error) {
        errorHandler(bot, chatId, error);
      }
    });
  });
}
