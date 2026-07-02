'use client'

import { useCallback, useState } from 'react'
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  onResize: (deltaPx: number) => void
}

export default function PaneResizeHandle({ onResize }: Props) {
  const [active, setActive] = useState(false)

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setActive(true)

    let lastX = e.clientX
    const prevCursor = document.body.style.cursor
    const prevUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handlePointerMove = (ev: PointerEvent) => {
      const delta = ev.clientX - lastX
      lastX = ev.clientX
      onResize(delta)
    }

    const handlePointerUp = () => {
      setActive(false)
      document.body.style.cursor = prevCursor
      document.body.style.userSelect = prevUserSelect
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('pointercancel', handlePointerUp)
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('pointercancel', handlePointerUp)
  }, [onResize])

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="ペイン幅を調整"
      onPointerDown={handlePointerDown}
      className={cn(
        'group relative shrink-0 flex items-center justify-center touch-none',
        'transition-[width,background-color] duration-150',
        active ? 'w-2 bg-primary/15' : 'w-1 hover:w-2 bg-border hover:bg-primary/10',
        'cursor-col-resize',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-0 rounded-sm px-0.5 py-2 transition-opacity duration-150',
          active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        <ChevronLeft className="w-3 h-3 text-muted-foreground" aria-hidden />
        <GripVertical className="w-3 h-3 text-muted-foreground" aria-hidden />
        <ChevronRight className="w-3 h-3 text-muted-foreground" aria-hidden />
      </div>
    </div>
  )
}
