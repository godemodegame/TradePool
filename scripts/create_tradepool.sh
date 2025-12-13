#!/bin/bash

# Script to create a new trading pool with Momentum DEX integration
# Usage: ./scripts/create_tradepool.sh <TOKEN_TYPE> <POOL_NAME> <MOMENTUM_POOL_ID>

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PACKAGE_ID="0x30c77ff0dab6574c4948b5d0172433954fb665a6ea0bd4ca2341b669324f721c"
REGISTRY_ID="0x9e0405c2094b6621abcf85051d66634d892101f70540e44bc425f13b490747b6"
GAS_BUDGET="100000000"

# Check arguments
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo -e "${RED}Error: Missing arguments${NC}"
    echo "Usage: $0 <TOKEN_TYPE> <POOL_NAME> <MOMENTUM_POOL_ID>"
    echo ""
    echo "Example for DEEP/SUI pool:"
    echo "$0 \\"
    echo "  \"0x2cee0cb40dcda8dcbed23df9eafdf1638cdc9578380597cd00912bee45d41762::tDEEP::TDEEP\" \\"
    echo "  \"DEEP-SUI\" \\"
    echo "  \"0xaa740e3d58ecfd2323eb5ab4cedab5f07554385d96aea2d5050471aba1e2e0ea\""
    echo ""
    echo -e "${BLUE}Available Momentum testnet pools:${NC}"
    echo "DEEP/SUI: 0xaa740e3d58ecfd2323eb5ab4cedab5f07554385d96aea2d5050471aba1e2e0ea"
    echo "MMT/USDC: 0x53ceda0bbe1bdb3c1c0b1c53ecb49856f135a9fffc91e5a50aa4045a3f8240f7"
    echo "DEEP/USDC: 0xf0d3fa213889a7c2bc79505c030b6a105d549e6608aeab201811af333f9b18a4"
    exit 1
fi

TOKEN_TYPE="$1"
POOL_NAME="$2"
MOMENTUM_POOL_ID="$3"

echo -e "${YELLOW}Creating new trading pool with Momentum DEX integration...${NC}"
echo "Token Type: $TOKEN_TYPE"
echo "Pool Name: $POOL_NAME"
echo "Momentum Pool: $MOMENTUM_POOL_ID"
echo "Package: $PACKAGE_ID"
echo "Registry: $REGISTRY_ID"
echo ""

# Execute transaction
echo -e "${YELLOW}Executing transaction...${NC}"
sui client call \
  --package "$PACKAGE_ID" \
  --module tradepool \
  --function create_pool_public \
  --type-args "$TOKEN_TYPE" \
  --args \
    "$REGISTRY_ID" \
    "\"$POOL_NAME\"" \
    "$MOMENTUM_POOL_ID" \
    "[]" \
  --gas-budget "$GAS_BUDGET"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Trading pool created successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Find your pool ID in the transaction output above"
    echo "2. Deposit SUI to provide liquidity"
    echo "3. Use admin functions to manage Momentum DEX positions"
else
    echo -e "${RED}❌ Failed to create pool${NC}"
    exit 1
fi
