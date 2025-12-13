import TelegramBot from 'node-telegram-bot-api';
import { authMiddleware, errorHandler } from '../middleware';
import { suiService } from '../services/sui.service';
import { formatSuiAmount, formatUSD, shortenAddress } from '../utils/formatting';

export function registerPoolsCommand(bot: TelegramBot): void {
  bot.onText(/\/pools/, async (msg) => {
    await authMiddleware(bot, msg, async () => {
      const chatId = msg.chat.id;

      try {
        await bot.sendMessage(chatId, '⏳ Fetching pools...');

        const pools = await suiService.getAllPools();

        if (pools.length === 0) {
          await bot.sendMessage(
            chatId,
            '📭 No pools found.\n\nPools will appear here once created.'
          );
          return;
        }

        let message = '🌊 *Available Pools*\n\n';

        for (const pool of pools) {
          const suiReserve = formatSuiAmount(pool.sui_reserve);
          const tokenReserve = formatSuiAmount(pool.token_reserve);
          const tvl = pool.tvl_usd ? formatUSD(pool.tvl_usd) : 'N/A';

          message += `🔵 *${pool.name}*\n`;
          message += `Pool ID: \`${shortenAddress(pool.id)}\`\n`;
          message += `SUI Reserve: ${suiReserve}\n`;
          message += `Token Reserve: ${tokenReserve}\n`;
          message += `TVL: ${tvl}\n`;
          message += `\n`;

          const keyboard: TelegramBot.InlineKeyboardMarkup = {
            inline_keyboard: [
              [
                { text: '📊 Details', callback_data: `pool_details_${pool.id}` },
                { text: '➕ Add Liquidity', callback_data: `pool_add_${pool.id}` },
              ],
            ],
          };

          await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
          });

          message = '';
        }

      } catch (error) {
        errorHandler(bot, chatId, error);
      }
    });
  });

  bot.on('callback_query', async (query) => {
    if (!query.data || !query.message) return;

    const chatId = query.message.chat.id;

    if (query.data.startsWith('pool_details_')) {
      const poolId = query.data.replace('pool_details_', '');
      await bot.answerCallbackQuery(query.id);

      try {
        const pool = await suiService.getPoolData(poolId);

        if (!pool) {
          await bot.sendMessage(chatId, '❌ Pool not found.');
          return;
        }

        const suiReserve = formatSuiAmount(pool.sui_reserve);
        const tokenReserve = formatSuiAmount(pool.token_reserve);
        const lpSupply = formatSuiAmount(pool.lp_supply);

        await bot.sendMessage(
          chatId,
          `📊 *Pool Details*\n\n` +
          `*Name:* ${pool.name}\n` +
          `*Pool ID:* \`${pool.id}\`\n` +
          `*Token Type:* \`${shortenAddress(pool.token_type)}\`\n\n` +
          `*Reserves:*\n` +
          `SUI: ${suiReserve}\n` +
          `Token: ${tokenReserve}\n\n` +
          `*LP Supply:* ${lpSupply}\n`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        errorHandler(bot, chatId, error);
      }
    }
  });
}
