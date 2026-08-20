# Use the official Bun image
FROM oven/bun:1 as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json .
COPY client/package.json ./client/
COPY server/package.json ./server/

# Copy source code first
COPY . .

# Install dependencies
RUN bun install --ignore-scripts

# Build server first
WORKDIR /app/server
RUN bun run build

# Build client
WORKDIR /app/client
RUN bun run build

# Start a new stage for the runtime
FROM oven/bun:1

WORKDIR /app

# Copy built artifacts and dependencies
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/client/vite.config.ts ./client/vite.config.ts
COPY --from=builder /app/node_modules ./node_modules
COPY package.json .
COPY client/package.json ./client/
COPY server/package.json ./server/

# Only the Vite preview server is public; it proxies /api to the backend.
EXPOSE 8580

# Start both applications using concurrently
CMD ["bun", "run", "start"]
