import { useEffect } from 'react'

import { useCurrency } from '@/hooks/useCurrency'
import { useFiat } from '@/hooks/useHono'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

export function CurrencySelector() {
  const currencies = useFiat()
  const { currency, setCurrency } = useCurrency()

  useEffect(() => {
    if (
      currencies.data &&
      !currencies.data.array.some((item) => item.label === currency)
    ) {
      setCurrency('ETH')
    }
  }, [currencies.data, currency, setCurrency])

  return (
    <Select value={currency} onValueChange={(value) => setCurrency(value)}>
      <SelectTrigger aria-label="Currency">
        <span className="text-muted-foreground">Currency:</span>
        <SelectValue placeholder="ETH" />
      </SelectTrigger>
      <SelectContent side="top">
        {currencies.data?.array.map((currency) => (
          <SelectItem key={currency.label} value={currency.label}>
            {currency.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
