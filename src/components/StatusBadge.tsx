import { Badge } from '@/components/ui/badge'
import { statusLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Status } from '@/lib/types'

const statusStyles: Record<Status, string> = {
  todo: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
}

interface Props {
  status: Status
  onClick?: () => void
}

export default function StatusBadge({ status, onClick }: Props) {
  return (
    <Badge
      render={onClick ? <button type="button" onClick={onClick} /> : undefined}
      className={cn(
        statusStyles[status],
        onClick ? 'cursor-pointer transition-colors' : 'cursor-default'
      )}
    >
      {statusLabel(status)}
    </Badge>
  )
}
