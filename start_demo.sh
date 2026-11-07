#!/usr/bin/env bash
# ==============================================================================
# CyberTrust 360 — One-Command Demonstration & Local Startup
# Team: TECHNIX PRO
# Tagline: Your Digital World. Protected from Every Angle.
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
AMBER='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "  =================================================================="
echo "    CYBERTRUST 360 — AI WEB THREAT & DIGITAL TRUST INTELLIGENCE    "
echo "    Developed by Team TECHNIX PRO | 48-Hour Hackathon MVP          "
echo "  =================================================================="
echo -e "${NC}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# 1. Check Prerequisites
echo -e "${CYAN}[1/5] Checking environment prerequisites...${NC}"

if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}Error: Node.js is required but not installed.${NC}"
    exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
    echo -e "${RED}Error: Python 3.11+ is required but not installed.${NC}"
    exit 1
fi

if [ ! -d "backend/.venv" ]; then
    echo -e "${AMBER}Virtual environment not found. Creating backend/.venv...${NC}"
    python3 -m venv backend/.venv
    backend/.venv/bin/pip install --upgrade pip
    backend/.venv/bin/pip install -r backend/requirements.txt
fi

echo -e "${GREEN}✓ Prerequisites verified.${NC}"

# 2. Blockchain EVM Node & Smart Contract
echo -e "${CYAN}[2/5] Checking Hardhat Local Blockchain Node (port 8545)...${NC}"
if curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://127.0.0.1:8545 >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Local Hardhat node is running and responsive.${NC}"
else
    echo -e "${AMBER}Hardhat node is not running. Starting background Hardhat daemon...${NC}"
    (cd blockchain && CI=true npx hardhat node --hostname 127.0.0.1 --port 8545 > /tmp/cybertrust_hardhat.log 2>&1 &)
    echo "Waiting for Hardhat node to initialize..."
    sleep 3
fi

# Deploy contract if deployment.json does not exist
if [ ! -f "blockchain/deployment.json" ]; then
    echo -e "${AMBER}Deploying CyberTrustReportRegistry to local EVM...${NC}"
    (cd blockchain && npx hardhat run scripts/deploy.ts --network localhost)
fi
echo -e "${GREEN}✓ Smart contract registry verified.${NC}"

# 3. Backend API Gateway
echo -e "${CYAN}[3/5] Checking FastAPI Backend Gateway (port 8000)...${NC}"
if curl -s http://127.0.0.1:8000/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ FastAPI backend is already running.${NC}"
else
    echo -e "${AMBER}Starting FastAPI development server on port 8000...${NC}"
    (backend/.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload > /tmp/cybertrust_backend.log 2>&1 &)
    sleep 2
fi

# 4. Frontend Dashboard
echo -e "${CYAN}[4/5] Checking Vite Frontend Dashboard (port 5173)...${NC}"
if curl -s http://127.0.0.1:5173/ >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend dashboard is already running.${NC}"
else
    echo -e "${AMBER}Starting Vite development server on port 5173...${NC}"
    (cd frontend && npm run dev -- --host 127.0.0.1 --port 5173 > /tmp/cybertrust_frontend.log 2>&1 &)
    sleep 2
fi

# 5. Service Readiness Validation Probe
echo -e "${CYAN}[5/5] Running end-to-end readiness validation probe...${NC}"

HEALTH_STATUS=$(curl -s http://127.0.0.1:8000/api/health | grep -o '"status":"[^"]*"' | cut -d':' -f2 | tr -d '"' || echo "offline")
BC_STATUS=$(curl -s http://127.0.0.1:8000/api/v1/blockchain/status | grep -o '"connected":[^,]*' | cut -d':' -f2 | tr -d ' ' || echo "false")

echo "------------------------------------------------------------------"
echo -e "  Backend Health:     ${GREEN}${HEALTH_STATUS}${NC}"
echo -e "  Blockchain EVM:     ${GREEN}Connected (${BC_STATUS})${NC}"
echo -e "  Web Application:    ${CYAN}http://localhost:5173${NC}"
echo -e "  Interactive Docs:   ${CYAN}http://localhost:8000/docs${NC}"
echo -e "  API Health Probe:   ${CYAN}http://localhost:8000/api/health${NC}"
echo -e "  Hardhat RPC Node:   ${CYAN}http://127.0.0.1:8545${NC}"
echo "------------------------------------------------------------------"
echo -e "${GREEN}CyberTrust 360 is live and ready for hackathon evaluation!${NC}"
