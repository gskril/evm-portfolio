import type { VariantProps } from 'class-variance-authority'
import { Pencil, Trash } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { zfd } from 'zod-form-data'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  honoClient,
  throwIfNotOk,
  useAccounts,
  useOffchainBalances,
  useTokens,
} from '@/hooks/useHono'

import { Button } from './ui/button'
import { buttonVariants } from './ui/button-variants'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'

// Allow users to edit the balance of offchain accounts
export function BalanceCard() {
  const offchainBalances = useOffchainBalances()

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <div className="space-y-1.5">
          <CardTitle>Offchain Balances</CardTitle>
          <CardDescription>
            Manage the balances of your manual accounts.
          </CardDescription>
        </div>
        <div className="flex gap-2">{<BalanceDialog prompt="Add" />}</div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offchainBalances.data?.map((balance) => (
              <TableRow key={`${balance.owner.id}:${balance.token}`}>
                <TableCell>{balance.owner.name}</TableCell>
                <TableCell>{balance.token.name}</TableCell>
                <TableCell>{balance.balance}</TableCell>

                <TableCell className="flex justify-end gap-2">
                  <BalanceDialog
                    prompt="Edit"
                    data={offchainBalances.data?.find(
                      (b) =>
                        b.owner.id === balance.owner.id &&
                        b.token.id === balance.token.id
                    )}
                    variant="outline"
                    size="icon"
                  />

                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Delete ${balance.token.name} balance for ${balance.owner.name}`}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Delete the ${balance.token.name} balance for ${balance.owner.name}?`
                        )
                      ) {
                        return
                      }

                      const promise = honoClient.balances.offchain
                        .$delete({
                          json: {
                            account: balance.owner.id,
                            token: balance.token.id,
                          },
                        })
                        .then(throwIfNotOk)

                      toast.promise(promise, {
                        loading: 'Deleting...',
                        success: () => {
                          offchainBalances.refetch()
                          return 'Balance deleted'
                        },
                        error: 'Failed to delete balance',
                      })
                    }}
                  >
                    <Trash />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

const balanceFormSchema = zfd.formData({
  account: zfd.numeric(),
  token: zfd.numeric(),
  amount: zfd.numeric(z.number().nonnegative()),
})

function BalanceDialog({
  data,
  prompt,
  ...buttonProps
}: {
  data?: NonNullable<ReturnType<typeof useOffchainBalances>['data']>[number]
  prompt: 'Add' | 'Edit'
} & VariantProps<typeof buttonVariants>) {
  const offchainBalances = useOffchainBalances()
  const accounts = useAccounts('offchain')
  const tokens = useTokens()
  const [open, setOpen] = useState(false)

  const defaultAccount = data?.owner.id?.toString()
  const defaultToken = data?.token.id?.toString()
  const defaultAmount = data?.balance?.toString()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const safeParse = balanceFormSchema.safeParse(formData)

    if (safeParse.error) {
      toast.error('Invalid form data')
      return
    }

    const json = safeParse.data
    const promise = honoClient.balances.offchain
      .$post({ json })
      .then(throwIfNotOk)
      .then(() => {
        tokens.refetch()
        offchainBalances.refetch()
        setOpen(false)
      })
    toast.promise(promise, {
      loading: 'Saving...',
      success: 'Balance saved',
      error: 'Failed to save balance',
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          {...buttonProps}
          aria-label={
            buttonProps.size === 'icon'
              ? `${prompt} ${data?.token.name ?? 'token'} balance for ${data?.owner.name ?? 'account'}`
              : undefined
          }
          disabled={!accounts.data?.length || !tokens.data?.length}
        >
          {buttonProps.size === 'icon' ? <Pencil /> : prompt}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{prompt} Balance</DialogTitle>
          <DialogDescription>
            Set the token amount held in a manual account.
          </DialogDescription>
        </DialogHeader>

        {(() => {
          if (!accounts.data || !tokens.data) {
            return <div>Loading...</div>
          }

          return (
            <>
              <form
                id="balance"
                onSubmit={handleSubmit}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="account" className="gap-1">
                    Account
                  </Label>
                  <Select name="account" defaultValue={defaultAccount}>
                    <SelectTrigger
                      id="account"
                      className="w-full"
                      disabled={!!defaultAccount}
                    >
                      <SelectValue placeholder="Select an account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.data?.map((account) => (
                        <SelectItem
                          key={account.id}
                          value={account.id.toString()}
                        >
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="token">Token</Label>
                  <Select name="token" defaultValue={defaultToken}>
                    <SelectTrigger
                      id="token"
                      className="w-full"
                      disabled={!!defaultToken}
                    >
                      <SelectValue placeholder="Select a token" />
                    </SelectTrigger>
                    <SelectContent>
                      {tokens.data?.map((token) => (
                        <SelectItem key={token.id} value={token.id.toString()}>
                          {token.symbol} on {token.chain!.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0"
                    step="any"
                    required
                    defaultValue={defaultAmount}
                  />
                </div>
              </form>

              <DialogFooter>
                <Button type="submit" form="balance">
                  Save
                </Button>
              </DialogFooter>
            </>
          )
        })()}
      </DialogContent>
    </Dialog>
  )
}
