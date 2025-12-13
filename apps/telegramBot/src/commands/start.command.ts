import TelegramBot from 'node-telegram-bot-api';
import { walletService } from '../services/wallet.service';
import { errorHandler } from '../middleware';
import logger from '../utils/logger';

export function registerStartCommand(bot: TelegramBot): void {
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    try {
      const hasWallet = await walletService.hasWallet(userId);

      if (hasWallet) {
        const address = await walletService.getWalletAddress(userId);
        await bot.sendMessage(
          chatId,
          `✅ Welcome back to TradePool!\n\n` +
          `Wallet: \`${address}\`\n\n` +
          `Use /menu to access the main menu.`,
          { parse_mode: 'Markdown' }
        );
      } else {
        const keyboard: TelegramBot.InlineKeyboardMarkup = {
          inline_keyboard: [
            [
              { text: '🆕 Create New Wallet', callback_data: 'wallet_create' },
              { text: '📥 Import Wallet', callback_data: 'wallet_import' },
            ],
          ],
        };

        await bot.sendMessage(
          chatId,
          `🌊 *Welcome to TradePool!*\n\n` +
          `TradePool is a liquidity pool platform on Sui blockchain.\n\n` +
          `*Features:*\n` +
          `• 💧 Provide liquidity to pools\n` +
          `• 💱 Trade tokens (admin)\n` +
          `• 📊 Track your positions\n` +
          `• 🔔 Price alerts\n\n` +
          `To get started, create or import a wallet:`,
          {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
          }
        );
      }

      logger.info(`User ${userId} started bot`);
    } catch (error) {
      errorHandler(bot, chatId, error);
    }
  });
}

export function registerWalletCallbacks(bot: TelegramBot): void {
  const userSessions = new Map<number, { step: string; data: any }>();

  bot.on('callback_query', async (query) => {
    if (!query.data || !query.message || !query.from) return;

    const chatId = query.message.chat.id;
    const userId = query.from.id;

    if (query.data === 'wallet_create') {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(
        chatId,
        `🔐 *Create New Wallet*\n\n` +
        `Please create a secure password for your wallet.\n` +
        `This password will be used to encrypt your private key.\n\n` +
        `⚠️ *Important:* Choose a strong password and remember it!\n\n` +
        `Send your password now:`,
        { parse_mode: 'Markdown' }
      );

      userSessions.set(userId, { step: 'awaiting_password_create', data: {} });
    } else if (query.data === 'wallet_import') {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(
        chatId,
        `📥 *Import Wallet*\n\n` +
        `Please send your 12-word recovery phrase.\n\n` +
        `⚠️ *Security Notice:*\n` +
        `• Delete the message immediately after sending\n` +
        `• Only import wallets you trust\n` +
        `• Never share your recovery phrase\n\n` +
        `Send your recovery phrase now:`,
        { parse_mode: 'Markdown' }
      );

      userSessions.set(userId, { step: 'awaiting_mnemonic', data: {} });
    }
  });

  bot.on('message', async (msg) => {
    if (!msg.from || !msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const session = userSessions.get(userId);

    if (!session) return;

    try {
      if (session.step === 'awaiting_password_create') {
        const password = msg.text;

        if (password.length < 8) {
          await bot.sendMessage(
            chatId,
            '⚠️ Password must be at least 8 characters. Please try again:'
          );
          return;
        }

        await bot.sendMessage(chatId, '⏳ Creating your wallet...');

        const { address, mnemonic } = await walletService.createWallet(userId, password);

        await bot.sendMessage(
          chatId,
          `✅ *Wallet Created Successfully!*\n\n` +
          `Address: \`${address}\`\n\n` +
          `⚠️ *IMPORTANT: Backup Your Recovery Phrase*\n\n` +
          `\`${mnemonic}\`\n\n` +
          `Write this down and keep it safe!\n` +
          `This is the ONLY way to recover your wallet.\n\n` +
          `After you've saved it, use /menu to continue.`,
          { parse_mode: 'Markdown' }
        );

        userSessions.delete(userId);
        logger.info(`Wallet created for user ${userId}`);

      } else if (session.step === 'awaiting_mnemonic') {
        const mnemonic = msg.text.trim();

        await bot.sendMessage(
          chatId,
          '🔐 Now create a password to encrypt your wallet:'
        );

        userSessions.set(userId, {
          step: 'awaiting_password_import',
          data: { mnemonic },
        });

      } else if (session.step === 'awaiting_password_import') {
        const password = msg.text;
        const { mnemonic } = session.data;

        if (password.length < 8) {
          await bot.sendMessage(
            chatId,
            '⚠️ Password must be at least 8 characters. Please try again:'
          );
          return;
        }

        await bot.sendMessage(chatId, '⏳ Importing your wallet...');

        const address = await walletService.importWallet(userId, mnemonic, password);

        await bot.sendMessage(
          chatId,
          `✅ *Wallet Imported Successfully!*\n\n` +
          `Address: \`${address}\`\n\n` +
          `Use /menu to access the main menu.`,
          { parse_mode: 'Markdown' }
        );

        userSessions.delete(userId);
        logger.info(`Wallet imported for user ${userId}`);
      }
    } catch (error) {
      errorHandler(bot, chatId, error);
      userSessions.delete(userId);
    }
  });
}
