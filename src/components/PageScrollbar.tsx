import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getPageScrollElement } from '../utils/getPageScrollElement'
import {
  pageScrollbarRailClass,
  scrollbarThumbClass,
  scrollbarTrackClass,
  scrollbarTrackSlotWrapperClass,
} from './scrollbarShared'

const BOTTOM_SLACK_PX = 4
const IDLE_HIDE_MS = 1200

type PageScrollbarProps = {
  /**
   * Главная: сумма секций + отступ под фикс-шапку — совпадает с расчётом scrollHeight.
   * Каталог и прочие страницы: не передавать — берётся реальный scrollHeight.
   */
  virtualContentHeight?: number | null
  /** Не размонтировать: только скрыть (избегает дёрганья при переключении с внутренним скроллом каталога). */
  hidden?: boolean
}

export function PageScrollbar({
  virtualContentHeight = null,
  hidden = false,
}: PageScrollbarProps) {
  const scrollElRef = useRef<HTMLElement | null>(null)
  const scrollTrackRef = useRef<HTMLDivElement | null>(null)
  const [scrollHeightPx, setScrollHeightPx] = useState(0)
  const [clientHeightPx, setClientHeightPx] = useState(0)
  const [scrollTopPx, setScrollTopPx] = useState(0)
  const [isDraggingScroll, setIsDraggingScroll] = useState(false)
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [pointerOnRail, setPointerOnRail] = useState(false)

  const pointerOnRailRef = useRef(false)
  const isDraggingRef = useRef(false)
  const idleTimerRef = useRef(0)

  const contentTotalHeightPx =
    typeof virtualContentHeight === 'number' && virtualContentHeight > 0
      ? virtualContentHeight
      : scrollHeightPx

  const maxScroll = Math.max(1, contentTotalHeightPx - clientHeightPx)
  const scroll01 = Math.max(0, Math.min(1, scrollTopPx / maxScroll))
  const scrollPct = scroll01 * 100
  const thumbPct =
    contentTotalHeightPx && clientHeightPx
      ? Math.max(6, Math.min(1, clientHeightPx / contentTotalHeightPx) * 100)
      : 0

  const rawMaxScroll = Math.max(0, contentTotalHeightPx - clientHeightPx)
  const atBottom =
    rawMaxScroll <= BOTTOM_SLACK_PX || scrollTopPx >= rawMaxScroll - BOTTOM_SLACK_PX

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = 0
    }
  }, [])

  const scheduleHide = useCallback(() => {
    clearIdleTimer()
    idleTimerRef.current = window.setTimeout(() => {
      if (!pointerOnRailRef.current && !isDraggingRef.current) {
        setOverlayVisible(false)
      }
    }, IDLE_HIDE_MS)
  }, [clearIdleTimer])

  const scrollToPct = (pct01: number) => {
    const clamped = Math.max(0, Math.min(1, pct01))
    const el = scrollElRef.current
    if (!el) return
    el.scrollTo({ top: clamped * maxScroll, behavior: 'auto' })
  }

  const scrollFromClientY = (clientY: number) => {
    const track = scrollTrackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top))
    const thumbPx = (thumbPct / 100) * rect.height
    const denom = Math.max(1, rect.height - thumbPx)
    const pct01 = Math.max(0, Math.min(1, (y - thumbPx / 2) / denom))
    scrollToPct(pct01)
  }

  const applyActivityFromMetrics = useCallback(
    (st: number, sh: number, ch: number) => {
      const totalH =
        typeof virtualContentHeight === 'number' && virtualContentHeight > 0
          ? virtualContentHeight
          : sh
      const rawMax = Math.max(0, totalH - ch)
      const atEnd = rawMax <= BOTTOM_SLACK_PX || st >= rawMax - BOTTOM_SLACK_PX
      if (atEnd) {
        setOverlayVisible(false)
        clearIdleTimer()
      } else {
        setOverlayVisible(true)
        scheduleHide()
      }
    },
    [virtualContentHeight, clearIdleTimer, scheduleHide],
  )

  useLayoutEffect(() => {
    const el = getPageScrollElement()
    scrollElRef.current = el
    const st = Math.round(el.scrollTop)
    const sh = Math.round(el.scrollHeight)
    const ch = Math.round(el.clientHeight)
    setScrollTopPx(st)
    setScrollHeightPx(sh)
    setClientHeightPx(ch)
  }, [])

  useEffect(() => {
    let raf = 0
    const prevLogRef = { scrollTop: -1 }

    const readMetrics = () => {
      const el = getPageScrollElement()
      scrollElRef.current = el
      const st = Math.round(el.scrollTop)
      const sh = Math.round(el.scrollHeight)
      const ch = Math.round(el.clientHeight)
      setScrollTopPx(st)
      setScrollHeightPx(sh)
      setClientHeightPx(ch)
      return { st, sh, ch }
    }

    const read = (withActivity: boolean) => {
      const { st, sh, ch } = readMetrics()
      if (withActivity) {
        applyActivityFromMetrics(st, sh, ch)
      }

      if (import.meta.env.DEV && st !== prevLogRef.scrollTop) {
        prevLogRef.scrollTop = st
        // eslint-disable-next-line no-console
        console.log('[PageScrollbar] page scroll', {
          el: getPageScrollElement().tagName,
          scrollTop: st,
          scrollHeight: sh,
          clientHeight: ch,
        })
      }
    }

    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => read(true))
    }

    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => read(true))
    }

    read(false)
    const scrollEl = getPageScrollElement()
    scrollEl.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    return () => {
      scrollEl.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(raf)
      clearIdleTimer()
    }
  }, [applyActivityFromMetrics, clearIdleTimer])

  useEffect(() => {
    if (hidden || atBottom) {
      setOverlayVisible(false)
      clearIdleTimer()
      return
    }
    const el = getPageScrollElement()
    const st = Math.round(el.scrollTop)
    const sh = Math.round(el.scrollHeight)
    const ch = Math.round(el.clientHeight)
    applyActivityFromMetrics(st, sh, ch)
  }, [hidden, atBottom, clearIdleTimer, applyActivityFromMetrics])

  const metricsReady = scrollHeightPx > 0 && clientHeightPx > 0
  const showRail = metricsReady && !hidden && !atBottom
  const railVisualVisible = showRail && (overlayVisible || pointerOnRail || isDraggingScroll)

  const railClass = (() => {
    const base = `${pageScrollbarRailClass} transition-opacity duration-200 ease-out`
    if (!metricsReady || hidden) {
      return `${base} invisible pointer-events-none`
    }
    if (!showRail) {
      return `${base} pointer-events-none opacity-0`
    }
    return `${base} ${railVisualVisible ? 'opacity-100' : 'opacity-0'}`
  })()

  const onRailPointerEnter = () => {
    pointerOnRailRef.current = true
    setPointerOnRail(true)
    if (!atBottom && !hidden) {
      setOverlayVisible(true)
      clearIdleTimer()
    }
  }

  const onRailPointerLeave = () => {
    pointerOnRailRef.current = false
    setPointerOnRail(false)
    if (!isDraggingRef.current) {
      scheduleHide()
    }
  }

  return (
    <div
      className={railClass}
      aria-hidden={hidden || !metricsReady}
      onPointerEnter={onRailPointerEnter}
      onPointerLeave={onRailPointerLeave}
    >
      {metricsReady ? (
        <div className={scrollbarTrackSlotWrapperClass}>
          <div
            ref={scrollTrackRef}
            className={scrollbarTrackClass}
            role="scrollbar"
            aria-controls="page"
            aria-orientation="vertical"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(scrollPct)}
            tabIndex={0}
            onPointerDown={(e) => {
              isDraggingRef.current = true
              setIsDraggingScroll(true)
              setOverlayVisible(true)
              clearIdleTimer()
              ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
              scrollFromClientY(e.clientY)
            }}
            onPointerMove={(e) => {
              if (!isDraggingRef.current) return
              scrollFromClientY(e.clientY)
            }}
            onPointerUp={(e) => {
              isDraggingRef.current = false
              setIsDraggingScroll(false)
              try {
                ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
              } catch {
                // ignore
              }
              if (!pointerOnRailRef.current) {
                scheduleHide()
              }
            }}
            onPointerCancel={() => {
              isDraggingRef.current = false
              setIsDraggingScroll(false)
              if (!pointerOnRailRef.current) {
                scheduleHide()
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Home') {
                e.preventDefault()
                scrollToPct(0)
              } else if (e.key === 'End') {
                e.preventDefault()
                scrollToPct(1)
              }
            }}
            onFocus={() => {
              setOverlayVisible(true)
              clearIdleTimer()
            }}
            onBlur={() => {
              if (!isDraggingRef.current) {
                scheduleHide()
              }
            }}
          >
            <div
              className={scrollbarThumbClass}
              style={{
                height: `${thumbPct}%`,
                top: `${(100 - thumbPct) * scroll01}%`,
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
