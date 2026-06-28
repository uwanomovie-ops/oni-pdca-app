import { MessageSquareHeart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

/** AI週次コーチの「採用して反映」で追加された KDI 用 */
export default function AICoachKdiBadge({ className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold',
        'bg-amber-100 text-amber-800 border border-amber-200 shrink-0',
        className
      )}
      title="AI週次コーチの採用で追加されたKDI"
    >
      <MessageSquareHeart className="w-2.5 h-2.5" />
      AIコーチ
    </span>
  )
}
