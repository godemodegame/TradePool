# Multi-stage Dockerfile for TradePool Telegram Bot
FROM node:18-alpine AS base

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY apps/telegramBot/package*.json ./apps/telegramBot/
COPY apps/telegramBot/tsconfig.json ./apps/telegramBot/

# Install dependencies
WORKDIR /app/apps/telegramBot
RUN npm ci --only=production

# Development stage
FROM base AS development
WORKDIR /app/apps/telegramBot
RUN npm install
COPY apps/telegramBot ./
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
WORKDIR /app/apps/telegramBot
COPY apps/telegramBot ./
RUN npm install && npm run build

# Production stage
FROM node:18-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app/apps/telegramBot

# Copy package files and install production dependencies
COPY apps/telegramBot/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/apps/telegramBot/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/telegramBot/config ./config

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Expose port (for health checks)
EXPOSE 3000

# Start application
CMD ["node", "dist/index.js"]
