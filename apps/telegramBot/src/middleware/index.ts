import TelegramBot from 'node-telegram-bot-api';
import { walletService } from '../services/wallet.service';
import { database } from '../database';
import logger from '../utils/logger';

export async function authMiddleware(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  next: () => void
): Promise<void> {
  const userId = msg.from?.id;
  
  if (!userId) {
    await bot.sendMessage(msg.chat.id, '❌ Unable to identify user');
    return;
  }

  const hasWallet = await walletService.hasWallet(userId);
  
  if (!hasWallet) {
    await bot.sendMessage(
      msg.chat.id,
      '⚠️ Please create or import a wallet first.\n\nUse /start to get started.'
    );
    return;
  }

  await database.updateUserActivity(userId);
  next();
}

export async function adminMiddleware(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  adminIds: number[],
  next: () => void
): Promise<void> {
  const userId = msg.from?.id;

  if (!userId || !adminIds.includes(userId)) {
    await bot.sendMessage(
      msg.chat.id,
      '❌ Access Denied\n\nThis action requires admin privileges.'
    );
    logger.warn(`Unauthorized admin access attempt by user ${userId}`);
    return;
  }

  next();
}

export class RateLimiter {
  private limits: Map<number, { count: number; resetAt: number }>;
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.limits = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  checkLimit(userId: number): boolean {
    const now = Date.now();
    const userLimit = this.limits.get(userId);

    if (!userLimit || now > userLimit.resetAt) {
      this.limits.set(userId, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return true;
    }

    if (userLimit.count >= this.maxRequests) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  reset(userId: number): void {
    this.limits.delete(userId);
  }
}

export const rateLimiter = new RateLimiter();

export function rateLimitMiddleware(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  next: () => void
): void {
  const userId = msg.from?.id;

  if (!userId) {
    return;
  }

  if (!rateLimiter.checkLimit(userId)) {
    bot.sendMessage(
      msg.chat.id,
      '⚠️ Rate limit exceeded. Please wait a moment before trying again.'
    );
    logger.warn(`Rate limit exceeded for user ${userId}`);
    return;
  }

  next();
}

export function errorHandler(
  bot: TelegramBot,
  chatId: number,
  error: any
): void {
  logger.error('Command error:', error);

  let message = '❌ An error occurred. Please try again.';

  if (error.message) {
    if (error.message.includes('Insufficient')) {
      message = '❌ Insufficient balance to complete this transaction.';
    } else if (error.message.includes('slippage')) {
      message = '⚠️ Slippage tolerance exceeded. Try increasing slippage or reducing trade size.';
    } else if (error.message.includes('not found')) {
      message = '❌ Resource not found. Please check your input and try again.';
    }
  }

  bot.sendMessage(chatId, message);
}
