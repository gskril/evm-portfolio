import { Hono } from 'hono'

import { addAccount, deleteAccount, getAccounts } from './handlers/accounts'
import {
  deleteOffchainBalance,
  editOffchainBalance,
  fetchBalances,
  getBalances,
  getEthValueByAccount,
  getNetworthTimeSeries,
  getOffchainBalances,
} from './handlers/balances'
import { addChain, deleteChain, getChains } from './handlers/chains'
import { getFiat } from './handlers/fiat'
import { setupDefaultChains, setupDefaultTokens } from './handlers/setup'
import { addToken, deleteToken, getTokens } from './handlers/tokens'

export const api = new Hono()
// Browser traffic arrives through the same-origin Vite proxy. Do not enable
// cross-origin access here without an explicit, deployment-specific allowlist.

// API Routes
export const routes = api
  .get('/accounts', (c) => getAccounts(c))
  .get('/chains', (c) => getChains(c))
  .get('/balances', (c) => getBalances(c))
  .get('/balances/accounts', (c) => getEthValueByAccount(c))
  .get('/balances/networth', (c) => getNetworthTimeSeries(c))
  .get('/balances/offchain', (c) => getOffchainBalances(c))
  .get('/tokens', (c) => getTokens(c))
  .get('/fiat', (c) => getFiat(c))
  .post('/accounts', (c) => addAccount(c))
  .post('/balances', (c) => fetchBalances(c))
  .post('/chains', (c) => addChain(c))
  .post('/tokens', (c) => addToken(c))
  .post('/setup/chains', (c) => setupDefaultChains(c))
  .post('/setup/tokens', (c) => setupDefaultTokens(c))
  .post('/balances/offchain', (c) => editOffchainBalance(c))
  .delete('/balances/offchain', (c) => deleteOffchainBalance(c))
  .delete('/chains/:id', (c) => deleteChain(c))
  .delete('/accounts/:id', (c) => deleteAccount(c))
  .delete('/tokens', (c) => deleteToken(c))
