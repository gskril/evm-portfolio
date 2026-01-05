import { ChevronDownIcon, RefreshCcwIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useQueues } from '@/hooks/useQueues'

import { useCurrency } from '../hooks/useCurrency'
import { honoClient, useBalances, useFiat } from '../hooks/useHono'
import { formatCurrency, toFixed } from '../lib/utils'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'

export function PortfolioCard() {
  const balances = useBalances()
  const { currency } = useCurrency()
  const { data: fiat } = useFiat()
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  const toggleRow = (tokenId: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(tokenId)) {
        newSet.delete(tokenId)
      } else {
        newSet.add(tokenId)
      }
      return newSet
    })
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <CardTitle>Multichain Portfolio </CardTitle>
        <RefreshPortfolioButton />
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead className="w-40 min-w-34">Chain</TableHead>
              <TableHead className="min-w-56">Token</TableHead>
              <TableHead className="w-44 min-w-40">Price</TableHead>
              <TableHead className="w-44 min-w-40">Amount</TableHead>
              <TableHead className="w-32 min-w-28 text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.data?.tokens.map((token) => {
              const isExpanded = expandedRows.has(token.id)

              return (
                <>
                  <TableRow
                    key={token.id}
                    className="cursor-pointer"
                    onClick={() => toggleRow(token.id)}
                  >
                    <TableCell>
                      <ChevronDownIcon
                        className={`h-4 w-4 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </TableCell>
                    <TableCell>{token.chain.name}</TableCell>
                    <TableCell title={token.symbol}>{token.name} </TableCell>
                    <TableCell>
                      {fiat &&
                        formatCurrency(
                          token.ethValuePerToken / fiat.getRate(currency),
                          currency
                        )}
                    </TableCell>
                    <TableCell>{toFixed(token.balance, 4)}</TableCell>
                    <TableCell
                      className="text-right"
                      title={`${toFixed(
                        (token.ethValue / balances.data?.totalEthValue) * 100,
                        2
                      )}% of net value`}
                    >
                      {!!token.ethValue &&
                        fiat &&
                        currency &&
                        formatCurrency(
                          token.ethValue / fiat.getRate(currency),
                          currency
                        )}
                    </TableCell>
                  </TableRow>
                  {isExpanded && token.accountBreakdown && (
                    <TableRow key={`${token.id}-breakdown`}>
                      <TableCell colSpan={6} className="p-0">
                        <div className="divide-border divide-y">
                          {token.accountBreakdown.map((account, idx) => (
                            <div
                              key={account.account.id}
                              className={`flex items-center justify-between p-2 text-sm ${
                                idx % 2 === 0 ? 'bg-muted/20' : 'bg-muted'
                              }`}
                            >
                              <span className="font-medium">
                                {account.account.name}
                              </span>
                              <div className="flex items-center gap-4">
                                <span className="text-muted-foreground tabular-nums">
                                  {toFixed(account.balance, 3)} (
                                  {toFixed(account.percentage, 2)}%)
                                </span>
                                <span className="min-w-28 text-right font-medium tabular-nums">
                                  {fiat &&
                                    currency &&
                                    formatCurrency(
                                      account.ethValue / fiat.getRate(currency),
                                      currency
                                    )}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5}>Total</TableCell>
              <TableCell className="text-right">
                {fiat &&
                  currency &&
                  formatCurrency(
                    (balances.data?.totalEthValue ?? 0) /
                      fiat.getRate(currency),
                    currency
                  )}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  )
}

export function RefreshPortfolioButton() {
  const queues = useQueues()
  const isLoading = !!queues.data?.inProgress

  async function handleRefresh() {
    const promise = honoClient.balances.$post()
    const msg = 'Starting to fetch balances in the background'

    toast.promise(promise, {
      loading: msg,
      success: () => {
        queues.refetch()
        return msg
      },
      error: 'Failed to refetch balances',
    })
  }

  return (
    <Button onClick={handleRefresh} isLoading={isLoading}>
      {!isLoading && <RefreshCcwIcon className="h-4 w-4" />}
      Refresh
    </Button>
  )
}
