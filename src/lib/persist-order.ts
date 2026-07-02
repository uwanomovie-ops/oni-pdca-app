import { api } from '@/lib/api'

async function persistOrder(
  endpoint: 'goals' | 'issues',
  ordered: { id: string; sort_order: number }[],
): Promise<void> {
  await Promise.all(
    ordered.map((item, index) =>
      item.sort_order === index
        ? Promise.resolve()
        : api.patch(`/api/${endpoint}/${item.id}`, { sort_order: index }),
    ),
  )
}

export async function persistGoalOrder(
  ordered: { id: string; sort_order: number }[],
): Promise<void> {
  await persistOrder('goals', ordered)
}

export async function persistIssueOrder(
  ordered: { id: string; sort_order: number }[],
): Promise<void> {
  await persistOrder('issues', ordered)
}
