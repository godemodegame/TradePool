#!/bin/bash

# Script to create a new SUI-only liquidity pool using pool_factory
# Usage: ./scripts/create_pool.sh "Pool Name"

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PACKAGE_ID="0x30c77ff0dab6574c4948b5d0172433954fb665a6ea0bd4ca2341b669324f721c"
REGISTRY_ID="0x95b3116be34791654236e1eae704e032a0d8079e59a467282456d76b822bbe26"
GAS_BUDGET="100000000"

# Check if pool name is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Pool name is required${NC}"
    echo "Usage: $0 \"Pool Name\""
    echo "Example: $0 \"My Awesome Pool\""
    exit 1
fi

POOL_NAME="$1"

echo -e "${YELLOW}Creating new SUI liquidity pool...${NC}"
echo "Pool Name: $POOL_NAME"
echo "Package: $PACKAGE_ID"
echo "Registry: $REGISTRY_ID"
echo ""

# Execute transaction
echo -e "${YELLOW}Executing transaction...${NC}"
sui client call \
  --package "$PACKAGE_ID" \
  --module pool_factory \
  --function create_pool \
  --args "$REGISTRY_ID" "\"$POOL_NAME\"" \
  --gas-budget "$GAS_BUDGET"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Pool created successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Find your pool ID in the transaction output above"
    echo "2. Deposit SUI using: ./scripts/deposit_to_pool.sh <POOL_ID> <AMOUNT_IN_SUI>"
else
    echo -e "${RED}❌ Failed to create pool${NC}"
    exit 1
fi
