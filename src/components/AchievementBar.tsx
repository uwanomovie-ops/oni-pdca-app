import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress'
import { rateColor } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  rate: number
  size?: 'sm' | 'md'
  showLabel?: boolean
}

export default function AchievementBar({ rate, size = 'md', showLabel = true }: Props) {
  const h = size === 'sm' ? 'h-1.5' : 'h-2'
  return (
    <div className="flex items-center gap-2">
      <Progress value={rate} className="flex-1">
        <ProgressTrack className={cn(h, 'bg-slate-100')}>
          <ProgressIndicator className={cn(h, rateColor(rate))} />
        </ProgressTrack>
      </Progress>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground w-8 text-right shrink-0">
          {rate}%
        </span>
      )}
    </div>
  )
}
