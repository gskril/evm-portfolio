import { ArrowUpRight, LogOut } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useLogout } from '@/hooks/useAuth'
import { useAccounts } from '@/hooks/useHono'
import { SERVER_URL } from '@/hooks/useHono'
import { useQueues } from '@/hooks/useQueues'
import { cn } from '@/lib/utils'

import { CurrencySelector } from './CurrencySelector'
import { Button } from './ui/button'

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
  const navigate = useNavigate()
  const queues = useQueues()
  const { data: offchainAccounts } = useAccounts('offchain')
  const logout = useLogout()

  const handleLogout = async () => {
    try {
      await logout.mutateAsync()
      toast.success('Logged out successfully')
      navigate('/login')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to logout')
    }
  }

  return (
    <div className="grid grid-cols-[10rem_1fr] lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 flex h-svh flex-col justify-between border-r p-2 lg:p-6">
        <nav>
          <ul>
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
                    'block rounded px-2 py-1',
                    pathname === link.to && 'bg-gray-100 font-medium'
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-2">
          <CurrencySelector />

          <span className="text-muted-foreground text-sm">
            {queues.data?.inProgress} jobs in progress
          </span>

          {!!queues.data?.failed && (
            <a
              href={`${SERVER_URL}/dashboard`}
              target="_blank"
              className="border-destructive bg-destructive/10 text-destructive flex items-center gap-2 rounded-md border p-2 text-sm"
            >
              {queues.data.failed} jobs failed{' '}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            isLoading={logout.isPending}
            className="w-full"
          >
            <LogOut />
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex min-h-svh w-full max-w-full flex-col gap-4 bg-neutral-50 p-4 lg:gap-6 lg:p-6">
        {children}
      </main>
    </div>
  )
}
