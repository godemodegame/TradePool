#!/bin/bash

# Script to deposit SUI to a pool and receive LP tokens
# Usage: ./scripts/deposit_to_pool.sh <POOL_ID> <AMOUNT_IN_SUI>

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
PACKAGE_ID="0x30c77ff0dab6574c4948b5d0172433954fb665a6ea0bd4ca2341b669324f721c"
GAS_BUDGET="100000000"

# Check arguments
if [ -z "$1" ] || [ -z "$2" ]; then
    echo -e "${RED}Error: Missing arguments${NC}"
    echo "Usage: $0 <POOL_ID> <AMOUNT_IN_SUI>"
    echo "Example: $0 0xabc123... 1.5"
    exit 1
fi

POOL_ID="$1"
AMOUNT_SUI="$2"

# Convert SUI to MIST (1 SUI = 1,000,000,000 MIST)
AMOUNT_MIST=$(echo "$AMOUNT_SUI * 1000000000" | bc | cut -d. -f1)

echo -e "${YELLOW}Depositing to pool...${NC}"
echo "Pool ID: $POOL_ID"
echo "Amount: $AMOUNT_SUI SUI ($AMOUNT_MIST MIST)"
echo ""

# Get sender address
SENDER=$(sui client active-address)

# Execute PTB: split coins, deposit, transfer LP token
echo -e "${YELLOW}Executing transaction...${NC}"
sui client ptb \
  --split-coins gas "[$AMOUNT_MIST]" \
  --assign coin \
  --move-call "$PACKAGE_ID::pool_factory::deposit" @"$POOL_ID" coin.0 \
  --assign lp_token \
  --transfer-objects "[lp_token]" @"$SENDER" \
  --gas-budget "$GAS_BUDGET"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Deposit successful!${NC}"
    echo "You received LP tokens representing your share in the pool"
else
    echo -e "${RED}❌ Deposit failed${NC}"
    exit 1
fi
