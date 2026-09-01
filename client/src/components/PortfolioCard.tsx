import { ChevronDownIcon, RefreshCcwIcon } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useQueues } from '@/hooks/useQueues'

import { useCurrency } from '../hooks/useCurrency'
import {
  honoClient,
  throwIfNotOk,
  useAccounts,
  useBalances,
  useFiat,
} from '../hooks/useHono'
import { formatCurrency, toFixed } from '../lib/utils'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
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
  const accounts = useAccounts()
  const { currency } = useCurrency()
  const { data: fiat } = useFiat()
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [selectedTag, setSelectedTag] = useState('all')

  const tags = useMemo(
    () =>
      [
        ...new Set(accounts.data?.flatMap((account) => account.tags) ?? []),
      ].sort(),
    [accounts.data]
  )

  const filteredPortfolio = useMemo(() => {
    if (!balances.data) return undefined
    if (selectedTag === 'all') return balances.data

    const accountIds = new Set(
      accounts.data
        ?.filter((account) => account.tags.includes(selectedTag))
        .map((account) => account.id) ?? []
    )

    const tokens = balances.data.tokens
      .map((token) => {
        const accountBreakdown = token.accountBreakdown.filter((item) =>
          accountIds.has(item.account.id)
        )
        const balance = accountBreakdown.reduce(
          (total, item) => total + item.balance,
          0
        )
        const ethValue = accountBreakdown.reduce(
          (total, item) => total + item.ethValue,
          0
        )

        return {
          ...token,
          balance,
          ethValue,
          accountBreakdown: accountBreakdown.map((item) => ({
            ...item,
            percentage: (item.balance / balance) * 100,
          })),
        }
      })
      .filter((token) => token.balance > 0)

    return {
      ...balances.data,
      tokens,
      totalEthValue: tokens.reduce((total, token) => total + token.ethValue, 0),
    }
  }, [accounts.data, balances.data, selectedTag])

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
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Multichain Portfolio </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-44" aria-label="Filter holdings by tag">
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <RefreshPortfolioButton />
        </div>
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
            {filteredPortfolio?.tokens.map((token) => {
              const isExpanded = expandedRows.has(token.id)

              return (
                <Fragment key={token.id}>
                  <TableRow>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="-ml-2"
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${token.name} account breakdown`}
                        aria-expanded={isExpanded}
                        onClick={() => toggleRow(token.id)}
                      >
                        <ChevronDownIcon
                          aria-hidden="true"
                          className={`h-4 w-4 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </Button>
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
                        (token.ethValue / filteredPortfolio.totalEthValue) *
                          100,
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
                </Fragment>
              )
            })}
            {filteredPortfolio?.tokens.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-8 text-center"
                >
                  No holdings found for the selected tag.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5}>Total</TableCell>
              <TableCell className="text-right">
                {fiat &&
                  currency &&
                  formatCurrency(
                    (filteredPortfolio?.totalEthValue ?? 0) /
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
    const promise = honoClient.balances.$post().then(throwIfNotOk)
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
