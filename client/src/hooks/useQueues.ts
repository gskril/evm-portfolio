import { useQuery } from '@tanstack/react-query'

import { GetQueuesResponse } from '../lib/bullmq-types'
import { SERVER_URL, throwIfNotOk } from './useHono'

export function useQueues() {
  return useQuery({
    queryKey: ['queues'],
    refetchInterval: (query) => (query.state.data?.inProgress ? 1000 : false),
    queryFn: async () => {
      const res = await fetch(`${SERVER_URL}/dashboard/api/queues`)
      await throwIfNotOk(res)
      const data = (await res.json()) as GetQueuesResponse

      const [completed, waiting, active, failed] = [
        'completed',
        'waiting',
        'active',
        'failed',
      ].map((status) =>
        data.queues.reduce(
          (acc, queue) =>
            acc + queue.counts[status as keyof typeof queue.counts],
          0
        )
      )

      return {
        completed,
        failed,
        inProgress: active + waiting,
      }
    },
  })
}
