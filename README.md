# Zoracle Copy Trading Bot

A NestJS-based copy trading bot that automatically mirrors trades on Zora content coins. The bot monitors trader wallets via Alchemy webhooks and executes matching trades for subscribed users in real-time.

## Overview

This bot enables automated copy trading by:
- **Monitoring trader wallets** on Base network through Alchemy webhooks
- **Detecting trades** (BUY/SELL) in real-time
- **Matching users** who want to copy specific traders
- **Executing trades** automatically when traders make moves
- **Tracking holdings** and selling 100% when traders sell

### Key Features

- 🎯 **Real-time trade detection** via Alchemy webhooks
- 🔄 **Automatic trade execution** - BUY and SELL matching
- 💾 **Redis-based deduplication** - Prevents duplicate trade processing
- 📊 **Queue-based processing** - Reliable async trade execution with retries
- 🗄️ **MongoDB configuration** - Store and manage copy trading configs
- 🔐 **WalletConnect ready** - Infrastructure for wallet integration (pending implementation)

## How It Works

1. **Webhook Reception**: Receives trade events from Alchemy when monitored wallets execute trades
2. **Trade Classification**: Identifies BUY vs SELL trades by analyzing pool interactions
3. **Config Matching**: Finds all active copy-trading configs for the trader
4. **Job Queuing**: Enqueues copy trade jobs for each matching user
5. **Trade Execution**: Processes jobs asynchronously and executes swaps via API
6. **Holdings Tracking**: Stores purchased token amounts in Redis for accurate SELL execution

## Architecture

```
┌─────────────┐
│  Alchemy    │
│  Webhooks   │ ────► Webhook Receiver ────► Trade Classifier
└─────────────┘                                    │
                                                   ▼
                                          Config Matcher (MongoDB)
                                                   │
                                                   ▼
                                          Queue (Redis/Bull)
                                                   │
                                                   ▼
                                          Copy Trade Processor
                                                   │
                                                   ▼
                                          Swap Execution API
```

## Tech Stack

- **Framework**: NestJS (TypeScript)
- **Webhook Provider**: Alchemy
- **Database**: MongoDB (configs)
- **Cache/Queue**: Redis + Bull Queue
- **Wallet Integration**: WalletConnect (prepared, pending implementation)
- **Swap Execution**: External API integration

## Project Setup

### Prerequisites

- Node.js (v18+)
- MongoDB (local or remote)
- Redis (local or remote)
- Alchemy account with webhook setup

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### Environment Variables

Create a `.env` file with the following:

```bash
# Server
PORT=8080
HOST=0.0.0.0

# Alchemy
ALCHEMY_SIGNING_KEY=your_signing_key
ALCHEMY_AUTH_TOKEN=your_auth_token
ALCHEMY_WEBHOOK_ID=your_webhook_id

# MongoDB
MONGODB_URI=mongodb://localhost:27017/copy-trading
# Or remote: mongodb+srv://user:pass@cluster.mongodb.net/database

# Redis
REDIS_URI=redis://localhost:6379
# Or remote: redis://user:pass@host:6379

# Swap API
SWAP_API_BASE_URL=https://your-swap-api-url.com
```

## Running the Application

### Development

```bash
# Start in watch mode
npm run start:dev

# Start in production mode
npm run start:prod
```

### Local Services (Docker)

```bash
# Start MongoDB
docker run -d --name mongo -p 27017:27017 mongo:7

# Start Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Optional: Redis GUI (Redis Commander)
docker run -d --name redis-commander -p 8081:8081 \
  -e REDIS_HOSTS=local:host.docker.internal:6379 \
  rediscommander/redis-commander:latest
```

## API Endpoints

### Webhooks

- `POST /webhook` - Receives Alchemy webhook events (signature verified)

### Management

- `GET /webhooks/addresses` - List all monitored addresses
- `POST /webhooks/addresses` - Add addresses (syncs to Alchemy + DB)
- `DELETE /webhooks/addresses` - Remove addresses
- `POST /webhooks/addresses/db` - Add addresses to DB only
- `POST /webhooks/sync` - Sync DB addresses to Alchemy webhook

### Health

- `GET /` - Health check endpoint

## Configuration

Copy trading configs are stored in MongoDB (`copy_trading_config` collection):

```json
{
  "configId": "unique_id",
  "accountName": "zoracle-123456",
  "walletAddress": "0x...",
  "delegationAmount": "0.0001",
  "maxSlippage": "0.01",
  "isActive": true,
  "telegramId": "123456789"
}
```

## Trade Flow

### BUY Trade
1. Trader buys token → Webhook received
2. Bot detects BUY trade
3. Matches active configs for trader
4. Executes swap: ETH → Token (using `delegationAmount`)
5. Stores token amount in Redis for future SELL

### SELL Trade
1. Trader sells token → Webhook received
2. Bot detects SELL trade
3. Matches active configs for trader
4. Retrieves stored token amount from Redis
5. Executes swap: Token → ETH (sells 100% of holdings)
6. Clears holdings from Redis

## Features in Development

- [ ] WalletConnect integration for direct wallet operations
- [ ] Enhanced token amount tracking (query actual balances)
- [ ] Telegram notifications for trade execution
- [ ] Trade history and analytics
- [ ] Multi-network support

## Project Structure

```
src/
├── modules/
│   ├── alchemy-webhook/    # Webhook reception & processing
│   ├── copy-trading/       # Config management & queries
│   ├── monitoring/          # Address monitoring
│   ├── queue/              # Job queue & processors
│   ├── redis/              # Redis service & deduplication
│   └── swap/               # Swap execution service
├── common/
│   └── middleware/         # Raw body & signature validation
└── config/                 # Configuration factory
```

## License

MIT
