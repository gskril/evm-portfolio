import type { Address } from 'viem'

import { defaultChains } from './chains'

// Compatible with tokenlists.org so we can build an easy importing feature later
type TokenlistToken = {
  chainId: number
  address: Address
  name: string
  symbol: string
  decimals: number
}

export const defaultTokens: TokenlistToken[] = [
  // Native ETH on all default chains
  ...defaultChains.map(
    (chain) =>
      ({
        address: '0x0000000000000000000000000000000000000000',
        chainId: chain.id,
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      }) as const
  ),
  {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    chainId: 1,
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
  },
  {
    address: '0x4200000000000000000000000000000000000006',
    chainId: 8453,
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
  },
  {
    address: '0x4200000000000000000000000000000000000006',
    chainId: 10,
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
  },
  {
    address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    chainId: 42161,
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
  },
  {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    chainId: 1,
    name: 'Tether',
    symbol: 'USDT',
    decimals: 6,
  },
  {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: 1,
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6,
  },
  {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    chainId: 8453,
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6,
  },
  {
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    chainId: 1,
    name: 'Chainlink',
    symbol: 'LINK',
    decimals: 18,
  },
  {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    chainId: 1,
    name: 'Dai',
    symbol: 'DAI',
    decimals: 18,
  },
  {
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    chainId: 1,
    name: 'Uniswap',
    symbol: 'UNI',
    decimals: 18,
  },
  {
    address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
    chainId: 1,
    name: 'Aave',
    symbol: 'AAVE',
    decimals: 18,
  },
  {
    address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    chainId: 42161,
    name: 'Arbitrum',
    symbol: 'ARB',
    decimals: 18,
  },
  {
    address: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
    chainId: 1,
    name: 'Maker',
    symbol: 'MKR',
    decimals: 18,
  },
  {
    address: '0x4200000000000000000000000000000000000042',
    chainId: 10,
    name: 'Optimism',
    symbol: 'OP',
    decimals: 18,
  },
  {
    address: '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72',
    chainId: 1,
    name: 'Ethereum Name Service',
    symbol: 'ENS',
    decimals: 18,
  },
]
