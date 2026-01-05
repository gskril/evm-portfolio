import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

import { RefreshPortfolioButton } from '@/components/PortfolioCard'
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
  const { data: networthTimeSeries } = useNetworthTimeSeries(currency)

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
                  top: 4,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={36}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
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
                      indicator="line"
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
