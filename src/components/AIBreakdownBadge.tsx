import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
  label?: string
}

/** AI KPI/KDI 提案の「採用して追加」で追加された KPI・KDI 用 */
export default function AIBreakdownBadge({ className, label = 'AI提案' }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold',
        'bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0',
        className
      )}
      title="AI提案の「採用して追加」で追加されました"
    >
      <Sparkles className="w-2.5 h-2.5" />
      {label}
    </span>
  )
}
