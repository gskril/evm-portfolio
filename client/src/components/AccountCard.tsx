import type { VariantProps } from 'class-variance-authority'
import { Pencil, Trash } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { zfd } from 'zod-form-data'

import {
  honoClient,
  throwIfNotOk,
  useAccounts,
  useBalances,
  useEthValuesByAccount,
} from '../hooks/useHono'
import { Button } from './ui/button'
import { buttonVariants } from './ui/button-variants'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
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

export function AccountCard() {
  const accounts = useAccounts()
  const { refetch: refetchBalances } = useBalances()
  const { refetch: refetchBalancesByAccount } = useEthValuesByAccount()

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <CardTitle>Accounts</CardTitle>
        <div className="flex gap-2">
          <AccountDialog prompt="Add" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.data?.map((account) => (
              <TableRow key={account.id}>
                <TableCell>{account.name}</TableCell>
                <TableCell>{account.description}</TableCell>
                <TableCell>{account.address}</TableCell>

                <TableCell className="flex justify-end gap-2">
                  <AccountDialog
                    accountId={account.id}
                    prompt="Edit"
                    size="icon"
                    variant="outline"
                  />

                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Delete ${account.name}`}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Delete ${account.name}? Its saved balances will also be removed.`
                        )
                      ) {
                        return
                      }

                      const promise = honoClient.accounts[':id']
                        .$delete({ param: { id: account.id.toString() } })
                        .then(throwIfNotOk)

                      toast.promise(promise, {
                        loading: 'Deleting account...',
                        success: () => {
                          accounts.refetch()
                          refetchBalances()
                          refetchBalancesByAccount()
                          return 'Account deleted'
                        },
                        error: 'Failed to delete account',
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

const addAccountSchema = zfd.formData({
  id: zfd.text(z.coerce.number().optional()),
  name: zfd.text(z.string().optional()),
  description: zfd.text(z.string().optional()),
  addressOrName: zfd.text(z.string().optional()),
})

function AccountDialog({
  accountId,
  prompt,
  ...buttonProps
}: {
  accountId?: number
  prompt: 'Add' | 'Edit'
} & VariantProps<typeof buttonVariants>) {
  const accounts = useAccounts()
  const { refetch: refetchOffchainAccounts } = useAccounts('offchain')
  const [open, setOpen] = useState(false)
  const selectedAccount = accounts.data?.find(
    (account) => account.id === accountId
  )

  async function handleAddAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const safeParse = addAccountSchema.safeParse(formData)

    if (safeParse.error) {
      toast.error('Invalid form data')
      return
    }

    const json = safeParse.data
    const promise = honoClient.accounts
      .$post({ json })
      .then(throwIfNotOk)
      .then(() => {
        accounts.refetch()
        refetchOffchainAccounts()
        setOpen(false)
      })

    toast.promise(promise, {
      loading: `${prompt}ing account...`,
      success: `${prompt}ed account`,
      error: (error: unknown) =>
        error instanceof Error
          ? error.message
          : `Failed to ${prompt.toLowerCase()} account`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          {...buttonProps}
          aria-label={
            buttonProps.size === 'icon'
              ? `${prompt} ${selectedAccount?.name ?? 'account'}`
              : undefined
          }
        >
          {buttonProps.size === 'icon' ? <Pencil /> : prompt}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{prompt} Account</DialogTitle>
          <DialogDescription>
            Track an onchain address or a manual offchain account.
          </DialogDescription>
        </DialogHeader>

        <form
          id="account"
          onSubmit={handleAddAccount}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="id" value={selectedAccount?.id ?? ''} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name" className="gap-1">
              Name{' '}
              <span className="text-muted-foreground text-xs leading-none">
                (leave blank if using ENS below)
              </span>
            </Label>
            <Input
              id="name"
              name="name"
              autoComplete="off"
              data-1p-ignore
              defaultValue={selectedAccount?.name}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">
              Description{' '}
              <span className="text-muted-foreground text-xs leading-none">
                (optional)
              </span>
            </Label>
            <Input
              id="description"
              name="description"
              autoComplete="off"
              defaultValue={selectedAccount?.description ?? ''}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addressOrName">Address or ENS name</Label>
            <Input
              id="addressOrName"
              name="addressOrName"
              defaultValue={selectedAccount?.address ?? ''}
              disabled={!!selectedAccount?.id}
              autoComplete="off"
              data-1p-ignore
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="submit" form="account">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
