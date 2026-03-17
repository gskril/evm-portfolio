import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

import { RefreshPortfolioButton } from '@/components/PortfolioCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { useCurrency } from '@/hooks/useCurrency'
import {
  useBalances,
  useEthValuesByAccount,
  useFiat,
  useNetworthTimeSeries,
} from '@/hooks/useHono'
import { cn, formatCurrency } from '@/lib/utils'

const allTimeRanges = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: 'All', days: undefined },
] as const

const chartConfig = {
  value: {
    label: 'Value',
  },
  desktop: {
    label: 'Desktop',
    color: 'var(--card-foreground)',
  },
} satisfies ChartConfig

export function Home() {
  const balances = useBalances()
  const { currency } = useCurrency()
  const { data: fiat } = useFiat()
  const ethValuesByAccount = useEthValuesByAccount()
  const { data: allNetworthData } = useNetworthTimeSeries(currency)
  const [selectedRange, setSelectedRange] = useState<number | undefined>(90)

  const dataSpanDays = useMemo(() => {
    if (!allNetworthData || allNetworthData.length < 2) return 0
    const first = allNetworthData[0].timestamp
    const last = allNetworthData[allNetworthData.length - 1].timestamp
    return (last - first) / (24 * 60 * 60 * 1000)
  }, [allNetworthData])

  const timeRanges = useMemo(() => {
    // Show a range option only if data spans beyond the previous smaller range
    // e.g. show "3M" only if we have more than 30 days of data
    return allTimeRanges.filter((range) => {
      if (range.days === undefined) return true // "All" always shown
      // Find the previous range's days (the one before this in the list)
      const idx = allTimeRanges.indexOf(range)
      const prevDays = idx > 0 ? allTimeRanges[idx - 1].days ?? 0 : 0
      return dataSpanDays > prevDays
    })
  }, [dataSpanDays])

  const networthTimeSeries = useMemo(() => {
    if (!allNetworthData) return undefined
    if (selectedRange === undefined) return allNetworthData
    const cutoff = Date.now() - selectedRange * 24 * 60 * 60 * 1000
    return allNetworthData.filter((item) => item.timestamp >= cutoff)
  }, [allNetworthData, selectedRange])

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <span className="text-2xl font-semibold">EVM Portfolio</span>
        <RefreshPortfolioButton />
      </div>

      <Card>
        <CardContent className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center justify-center gap-2">
            <h1 className="text-5xl font-semibold">
              {(() => {
                if (fiat && currency) {
                  return formatCurrency(
                    (balances.data?.totalEthValue ?? 0) /
                      fiat.getRate(currency),
                    currency
                  )
                }

                return '...'
              })()}
            </h1>

            <span className="text-muted-foreground min-w-48 text-center text-sm">
              Total value
            </span>
          </div>

          <div
            className={cn(
              'relative hidden w-full',
              (currency === 'USD' || currency === 'ETH') &&
                !!networthTimeSeries &&
                networthTimeSeries.length > 5 &&
                'lg:block'
            )}
          >
            {timeRanges.length > 1 && (
              <div className="absolute right-0 top-0 z-10 flex gap-1">
                {timeRanges.map((range) => (
                  <Button
                    key={range.label}
                    variant={selectedRange === range.days ? 'default' : 'ghost'}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setSelectedRange(range.days)}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            )}
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[250px] w-full"
            >
              <LineChart
                accessibilityLayer
                data={networthTimeSeries}
                margin={{
                  left: 12,
                  right: 12,
                  top: timeRanges.length > 1 ? 32 : 4,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={36}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      ...((selectedRange ?? 366) > 180 && {
                        year: '2-digit',
                      }),
                    })
                  }}
                />
                <YAxis
                  domain={['dataMin', 'dataMax']}
                  axisLine={false}
                  tick={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      labelFormatter={(value) => {
                        const date = new Date(value)
                        return date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: 'numeric',
                        })
                      }}
                      formatter={(value) =>
                        formatCurrency(value as number, currency ?? 'USD')
                      }
                    />
                  }
                />
                <Line
                  dataKey="value"
                  type="linear"
                  stroke="var(--color-desktop)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Chains</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {balances.data?.ethValueByChain.map((chain) => (
              <div
                key={chain.id}
                className="flex items-center justify-between gap-4"
              >
                <h2>{chain.name}</h2>
                {fiat && currency && (
                  <span>
                    {formatCurrency(
                      chain.totalEthValue / fiat.getRate(currency),
                      currency
                    )}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {ethValuesByAccount.data?.map((account) => (
              <div
                key={account.owner.address}
                className="flex items-center justify-between gap-4"
              >
                <span>{account.owner.name}</span>
                {fiat && currency && (
                  <span>
                    {formatCurrency(
                      account.ethValue / fiat.getRate(currency),
                      currency
                    )}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
