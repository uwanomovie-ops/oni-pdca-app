'use client'

import type { Status } from '@/lib/types'
import { STATUS_OPTIONS, statusFullLabel, cn } from '@/lib/utils'

const statusStyles: Record<Status, string> = {
  todo: 'bg-slate-100 text-slate-600 border-slate-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

interface Props {
  status: Status
  onChange?: (status: Status) => void
  readOnly?: boolean
}

export default function StatusSelect({ status, onChange, readOnly = false }: Props) {
  if (readOnly || !onChange) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
          statusStyles[status],
        )}
      >
        {statusFullLabel(status)}
      </span>
    )
  }

  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value as Status)}
      onClick={(e) => e.stopPropagation()}
      aria-label="ステータス"
      className={cn(
        'h-6 rounded-md border px-1.5 text-xs font-medium cursor-pointer outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring/50',
        statusStyles[status],
      )}
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
