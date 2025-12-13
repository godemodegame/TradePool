#!/bin/bash

# Create Pool Script for TradePool
# Usage: ./create-pool.sh <pool_name> <token_type> <momentum_pool_id>

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PACKAGE_ID="${SUI_PACKAGE_ID:-0xb84d9efd7c0259ab2a7c15d90952b80cfb36192037ca6b91cd4f0b8c6087443a}"
REGISTRY_ID="${SUI_REGISTRY_ID:-0x037b729a1d2b26d194d506e1393e393c3a803226e93983a62c4ffb72806319e5}"
NETWORK="${SUI_NETWORK:-testnet}"
GAS_BUDGET="${GAS_BUDGET:-100000000}"

# Default values
DEFAULT_POOL_NAME="SUI-DEEP"
DEFAULT_TOKEN_TYPE="0x2cee0cb40dcda8dcbed23df9eafdf1638cdc9578380597cd00912bee45d41762::tDEEP::TDEEP"
DEFAULT_MOMENTUM_POOL_ID="0xaa740e3d58ecfd2323eb5ab4cedab5f07554385d96aea2d5050471aba1e2e0ea"

# Parse arguments (all optional with defaults)
POOL_NAME="${1:-$DEFAULT_POOL_NAME}"
TOKEN_TYPE="${2:-$DEFAULT_TOKEN_TYPE}"
MOMENTUM_POOL_ID="${3:-$DEFAULT_MOMENTUM_POOL_ID}"

# Display configuration
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Creating TradePool Pool${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Package ID:       $PACKAGE_ID"
echo "  Registry ID:      $REGISTRY_ID"
echo "  Network:          $NETWORK"
echo "  Gas Budget:       $GAS_BUDGET"
echo ""
echo -e "${YELLOW}Pool Parameters:${NC}"
echo "  Pool Name:        $POOL_NAME"
echo "  Token Type:       $TOKEN_TYPE"
echo "  Momentum Pool ID: $MOMENTUM_POOL_ID"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Usage:${NC}"
echo "  $0 [pool_name] [token_type] [momentum_pool_id]"
echo "  All parameters are optional. Defaults shown above."
echo ""

# Confirm
read -p "$(echo -e ${YELLOW}Do you want to proceed? [y/N]: ${NC})" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Creating pool...${NC}"
echo ""

# Execute transaction
sui client call \
    --package "$PACKAGE_ID" \
    --module tradepool \
    --function create_pool_public \
    --args "$REGISTRY_ID" "\"$POOL_NAME\"" "$MOMENTUM_POOL_ID" \
    --type-args "$TOKEN_TYPE" \
    --gas-budget "$GAS_BUDGET" \
    --json

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Pool created successfully!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Note the pool ID from the transaction output above"
    echo "  2. Users can now deposit SUI to provide liquidity"
    echo "  3. Admin can manage Momentum DEX positions"
    echo ""
else
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ Pool creation failed${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi
