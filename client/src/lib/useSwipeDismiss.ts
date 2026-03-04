import { useRef, useCallback } from "react"

const DISMISS_THRESHOLD = 80
const DRAG_ZONE_HEIGHT = 48

export function useSwipeDismiss(onClose: () => void) {
  const startY = useRef(0)
  const currentY = useRef(0)
  const isDragging = useRef(false)
  const contentEl = useRef<HTMLDivElement | null>(null)

  const isInDragZone = (e: React.TouchEvent) => {
    const el = contentEl.current
    if (!el) return false
    const rect = el.getBoundingClientRect()
    const touchY = e.touches[0].clientY
    return touchY - rect.top < DRAG_ZONE_HEIGHT
  }

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isInDragZone(e)) return
    const scrollEl = contentEl.current
    if (scrollEl && scrollEl.scrollTop > 0) return
    isDragging.current = true
    startY.current = e.touches[0].clientY
    currentY.current = 0
    const el = contentEl.current
    if (el) el.style.transition = "none"
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return
    const delta = e.touches[0].clientY - startY.current
    if (delta < 0) {
      currentY.current = 0
      const el = contentEl.current
      if (el) el.style.transform = ""
      return
    }
    currentY.current = delta
    const el = contentEl.current
    if (el) {
      el.style.transform = `translateY(${delta}px)`
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false
    const el = contentEl.current
    if (currentY.current > DISMISS_THRESHOLD) {
      if (el) {
        el.style.transition = "transform 200ms ease-in"
        el.style.transform = "translateY(100%)"
      }
      setTimeout(() => {
        onClose()
        if (el) {
          el.style.transition = ""
          el.style.transform = ""
        }
      }, 200)
    } else {
      if (el) {
        el.style.transition = "transform 200ms ease-out"
        el.style.transform = ""
      }
      setTimeout(() => {
        if (el) el.style.transition = ""
      }, 200)
    }
    currentY.current = 0
  }, [onClose])

  return { contentEl, onTouchStart, onTouchMove, onTouchEnd }
}
