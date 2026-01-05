import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { honoClient } from './useHono'

export function useAuthStatus() {
  return useQuery({
    queryKey: ['auth', 'status'],
    queryFn: async () => {
      const res = await honoClient.auth.status.$get()
      return res.json()
    },
    retry: false,
  })
}

export function useSetupPassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (password: string) => {
      const res = await honoClient.auth.setup.$post({
        json: { password },
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to set up password')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'status'] })
    },
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (password: string) => {
      const res = await honoClient.auth.login.$post({
        json: { password },
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to login')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'status'] })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await honoClient.auth.logout.$post()

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to logout')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'status'] })
    },
  })
}
