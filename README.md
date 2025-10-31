# Zoracle Copy Trading Server

A NestJS-based copy trading server that automatically mirrors trades on Zora content coins. Monitors trader wallets via Alchemy webhooks and executes matching trades for subscribed users in real-time.

## What It Does

When a monitored trader executes a BUY or SELL trade on Zora content coins, the server automatically executes the same trade for users who are subscribed to copy that trader.

## Tech Stack

- NestJS (TypeScript)
- Alchemy webhooks
- MongoDB
- Redis + Bull Queue
- WalletConnect
