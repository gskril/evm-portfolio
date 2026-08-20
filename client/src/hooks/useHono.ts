import { useQuery } from '@tanstack/react-query'
import { hc } from 'hono/client'
import { Client } from 'server/hc'

import { useQueues } from './useQueues'

export const SERVER_URL = '/api'

export const honoClient: Client = hc(SERVER_URL) as unknown as Client

export async function throwIfNotOk<T extends Response>(response: T) {
  if (response.ok) {
    return response
  }

  let message = `Request failed (${response.status})`

  try {
    const body = (await response.clone().json()) as { error?: unknown }

    if (typeof body.error === 'string') {
      message = body.error
    }
  } catch {
    // Keep the status-based fallback for non-JSON error responses.
  }

  throw new Error(message)
}

export function useAccounts(type?: 'onchain' | 'offchain') {
  return useQuery({
    queryKey: ['accounts', type],
    queryFn: async () => {
      const res = await honoClient.accounts.$get({
        query: {
          type,
        },
      })
      await throwIfNotOk(res)
      return res.json()
    },
  })
}

export function useChains() {
  return useQuery({
    queryKey: ['chains'],
    queryFn: async () => {
      const res = await honoClient.chains.$get()
      await throwIfNotOk(res)
      return res.json()
    },
  })
}

export function useTokens() {
  return useQuery({
    queryKey: ['tokens'],
    queryFn: async () => {
      const res = await honoClient.tokens.$get()
      await throwIfNotOk(res)
      return res.json()
    },
  })
}

export function useBalances() {
  const { data: queues } = useQueues()

  return useQuery({
    // Only refetch when the queue is active
    queryKey: ['balances', queues?.inProgress ?? 0],
    queryFn: async () => {
      const res = await honoClient.balances.$get()
      await throwIfNotOk(res)
      const json = await res.json()

      const ethValueByChain = json.tokens.reduce(
        (acc, token) => {
          const chainId = token.chain.id
          const chainName = token.chain.name

          const existing = acc.find((item) => item.id === chainId)
          if (existing) {
            existing.totalEthValue += token.ethValue
          } else {
            acc.push({
              id: chainId,
              name: chainName,
              totalEthValue: token.ethValue,
            })
          }
          return acc
        },
        [] as { id: number; name: string; totalEthValue: number }[]
      )

      return { ...json, ethValueByChain }
    },
  })
}

export function useFiat() {
  const { data: chains } = useChains()
  const mainnetIsConfigured = chains?.some((chain) => chain.id === 1)

  return useQuery({
    queryKey: ['fiat', mainnetIsConfigured],
    queryFn: async () => {
      const res = await honoClient.fiat.$get()
      await throwIfNotOk(res)
      const array = await res.json()

      function getRate(key: string | undefined) {
        // Fallback to 1 means falling back to ETH
        return array.find((item) => item.label === key)?.rateToEth ?? 1
      }

      return { array, getRate }
    },
  })
}

export function useEthValuesByAccount() {
  return useQuery({
    queryKey: ['ethValuesByAccount'],
    queryFn: async () => {
      const res = await honoClient.balances.accounts.$get()
      await throwIfNotOk(res)
      return res.json()
    },
  })
}

export function useNetworthTimeSeries(currency: string | undefined) {
  return useQuery({
    queryKey: ['networthTimeSeries', currency],
    queryFn: async () => {
      const res = await honoClient.balances.networth.$get()
      await throwIfNotOk(res)
      const json = await res.json()

      // For ETH: all records are valid (they all have ethValue)
      // For USD: only records with usdValue are valid
      const items = []

      for (const item of json) {
        if (currency === 'ETH' || item.usdValue != null) {
          items.push({
            ...item,
            timestamp: new Date(item.timestamp).getTime(),
            value:
              currency === 'ETH' ? item.ethValue : (item.usdValue as number),
          })
        }
      }

      return items
    },
  })
}

export function useOffchainBalances() {
  return useQuery({
    queryKey: ['offchainBalances'],
    queryFn: async () => {
      const res = await honoClient.balances.offchain.$get()
      await throwIfNotOk(res)
      return res.json()
    },
  })
}
