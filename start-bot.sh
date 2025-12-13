#!/bin/bash

# TradePool Quick Start Script
# This script helps you set up and run the TradePool Telegram Bot natively

set -e

echo "🌊 TradePool Telegram Bot - Quick Start (Native)"
echo "================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

# Check if bot's .env exists
if [ ! -f "apps/telegramBot/.env" ]; then
    info "Creating .env file from template..."
    if [ -f "apps/telegramBot/.env.example" ]; then
        cp apps/telegramBot/.env.example apps/telegramBot/.env
    else
        # Fallback to root .env.example
        cp .env.example apps/telegramBot/.env
    fi
    warn ".env file created at apps/telegramBot/.env"
    warn "Please edit it with your configuration:"
    echo "  - TELEGRAM_BOT_TOKEN (from @BotFather)"
    echo "  - ENCRYPTION_KEY (32 characters)"
    echo "  - SUI_PACKAGE_ID (after contract deployment)"
    echo "  - SUI_REGISTRY_ID (after contract deployment)"
    echo ""
    read -p "Press Enter after you've configured apps/telegramBot/.env..."
fi

# Source bot's .env
if [ -f "apps/telegramBot/.env" ]; then
    source apps/telegramBot/.env
else
    warn "No .env file found in apps/telegramBot/"
fi

# Validate required variables
info "Checking configuration..."

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    error "TELEGRAM_BOT_TOKEN is not set in .env"
fi

if [ -z "$ENCRYPTION_KEY" ]; then
    error "ENCRYPTION_KEY is not set in .env"
fi

if [ ${#ENCRYPTION_KEY} -ne 32 ]; then
    error "ENCRYPTION_KEY must be exactly 32 characters"
fi

success "Configuration looks good"

# Check Node.js
info "Checking Node.js..."
if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js 18+ first."
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    error "Node.js version 18+ is required. Found: $(node -v)"
fi

success "Node.js $(node -v) is installed"

# Check npm
if ! command -v npm &> /dev/null; then
    error "npm is not installed. Please install npm first."
fi

success "npm $(npm -v) is installed"

# Navigate to bot directory
cd apps/telegramBot

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    info "Installing dependencies..."
    npm install
    success "Dependencies installed"
else
    info "Dependencies already installed (skipping npm install)"
fi

# Check if dist directory exists
if [ ! -d "dist" ]; then
    info "Building TypeScript project..."
    npm run build
    success "Build complete"
fi

# Ask user what to do
echo ""
echo "What would you like to do?"
echo "1) Start bot (production mode)"
echo "2) Start bot (development mode with auto-reload)"
echo "3) Rebuild and start"
echo "4) Install/update dependencies"
echo "5) View logs"
echo "6) Exit"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        info "Starting bot in production mode..."
        if [ ! -d "dist" ]; then
            info "Building project first..."
            npm run build
        fi
        npm start
        ;;
    2)
        info "Starting bot in development mode..."
        npm run dev
        ;;
    3)
        info "Rebuilding and starting..."
        npm run build
        npm start
        ;;
    4)
        info "Installing/updating dependencies..."
        npm install
        success "Dependencies updated"
        echo ""
        read -p "Press Enter to return to menu or Ctrl+C to exit..."
        exec "$0"
        ;;
    5)
        info "Viewing logs..."
        if [ -d "logs" ]; then
            tail -f logs/combined.log
        else
            warn "No logs directory found. Logs will appear in console when bot starts."
        fi
        ;;
    6)
        info "Exiting..."
        exit 0
        ;;
    *)
        error "Invalid choice"
        ;;
esac

echo ""
echo "========================================"
echo "🎉 Bot Started!"
echo ""
echo "Useful commands:"
echo "  npm start              # Start bot (production)"
echo "  npm run dev            # Start with auto-reload"
echo "  npm run build          # Build TypeScript"
echo "  npm test               # Run tests"
echo ""
echo "For more help, see apps/telegramBot/QUICKSTART.md"
echo "========================================"
