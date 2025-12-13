#!/bin/bash

# TradePool Telegram Bot - Setup Verification Script
# This script checks if all dependencies and configuration are correct

set -e

echo "🔍 TradePool Telegram Bot - Setup Verification"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check Node.js version
echo "Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        check_pass "Node.js $(node -v) installed"
    else
        check_fail "Node.js 18+ required, found $(node -v)"
    fi
else
    check_fail "Node.js not found"
fi

# Check npm
echo "Checking npm..."
if command -v npm &> /dev/null; then
    check_pass "npm $(npm -v) installed"
else
    check_fail "npm not found"
fi

# Check PostgreSQL
echo "Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    check_pass "PostgreSQL $(psql --version | grep -oE '[0-9]+\.[0-9]+' | head -1) installed"
else
    check_warn "PostgreSQL client not found (database may still be accessible remotely)"
fi

# Check if .env exists
echo "Checking configuration..."
if [ -f ".env" ]; then
    check_pass ".env file exists"
    
    # Check required variables
    source .env
    
    if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
        check_fail "TELEGRAM_BOT_TOKEN not set in .env"
    else
        check_pass "TELEGRAM_BOT_TOKEN configured"
    fi
    
    if [ -z "$SUI_PACKAGE_ID" ] || [ "$SUI_PACKAGE_ID" = "0x0" ]; then
        check_warn "SUI_PACKAGE_ID not configured (set after deployment)"
    else
        check_pass "SUI_PACKAGE_ID configured"
    fi
    
    if [ -z "$DATABASE_URL" ]; then
        check_fail "DATABASE_URL not set in .env"
    else
        check_pass "DATABASE_URL configured"
    fi
    
    if [ -z "$ENCRYPTION_KEY" ]; then
        check_fail "ENCRYPTION_KEY not set in .env"
    elif [ ${#ENCRYPTION_KEY} -ne 32 ]; then
        check_fail "ENCRYPTION_KEY must be exactly 32 characters"
    else
        check_pass "ENCRYPTION_KEY configured (32 chars)"
    fi
else
    check_fail ".env file not found. Run: cp .env.example .env"
fi

# Check if node_modules exists
echo "Checking dependencies..."
if [ -d "node_modules" ]; then
    check_pass "Dependencies installed"
else
    check_warn "Dependencies not installed. Run: npm install"
fi

# Check TypeScript compilation
echo "Checking TypeScript..."
if [ -f "tsconfig.json" ]; then
    check_pass "tsconfig.json exists"
    if command -v npx &> /dev/null; then
        if npx tsc --noEmit --skipLibCheck 2>/dev/null; then
            check_pass "TypeScript compiles successfully"
        else
            check_warn "TypeScript has compilation errors (run 'npm run build' for details)"
        fi
    fi
else
    check_fail "tsconfig.json not found"
fi

# Check database connection
echo "Checking database connection..."
if [ ! -z "$DATABASE_URL" ]; then
    if command -v psql &> /dev/null; then
        if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
            check_pass "Database connection successful"
        else
            check_warn "Cannot connect to database (make sure PostgreSQL is running)"
        fi
    else
        check_warn "Cannot test database connection (psql not installed)"
    fi
fi

# Check Sui RPC connection
echo "Checking Sui RPC..."
if [ ! -z "$SUI_RPC_URL" ]; then
    if command -v curl &> /dev/null; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$SUI_RPC_URL" \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","id":1,"method":"sui_getChainIdentifier","params":[]}' 2>/dev/null || echo "000")
        
        if [ "$HTTP_CODE" = "200" ]; then
            check_pass "Sui RPC connection successful"
        else
            check_warn "Cannot connect to Sui RPC (HTTP $HTTP_CODE)"
        fi
    else
        check_warn "Cannot test Sui RPC (curl not installed)"
    fi
fi

# Check Docker (optional)
echo "Checking Docker (optional)..."
if command -v docker &> /dev/null; then
    check_pass "Docker $(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1) installed"
    if command -v docker-compose &> /dev/null; then
        check_pass "Docker Compose installed"
    else
        check_warn "Docker Compose not found"
    fi
else
    check_warn "Docker not installed (optional for deployment)"
fi

# Check logs directory
echo "Checking logs directory..."
if [ -d "logs" ]; then
    check_pass "logs/ directory exists"
else
    mkdir -p logs
    check_pass "Created logs/ directory"
fi

# Summary
echo ""
echo "=============================================="
echo "✅ Setup verification complete!"
echo ""
echo "Next steps:"
echo "1. If any warnings above, address them"
echo "2. Run 'npm install' if dependencies not installed"
echo "3. Configure .env file with your values"
echo "4. Deploy TradePool contracts to Sui"
echo "5. Update SUI_PACKAGE_ID, SUI_REGISTRY_ID in .env"
echo "6. Run 'npm run dev' to start bot"
echo ""
echo "For help, see QUICKSTART.md"
echo "=============================================="
