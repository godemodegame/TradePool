#!/bin/bash

# TradePool Environment Setup Helper
# Generates secure values for .env file

set -e

echo "================================"
echo "TradePool .env Setup Helper"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Generate encryption key (exactly 32 characters when base64 decoded)
ENCRYPTION_KEY=$(openssl rand -base64 32 | head -c 32)

# Generate JWT secret (64 character random string)
JWT_SECRET=$(openssl rand -hex 32)

# Generate Redis password
REDIS_PASSWORD=$(openssl rand -hex 16)

# Generate database password
DB_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)

echo -e "${GREEN}Generated secure values:${NC}"
echo ""
echo -e "${YELLOW}ENCRYPTION_KEY:${NC}"
echo "$ENCRYPTION_KEY"
echo ""
echo -e "${YELLOW}JWT_SECRET:${NC}"
echo "$JWT_SECRET"
echo ""
echo -e "${YELLOW}REDIS_PASSWORD:${NC}"
echo "$REDIS_PASSWORD"
echo ""
echo -e "${YELLOW}DB_PASSWORD:${NC}"
echo "$DB_PASSWORD"
echo ""

# Ask if user wants to update .env file
read -p "Do you want to update .env file with these values? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            echo -e "${YELLOW}Creating .env from .env.example...${NC}"
            cp .env.example .env
        else
            echo -e "${RED}Error: .env.example not found!${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Backing up existing .env to .env.backup...${NC}"
        cp .env .env.backup
    fi
    
    # Update .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$ENCRYPTION_KEY|" .env
        sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
        sed -i '' "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=$REDIS_PASSWORD|" .env
        sed -i '' "s|^DB_PASSWORD=.*|DB_PASSWORD=$DB_PASSWORD|" .env
    else
        # Linux
        sed -i "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$ENCRYPTION_KEY|" .env
        sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
        sed -i "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=$REDIS_PASSWORD|" .env
        sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$DB_PASSWORD|" .env
    fi
    
    echo -e "${GREEN}.env file updated successfully!${NC}"
    echo ""
    echo -e "${BLUE}Still need to manually set:${NC}"
    echo "  - TELEGRAM_BOT_TOKEN (get from @BotFather on Telegram)"
    echo "  - TELEGRAM_ADMIN_IDS (get from @userinfobot on Telegram)"
    echo ""
    echo "After deployment, these will be set automatically:"
    echo "  - SUI_PACKAGE_ID"
    echo "  - SUI_REGISTRY_ID"
    echo "  - SUI_ADMIN_CAP_ID"
else
    echo -e "${YELLOW}Copy these values manually to your .env file${NC}"
fi

echo ""
echo -e "${GREEN}Setup complete!${NC}"
