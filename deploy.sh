#!/bin/bash

# TradePool Deployment Script
# This script builds and publishes the smart contract to Sui network

set -e

echo "================================"
echo "TradePool Deployment Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NETWORK="${SUI_NETWORK:-testnet}"
GAS_BUDGET="${GAS_BUDGET:-500000000}"

# Use system jq instead of npm jq (which may be broken)
if [ -f "/opt/homebrew/bin/jq" ]; then
    JQ="/opt/homebrew/bin/jq"
elif [ -f "/usr/local/bin/jq" ]; then
    JQ="/usr/local/bin/jq"
elif command -v jq &> /dev/null; then
    JQ=$(which jq)
else
    JQ="jq"
fi

echo -e "${YELLOW}Network:${NC} $NETWORK"
echo -e "${YELLOW}Gas Budget:${NC} $GAS_BUDGET"
echo ""

# Check if sui CLI is installed
if ! command -v sui &> /dev/null; then
    echo -e "${RED}Error: sui CLI not found. Please install it first.${NC}"
    echo "Visit: https://docs.sui.io/guides/developer/getting-started/sui-install"
    exit 1
fi

# Get active address
ACTIVE_ADDRESS=$(sui client active-address)
echo -e "${GREEN}Active Address:${NC} $ACTIVE_ADDRESS"
echo ""

# Build the project
echo -e "${YELLOW}Building Move package...${NC}"
sui move build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}Build successful!${NC}"
echo ""

# Publish the package
echo -e "${YELLOW}Publishing package to $NETWORK...${NC}"
echo "This will take a moment..."
echo ""

# Publish and capture output (stderr to /dev/null to avoid mixing with JSON)
PUBLISH_OUTPUT=$(sui client publish --gas-budget $GAS_BUDGET --json 2>/dev/null)

if [ $? -ne 0 ]; then
    echo -e "${RED}Publish failed!${NC}"
    # Re-run without JSON to show error
    sui client publish --gas-budget $GAS_BUDGET
    exit 1
fi

echo -e "${GREEN}Package published successfully!${NC}"
echo ""

# Parse the JSON output to extract important values
PACKAGE_ID=$(echo "$PUBLISH_OUTPUT" | $JQ -r '.objectChanges[] | select(.type == "published") | .packageId')
REGISTRY_ID=$(echo "$PUBLISH_OUTPUT" | $JQ -r '.objectChanges[] | select(.objectType | strings | contains("PoolRegistry")) | .objectId' | head -1)
ADMIN_CAP_ID=$(echo "$PUBLISH_OUTPUT" | $JQ -r '.objectChanges[] | select(.objectType | strings | contains("AdminCap")) | .objectId' | head -1)

echo "================================"
echo "Deployment Results:"
echo "================================"
echo ""
echo -e "${GREEN}Package ID:${NC} $PACKAGE_ID"
echo -e "${GREEN}Registry ID:${NC} $REGISTRY_ID"
echo -e "${GREEN}AdminCap ID:${NC} $ADMIN_CAP_ID"
echo ""

# Save to deployment.json
cat > deployment.json <<EOF
{
  "network": "$NETWORK",
  "packageId": "$PACKAGE_ID",
  "registryId": "$REGISTRY_ID",
  "adminCapId": "$ADMIN_CAP_ID",
  "deployerAddress": "$ACTIVE_ADDRESS",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo -e "${GREEN}Deployment details saved to deployment.json${NC}"
echo ""

# Update .env file
if [ -f .env ]; then
    echo -e "${YELLOW}Updating .env file...${NC}"
    
    # Backup existing .env
    cp .env .env.backup
    echo -e "${GREEN}Backed up .env to .env.backup${NC}"
    
    # Update values using sed
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^SUI_PACKAGE_ID=.*|SUI_PACKAGE_ID=$PACKAGE_ID|" .env
        sed -i '' "s|^SUI_REGISTRY_ID=.*|SUI_REGISTRY_ID=$REGISTRY_ID|" .env
        sed -i '' "s|^SUI_ADMIN_CAP_ID=.*|SUI_ADMIN_CAP_ID=$ADMIN_CAP_ID|" .env
        sed -i '' "s|^SUI_NETWORK=.*|SUI_NETWORK=$NETWORK|" .env
    else
        # Linux
        sed -i "s|^SUI_PACKAGE_ID=.*|SUI_PACKAGE_ID=$PACKAGE_ID|" .env
        sed -i "s|^SUI_REGISTRY_ID=.*|SUI_REGISTRY_ID=$REGISTRY_ID|" .env
        sed -i "s|^SUI_ADMIN_CAP_ID=.*|SUI_ADMIN_CAP_ID=$ADMIN_CAP_ID|" .env
        sed -i "s|^SUI_NETWORK=.*|SUI_NETWORK=$NETWORK|" .env
    fi
    
    echo -e "${GREEN}.env file updated successfully!${NC}"
else
    echo -e "${YELLOW}.env file not found. Creating from .env.example...${NC}"
    
    if [ -f .env.example ]; then
        cp .env.example .env
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^SUI_PACKAGE_ID=.*|SUI_PACKAGE_ID=$PACKAGE_ID|" .env
            sed -i '' "s|^SUI_REGISTRY_ID=.*|SUI_REGISTRY_ID=$REGISTRY_ID|" .env
            sed -i '' "s|^SUI_ADMIN_CAP_ID=.*|SUI_ADMIN_CAP_ID=$ADMIN_CAP_ID|" .env
            sed -i '' "s|^SUI_NETWORK=.*|SUI_NETWORK=$NETWORK|" .env
        else
            sed -i "s|^SUI_PACKAGE_ID=.*|SUI_PACKAGE_ID=$PACKAGE_ID|" .env
            sed -i "s|^SUI_REGISTRY_ID=.*|SUI_REGISTRY_ID=$REGISTRY_ID|" .env
            sed -i "s|^SUI_ADMIN_CAP_ID=.*|SUI_ADMIN_CAP_ID=$ADMIN_CAP_ID|" .env
            sed -i "s|^SUI_NETWORK=.*|SUI_NETWORK=$NETWORK|" .env
        fi
        
        echo -e "${GREEN}.env file created and updated!${NC}"
        echo -e "${YELLOW}Please review .env and fill in remaining values (Telegram bot token, etc.)${NC}"
    else
        echo -e "${RED}.env.example not found!${NC}"
    fi
fi

echo ""
echo "================================"
echo "Next Steps:"
echo "================================"
echo "1. Review the .env file and fill in missing values:"
echo "   - TELEGRAM_BOT_TOKEN (from @BotFather)"
echo "   - TELEGRAM_ADMIN_IDS (from @userinfobot)"
echo "   - ENCRYPTION_KEY (generate with: openssl rand -base64 24)"
echo "   - DB_PASSWORD (strong database password)"
echo "   - JWT_SECRET (random string)"
echo ""
echo "2. View your deployment on Sui Explorer:"
if [ "$NETWORK" = "testnet" ]; then
    echo "   https://suiscan.xyz/testnet/object/$PACKAGE_ID"
elif [ "$NETWORK" = "mainnet" ]; then
    echo "   https://suiscan.xyz/mainnet/object/$PACKAGE_ID"
else
    echo "   https://suiscan.xyz/devnet/object/$PACKAGE_ID"
fi
echo ""
echo "3. Start the application:"
echo "   docker-compose up -d"
echo ""
echo -e "${GREEN}Deployment complete!${NC}"
