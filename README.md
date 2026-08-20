# EVM Portfolio Tracker

A local-first, privacy-focused EVM portfolio tracker that gets data exclusively from user-provided RPC endpoints.

https://github.com/user-attachments/assets/99bfe583-d837-474f-971e-20952060a2d2

Uses the [1inch Spot Price Aggregator](https://portal.1inch.dev/documentation/contracts/spot-price-aggregator/introduction) to get asset values from onchain data.

The application explicitly doesn't care about transaction history to reduce complexity and maximize privacy. For more precise accounting, use [Rotki](https://rotki.com/).

## Features

- [x] Add/edit accounts
- [x] Add/edit chains
- [x] Add/edit tokens
- [x] Add/edit manual balances for tracking assets on exchanges
- [x] View token balances
- [x] View token/portfolio value in USD/EUR/ETH
- [x] View portfolio value over time (chart appears after 3 days)

## Getting Started

This is intended to be run on a private home server with access to an Ethereum node. There is no additional user auth.

### Docker (recommended)

Use the following Docker Compose file to expose the web client on port `8580`.

```yml
services:
  evm-portfolio:
    image: ghcr.io/gskril/evm-portfolio:latest
    container_name: evm-portfolio
    ports:
      - 8580:8580
    environment:
      - REDIS_URL=redis://redis:6379
      # Use this if you visit your local server from a different hostname
      # - __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=
    depends_on:
      - redis
    volumes:
      - evm-portfolio_data:/app/data
    restart: unless-stopped

  redis:
    image: redis:latest
    container_name: redis
    restart: unless-stopped

volumes:
  evm-portfolio_data:
```

### Development

Redis is used with BullMQ to manage background jobs. I don't like using Docker for local development, so you'll need to [install](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/) and run `redis-server` separately on your machine.

```bash
# Install dependencies for all workspaces
bun install
```

```bash
# Run everything
bun run dev

# Or run individual parts
bun run dev:server
bun run dev:client
```
