'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Tone = 'indigo' | 'blue' | 'emerald'

interface Props {
  onEdit: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
  selected?: boolean
  tone?: Tone
  compact?: boolean
}

const editStyles: Record<Tone, { default: string; selected: string }> = {
  indigo: {
    default: 'hover:bg-indigo-50 text-indigo-500',
    selected: 'hover:bg-indigo-500 text-indigo-200',
  },
  blue: {
    default: 'hover:bg-blue-50 text-blue-500',
    selected: 'hover:bg-blue-500 text-blue-100',
  },
  emerald: {
    default: 'hover:bg-emerald-50 text-emerald-500',
    selected: 'hover:bg-emerald-500 text-emerald-100',
  },
}

export default function ItemActionButtons({
  onEdit,
  onDelete,
  selected = false,
  tone = 'indigo',
  compact = false,
}: Props) {
  const editClass = selected ? editStyles[tone].selected : editStyles[tone].default
  const deleteClass = selected
    ? editStyles[tone].selected
    : 'hover:bg-red-50 text-red-400'

  return (
    <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onEdit}
        aria-label="名前を編集"
        className={cn(editClass, compact && 'h-5 w-5')}
      >
        <Pencil className={compact ? 'w-3 h-3' : undefined} />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onDelete}
        aria-label="削除"
        className={cn(deleteClass, compact && 'h-5 w-5')}
      >
        <Trash2 className={compact ? 'w-3 h-3' : undefined} />
      </Button>
    </div>
  )
}
