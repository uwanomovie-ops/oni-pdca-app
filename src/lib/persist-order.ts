import { api } from '@/lib/api'

export async function persistIssueOrder(
  ordered: { id: string; sort_order: number }[],
): Promise<void> {
  await Promise.all(
    ordered.map((issue, index) =>
      issue.sort_order === index
        ? Promise.resolve()
        : api.patch(`/api/issues/${issue.id}`, { sort_order: index }),
    ),
  )
}
