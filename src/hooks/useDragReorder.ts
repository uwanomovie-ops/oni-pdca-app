'use client'

import { useCallback, useEffect, useState } from 'react'
import { reorderArray } from '@/lib/reorder'

export function useDragReorder<T extends { id: string }>(
  items: T[],
  onReorder: (items: T[]) => Promise<void>,
  disabled = false,
) {
  const [orderedItems, setOrderedItems] = useState(items)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  useEffect(() => {
    setOrderedItems(items)
  }, [items])

  const resetDrag = useCallback(() => {
    setDragIndex(null)
    setOverIndex(null)
  }, [])

  const handleDragStart = useCallback((index: number) => {
    if (disabled) return
    setDragIndex(index)
  }, [disabled])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    if (disabled || dragIndex === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverIndex(index)
  }, [disabled, dragIndex])

  const handleDrop = useCallback(async (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (disabled || dragIndex === null || dragIndex === index) {
      resetDrag()
      return
    }

    const next = reorderArray(orderedItems, dragIndex, index)
    setOrderedItems(next)
    resetDrag()
    await onReorder(next)
  }, [disabled, dragIndex, orderedItems, onReorder, resetDrag])

  const getItemDragProps = useCallback((index: number) => ({
    onDragOver: (e: React.DragEvent) => handleDragOver(e, index),
    onDrop: (e: React.DragEvent) => handleDrop(e, index),
    onDragLeave: () => {
      if (overIndex === index) setOverIndex(null)
    },
  }), [handleDragOver, handleDrop, overIndex])

  const getHandleProps = useCallback((index: number) => ({
    draggable: !disabled,
    onDragStart: (e: React.DragEvent) => {
      e.stopPropagation()
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(index))
      handleDragStart(index)
    },
    onDragEnd: resetDrag,
  }), [disabled, handleDragStart, resetDrag])

  return {
    orderedItems,
    dragIndex,
    overIndex,
    getItemDragProps,
    getHandleProps,
  }
}
