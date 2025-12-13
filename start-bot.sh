#!/bin/bash

# TradePool Quick Start Script
# This script helps you set up and run the TradePool Telegram Bot

set -e

echo "🌊 TradePool Telegram Bot - Quick Start"
echo "========================================"
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

# Check if .env exists
if [ ! -f ".env" ]; then
    info "Creating .env file from template..."
    cp .env.example .env
    warn ".env file created. Please edit it with your configuration:"
    echo "  - TELEGRAM_BOT_TOKEN (from @BotFather)"
    echo "  - ENCRYPTION_KEY (32 characters)"
    echo "  - SUI_PACKAGE_ID (after contract deployment)"
    echo "  - SUI_REGISTRY_ID (after contract deployment)"
    echo ""
    read -p "Press Enter after you've configured .env..."
fi

# Source .env
source .env

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

# Check Docker
info "Checking Docker..."
if ! command -v docker &> /dev/null; then
    error "Docker is not installed. Please install Docker first."
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed. Please install Docker Compose first."
fi

success "Docker is installed"

# Ask user what to do
echo ""
echo "What would you like to do?"
echo "1) Start all services (bot + database + redis)"
echo "2) Start with pgAdmin (for database management)"
echo "3) Stop all services"
echo "4) View logs"
echo "5) Rebuild and restart"
echo "6) Exit"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        info "Starting all services..."
        docker-compose up -d
        success "Services started!"
        echo ""
        info "Bot is running. Check logs with:"
        echo "  docker-compose logs -f tradepool-bot"
        ;;
    2)
        info "Starting all services with pgAdmin..."
        docker-compose --profile tools up -d
        success "Services started!"
        echo ""
        info "pgAdmin available at: http://localhost:${PGADMIN_PORT:-5050}"
        info "Login: ${PGADMIN_EMAIL:-admin@tradepool.local}"
        info "Password: ${PGADMIN_PASSWORD:-admin}"
        ;;
    3)
        info "Stopping all services..."
        docker-compose down
        success "Services stopped"
        ;;
    4)
        info "Showing logs (Ctrl+C to exit)..."
        docker-compose logs -f
        ;;
    5)
        info "Rebuilding and restarting..."
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        success "Services rebuilt and restarted"
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
echo "🎉 Quick Start Complete!"
echo ""
echo "Useful commands:"
echo "  docker-compose logs -f tradepool-bot  # View bot logs"
echo "  docker-compose ps                     # Check service status"
echo "  docker-compose down                   # Stop services"
echo "  docker-compose restart tradepool-bot  # Restart bot"
echo ""
echo "For more help, see apps/telegramBot/QUICKSTART.md"
echo "========================================"
