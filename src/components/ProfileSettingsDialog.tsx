import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { getPageScrollElement } from '../utils/getPageScrollElement'
import { PanelScrollArea } from './PanelScrollArea'
import { profileDialogPinnedScrollbarRailClass } from './scrollbarShared'

/** Короче полной панели: рельс визуально не доходит до верха/низа на половину значения. */
const PROFILE_SCROLL_RAIL_HEIGHT_TRIM_PX = 80

type ProfileSettingsDialogProps = {
  open: boolean
  onClose: () => void
  /** По умолчанию «Настройки профиля», как в шапке сайта */
  title?: string
  children: ReactNode
}

/**
 * Оболочка модального окна «Настройки профиля»: те же размеры, скролл и рельс, что у {@link ProfileDialog}.
 */
export function ProfileSettingsDialog({
  open,
  onClose,
  title = 'Настройки профиля',
  children,
}: ProfileSettingsDialogProps) {
  const panelRef = useRef<HTMLElement | null>(null)
  const [pinnedRailStyle, setPinnedRailStyle] = useState<CSSProperties | undefined>(undefined)

  const syncPinnedRail = useCallback(() => {
    const el = panelRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const inset = PROFILE_SCROLL_RAIL_HEIGHT_TRIM_PX / 2
    setPinnedRailStyle({
      top: rect.top + inset,
      height: Math.max(0, rect.height - PROFILE_SCROLL_RAIL_HEIGHT_TRIM_PX),
      right: Math.max(0, window.innerWidth - rect.right + 5),
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      setPinnedRailStyle(undefined)
      return
    }
    let ro: ResizeObserver | null = null
    const raf = window.requestAnimationFrame(() => {
      syncPinnedRail()
      const el = panelRef.current
      if (el) {
        ro = new ResizeObserver(() => syncPinnedRail())
        ro.observe(el)
      }
    })
    window.addEventListener('resize', syncPinnedRail)
    return () => {
      window.cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener('resize', syncPinnedRail)
    }
  }, [open, syncPinnedRail])

  useEffect(() => {
    if (!open) return
    const el = getPageScrollElement()
    const prevOverflow = el.style.overflow
    el.style.overflow = 'hidden'
    return () => {
      el.style.overflow = prevOverflow
    }
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[120]">
      <DialogBackdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="fixed inset-0 flex min-h-0 items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4">
        <DialogPanel
          ref={panelRef}
          className="relative my-auto grid min-h-0 max-h-[min(90dvh,860px)] w-full max-w-4xl grid-rows-[auto_minmax(0,1fr)] gap-6 overflow-hidden rounded-xl bg-[#0d1b2a] px-3 py-6 shadow-2xl shadow-black/50 ring-1 ring-white/10 sm:px-4 sm:py-8"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3.5 top-3 z-[122] rounded-md p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Закрыть"
          >
            <XMarkIcon className="size-5" aria-hidden />
          </button>

          <DialogTitle className="min-w-0 pr-14 text-2xl font-semibold tracking-tight text-white sm:pr-16">
            {title}
          </DialogTitle>

          <div className="min-h-0 min-w-0 overflow-hidden">
            <PanelScrollArea
              className="h-full min-h-0 min-w-0"
              pinRailToViewport
              pinnedRailClassName={profileDialogPinnedScrollbarRailClass}
              pinnedRailStyle={pinnedRailStyle}
              scrollbarAutoHideAfterIdleMs={900}
              viewportClassName="min-w-0 pr-1 pb-2 sm:pr-1.5"
              propagateWheelToPage={false}
            >
              {children}
            </PanelScrollArea>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
