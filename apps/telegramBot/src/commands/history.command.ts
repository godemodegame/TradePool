import TelegramBot from 'node-telegram-bot-api';
import { authMiddleware, errorHandler } from '../middleware';
import { database } from '../database';
import { formatTimestamp, shortenAddress } from '../utils/formatting';

export function registerHistoryCommand(bot: TelegramBot): void {
  bot.onText(/\/history/, async (msg) => {
    await authMiddleware(bot, msg, async () => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;

      if (!userId) return;

      try {
        const transactions = await database.getUserTransactions(userId, 10);

        if (transactions.length === 0) {
          await bot.sendMessage(chatId, '📭 No transaction history found.');
          return;
        }

        let message = '📜 *Transaction History*\n\n';

        for (const tx of transactions) {
          const icon = tx.tx_type === 'deposit' ? '➕' : tx.tx_type === 'withdraw' ? '➖' : '💱';
          const status = tx.status === 'success' ? '✅' : tx.status === 'pending' ? '⏳' : '❌';

          message += `${icon} ${tx.tx_type.toUpperCase()} ${status}\n`;
          message += `TX: \`${shortenAddress(tx.tx_hash)}\`\n`;
          message += `Time: ${formatTimestamp(tx.created_at)}\n`;

          if (tx.amount_in) {
            message += `Amount: ${tx.amount_in}\n`;
          }

          message += '\n';
        }

        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

      } catch (error) {
        errorHandler(bot, chatId, error);
      }
    });
  });
}
