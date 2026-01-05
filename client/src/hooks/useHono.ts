import { useQuery } from '@tanstack/react-query'
import { hc } from 'hono/client'
import { Client } from 'server/hc'

import { useQueues } from './useQueues'

const url = new URL(window.location.origin)
export const SERVER_URL = url.protocol + '//' + url.hostname + ':8579'

export const honoClient: Client = hc(SERVER_URL) as unknown as Client

export function useAccounts(type?: 'onchain' | 'offchain') {
  return useQuery({
    queryKey: ['accounts', type],
    queryFn: async () => {
      const res = await honoClient.accounts.$get({
        query: {
          type,
        },
      })
      return res.json()
    },
  })
}

export function useChains() {
  return useQuery({
    queryKey: ['chains'],
    queryFn: async () => {
      const res = await honoClient.chains.$get()
      return res.json()
    },
  })
}

export function useTokens() {
  return useQuery({
    queryKey: ['tokens'],
    queryFn: async () => {
      const res = await honoClient.tokens.$get()
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
      return res.json()
    },
  })
}

export function useNetworthTimeSeries(currency: string | undefined) {
  return useQuery({
    queryKey: ['networthTimeSeries', currency],
    queryFn: async () => {
      const res = await honoClient.balances.networth.$get()
      const json = await res.json()

      return json.map((item) => ({
        ...item,
        value: currency === 'ETH' ? item.ethValue : (item.usdValue as number),
      }))
    },
  })
}

export function useOffchainBalances() {
  return useQuery({
    queryKey: ['offchainBalances'],
    queryFn: async () => {
      const res = await honoClient.balances.offchain.$get()
      return res.json()
    },
  })
}
