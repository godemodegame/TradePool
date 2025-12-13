import TelegramBot from 'node-telegram-bot-api';
import { authMiddleware, errorHandler } from '../middleware';
import { suiService } from '../services/sui.service';
import { walletService } from '../services/wallet.service';
import { database } from '../database';
import { generateConfirmCode } from '../utils/crypto';
import { formatSuiAmount, parseSuiAmount } from '../utils/formatting';
import logger from '../utils/logger';

interface LiquiditySession {
  step: string;
  poolId?: string;
  tokenType?: string;
  suiAmount?: string;
  tokenAmount?: string;
  password?: string;
  confirmCode?: string;
}

export function registerLiquidityCommands(bot: TelegramBot): void {
  const sessions = new Map<number, LiquiditySession>();

  bot.onText(/\/add_liquidity/, async (msg) => {
    await authMiddleware(bot, msg, async () => {
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
          { text: pool.name, callback_data: `liq_add_pool_${pool.id}` },
        ]);

        const keyboard: TelegramBot.InlineKeyboardMarkup = {
          inline_keyboard: [...buttons, [{ text: '❌ Cancel', callback_data: 'liq_cancel' }]],
        };

        await bot.sendMessage(
          chatId,
          '➕ *Add Liquidity*\n\nSelect a pool:',
          { parse_mode: 'Markdown', reply_markup: keyboard }
        );

      } catch (error) {
        errorHandler(bot, chatId, error);
      }
    });
  });

  bot.onText(/\/remove_liquidity/, async (msg) => {
    await authMiddleware(bot, msg, async () => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;

      if (!userId) return;

      try {
        const address = await walletService.getWalletAddress(userId);
        if (!address) return;

        const receipts = await suiService.getUserLPReceipts(address);

        if (receipts.length === 0) {
          await bot.sendMessage(chatId, '📭 You have no LP positions.');
          return;
        }

        const buttons = receipts.map((receipt, idx) => {
          const sui = formatSuiAmount(receipt.sui_amount);
          const token = formatSuiAmount(receipt.token_amount);
          return [
            { text: `Position ${idx + 1}: ${sui} SUI + ${token} TOKEN`, callback_data: `liq_remove_${receipt.id}` },
          ];
        });

        const keyboard: TelegramBot.InlineKeyboardMarkup = {
          inline_keyboard: [...buttons, [{ text: '❌ Cancel', callback_data: 'liq_cancel' }]],
        };

        await bot.sendMessage(
          chatId,
          '➖ *Remove Liquidity*\n\nSelect position to withdraw:',
          { parse_mode: 'Markdown', reply_markup: keyboard }
        );

      } catch (error) {
        errorHandler(bot, chatId, error);
      }
    });
  });

  bot.on('callback_query', async (query) => {
    if (!query.data?.startsWith('liq_') || !query.message || !query.from) return;

    const chatId = query.message.chat.id;
    const userId = query.from.id;

    await bot.answerCallbackQuery(query.id);

    if (query.data === 'liq_cancel') {
      sessions.delete(userId);
      await bot.sendMessage(chatId, '❌ Operation cancelled.');
      return;
    }

    if (query.data.startsWith('liq_add_pool_')) {
      const poolId = query.data.replace('liq_add_pool_', '');
      const pool = await suiService.getPoolData(poolId);

      if (!pool) {
        await bot.sendMessage(chatId, '❌ Pool not found.');
        return;
      }

      sessions.set(userId, {
        step: 'awaiting_sui_amount',
        poolId: pool.id,
        tokenType: pool.token_type,
      });

      await bot.sendMessage(
        chatId,
        `Selected pool: *${pool.name}*\n\n` +
        `Enter the amount of SUI you want to add:`,
        { parse_mode: 'Markdown' }
      );
    }

    if (query.data.startsWith('liq_remove_')) {
      const receiptId = query.data.replace('liq_remove_', '');

      sessions.set(userId, {
        step: 'awaiting_password_withdraw',
        poolId: receiptId,
      });

      await bot.sendMessage(
        chatId,
        '🔐 Enter your wallet password to confirm withdrawal:'
      );
    }
  });

  bot.on('message', async (msg) => {
    if (!msg.from || !msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const session = sessions.get(userId);

    if (!session) return;

    try {
      if (session.step === 'awaiting_sui_amount') {
        const amount = parseFloat(msg.text);

        if (isNaN(amount) || amount <= 0) {
          await bot.sendMessage(chatId, '⚠️ Invalid amount. Please enter a positive number:');
          return;
        }

        const suiAmount = parseSuiAmount(amount.toString());
        session.suiAmount = suiAmount;
        session.step = 'awaiting_token_amount';

        await bot.sendMessage(
          chatId,
          `SUI amount: ${amount}\n\n` +
          `Now enter the token amount to add:`
        );

      } else if (session.step === 'awaiting_token_amount') {
        const amount = parseFloat(msg.text);

        if (isNaN(amount) || amount <= 0) {
          await bot.sendMessage(chatId, '⚠️ Invalid amount. Please enter a positive number:');
          return;
        }

        const tokenAmount = parseSuiAmount(amount.toString());
        session.tokenAmount = tokenAmount;
        session.step = 'awaiting_password_deposit';

        const suiFormatted = formatSuiAmount(session.suiAmount!);
        const tokenFormatted = formatSuiAmount(tokenAmount);

        await bot.sendMessage(
          chatId,
          `⚠️ *Confirm Deposit*\n\n` +
          `SUI: ${suiFormatted}\n` +
          `Token: ${tokenFormatted}\n\n` +
          `Enter your wallet password to confirm:`,
          { parse_mode: 'Markdown' }
        );

      } else if (session.step === 'awaiting_password_deposit') {
        const password = msg.text;

        await bot.sendMessage(chatId, '⏳ Processing deposit...');

        const keypair = await walletService.getKeypair(userId, password);
        const address = keypair.getPublicKey().toSuiAddress();

        const tx = await suiService.buildDepositTransaction(
          session.poolId!,
          session.suiAmount!,
          session.tokenAmount!,
          session.tokenType!,
          address
        );

        const txHash = await suiService.executeTransaction(tx, keypair);

        await database.createTransaction(
          userId,
          txHash,
          'deposit',
          session.poolId,
          session.suiAmount,
          session.tokenAmount,
          session.tokenType
        );

        await database.updateTransactionStatus(txHash, 'success');

        const explorerUrl = suiService.getExplorerUrl(txHash);

        await bot.sendMessage(
          chatId,
          `✅ *Liquidity Added Successfully!*\n\n` +
          `TX: [View on Explorer](${explorerUrl})\n\n` +
          `You have received an LP receipt NFT.`,
          { parse_mode: 'Markdown' }
        );

        sessions.delete(userId);
        logger.info(`Deposit successful for user ${userId}: ${txHash}`);

      } else if (session.step === 'awaiting_password_withdraw') {
        const password = msg.text;

        await bot.sendMessage(chatId, '⏳ Processing withdrawal...');

        const keypair = await walletService.getKeypair(userId, password);

        const tx = await suiService.buildWithdrawTransaction(
          session.poolId!,
          session.poolId!,
          'UNKNOWN'
        );

        const txHash = await suiService.executeTransaction(tx, keypair);

        await database.createTransaction(
          userId,
          txHash,
          'withdraw',
          session.poolId
        );

        await database.updateTransactionStatus(txHash, 'success');

        const explorerUrl = suiService.getExplorerUrl(txHash);

        await bot.sendMessage(
          chatId,
          `✅ *Liquidity Withdrawn Successfully!*\n\n` +
          `TX: [View on Explorer](${explorerUrl})`,
          { parse_mode: 'Markdown' }
        );

        sessions.delete(userId);
        logger.info(`Withdrawal successful for user ${userId}: ${txHash}`);
      }

    } catch (error) {
      errorHandler(bot, chatId, error);
      sessions.delete(userId);
    }
  });
}
