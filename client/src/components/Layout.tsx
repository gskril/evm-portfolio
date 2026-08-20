import { ArrowUpRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { useAccounts } from '@/hooks/useHono'
import { SERVER_URL } from '@/hooks/useHono'
import { useQueues } from '@/hooks/useQueues'
import { cn } from '@/lib/utils'

import { CurrencySelector } from './CurrencySelector'

const links = [
  {
    label: 'Home',
    to: '/',
  },
  {
    label: 'Portfolio',
    to: '/portfolio',
  },
  {
    label: 'Chains',
    to: '/chains',
  },
  {
    label: 'Accounts',
    to: '/accounts',
  },
  {
    label: 'Tokens',
    to: '/tokens',
  },
  {
    label: 'Balances',
    to: '/balances',
  },
] as const

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const queues = useQueues()
  const { data: offchainAccounts } = useAccounts('offchain')

  return (
    <div className="min-h-svh md:grid md:grid-cols-[10rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="bg-background border-b p-3 md:sticky md:top-0 md:flex md:h-svh md:flex-col md:justify-between md:border-r md:border-b-0 md:p-2 lg:p-6">
        <nav aria-label="Primary navigation">
          <ul className="flex gap-1 overflow-x-auto pb-1 md:block md:overflow-visible md:pb-0">
            {links.map((link) => (
              <li
                key={link.to}
                className={cn(
                  link.label === 'Balances' &&
                    offchainAccounts?.length === 0 &&
                    'hidden'
                )}
              >
                <Link
                  to={link.to}
                  className={cn(
                    'block rounded px-2 py-1 whitespace-nowrap',
                    pathname === link.to && 'bg-gray-100 font-medium'
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-3 flex items-center justify-between gap-3 md:mt-0 md:flex-col md:items-stretch md:gap-2">
          <CurrencySelector />

          <span className="text-muted-foreground text-sm whitespace-nowrap">
            {queues.data?.inProgress ?? 0} jobs in progress
          </span>

          {!!queues.data?.failed && (
            <a
              href={`${SERVER_URL}/dashboard`}
              target="_blank"
              rel="noreferrer"
              className="border-destructive bg-destructive/10 text-destructive flex items-center gap-2 rounded-md border p-2 text-sm"
            >
              {queues.data.failed} jobs failed{' '}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          )}
        </div>
      </aside>

      <main className="flex min-h-svh w-full max-w-full min-w-0 flex-col gap-4 bg-neutral-50 p-4 lg:gap-6 lg:p-6">
        {children}
      </main>
    </div>
  )
}
