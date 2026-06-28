import { Badge } from '@/components/ui/badge'
import { dueHealthLabel, cn, type DueHealth } from '@/lib/utils'

const healthStyles: Record<Exclude<DueHealth, 'normal'>, string> = {
  emergency: 'bg-red-50 text-red-700 border-red-200',
  caution: 'bg-amber-50 text-amber-800 border-amber-200',
  good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

interface Props {
  health: DueHealth
}

export default function DueHealthBadge({ health }: Props) {
  if (health === 'normal') return null

  return (
    <Badge className={cn(healthStyles[health], 'cursor-default')}>
      {dueHealthLabel(health)}
    </Badge>
  )
}
