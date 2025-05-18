import Redis from 'ioredis'

// Start Redis locally with `redis-server` then interact with `redis-cli`
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

export const redis = new Redis(REDIS_URL, {
  connectTimeout: 5_000,
  maxRetriesPerRequest: null, // BullMQ wants this set
})
