import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { getPageScrollElement } from '../utils/getPageScrollElement'
import {
  panelScrollbarRailClass,
  scrollbarThumbClass,
  scrollbarTrackClass,
  scrollbarTrackSlotWrapperClass,
  viewportPinnedScrollbarRailClass,
} from './scrollbarShared'

type PanelScrollAreaProps = {
  children: ReactNode
  /** Обертка (relative, высота от родителя) */
  className?: string
  /** Доп. классы на прокручиваемый viewport */
  viewportClassName?: string
  /**
   * Если контент выше viewport и прокрутка у низа — `true`.
   * При отсутствии излишка по высоте всегда `false`.
   */
  onBottomEdgeChange?: (atBottom: boolean) => void
  /** Есть ли вертикальный переполнение (нужен внутренний скролл). */
  onOverflowChange?: (hasOverflow: boolean) => void
  /**
   * У низа/верха внутренней прокрутки передаёт wheel на корневой скролл документа
   * (иначе страница часто «залипает» на конце списка).
   * `false` — колесо только внутри панели, у краёв вызывается preventDefault (страница не крутится).
   */
  propagateWheelToPage?: boolean
  /** `false` — внутренний скролл и ползунок отключены, колесо уходит на страницу (позиция scrollTop сохраняется). */
  innerScrollEnabled?: boolean
  /**
   * Рельс как у страницы: `fixed right-2 top-[calc(7rem+30px)] bottom-4` + портал в `document.body` (у предков может быть `overflow: hidden`).
   */
  pinRailToViewport?: boolean
  /** Класс фиксированного рельса при `pinRailToViewport` (иначе `viewportPinnedScrollbarRailClass`). */
  pinnedRailClassName?: string
  /** Позиция портального рельса (`top` / `height` / `right`), если классов недостаточно (модалки). */
  pinnedRailStyle?: CSSProperties
  /** Класс абсолютного рельса справа, если не `pinRailToViewport` (иначе `panelScrollbarRailClass`). */
  panelRailClassName?: string
  /**
   * Только `import.meta.env.DEV`: префикс в `console` для отладки wheel / низа / передачи на страницу.
   */
  debugScrollLabel?: string
  /**
   * Ползунок только при наведении на панель (и на портальный рельс, если `pinRailToViewport`).
   * Удобно для боковой колонки фильтров: у курсора вне области — рельс скрыт.
   */
  scrollbarVisibleOnHoverOnly?: boolean
  /**
   * После скролла/колеса ползунок виден столько миллисекунд, пока нет активности; при наведении на область — тоже виден.
   * Для модалок в духе macOS overlay scrollbar.
   */
  scrollbarAutoHideAfterIdleMs?: number
}

/**
 * Вертикальный скролл с кастомным ползунком (стиль как у PageScrollbar), нативный скролл скрыт.
 */
/** Запас на субпиксели и рамки: ниже этого — считаем, что скролл не нужен. */
const SCROLL_SLACK_PX = 4

/**
 * Гистерезис «у низа»: при быстром скролле scrollTop дергается у края — без зазора
 * onBottomEdgeChange и ползунок мигали бы (полоска каталога / layout).
 * Выход с низа — только после заметного скролла вверх.
 */
const BOTTOM_ENTER_PX = 8
const BOTTOM_LEAVE_PX = 96

/**
 * Трекпад шлёт wheel без паузы — таймер «тишины» между событиями почти никогда не срабатывает
 * при непрерывном жесте. Поэтому дополнительно: после стольки «пикселей» впитывания у низа
 * в том же жесте открываем передачу на страницу (слушатель wheel стабилен — без снятия/вешания).
 */
const BOTTOM_WHEEL_GESTURE_GAP_MS = 220
const BOTTOM_WHEEL_ABSORB_CAP_PX = 120


export function PanelScrollArea({
  children,
  className = '',
  viewportClassName = '',
  onBottomEdgeChange,
  onOverflowChange,
  propagateWheelToPage = false,
  innerScrollEnabled = true,
  pinRailToViewport = false,
  pinnedRailClassName,
  pinnedRailStyle,
  panelRailClassName,
  debugScrollLabel,
  scrollbarVisibleOnHoverOnly = false,
  scrollbarAutoHideAfterIdleMs,
}: PanelScrollAreaProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const pinnedRailWrapRef = useRef<HTMLDivElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [scrollHeightPx, setScrollHeightPx] = useState(0)
  const [clientHeightPx, setClientHeightPx] = useState(0)
  const [scrollTopPx, setScrollTopPx] = useState(0)
  const draggingRef = useRef(false)
  const onBottomEdgeChangeRef = useRef(onBottomEdgeChange)
  onBottomEdgeChangeRef.current = onBottomEdgeChange
  const onOverflowChangeRef = useRef(onOverflowChange)
  onOverflowChangeRef.current = onOverflowChange
  const atBottomStickyRef = useRef(false)
  const [atBottomSticky, setAtBottomSticky] = useState(false)
  const prevOverflowRef = useRef<boolean | null>(null)
  /** После паузы между жестами трекпада — можно крутить страницу с низа (см. propagateWheelToPage). */
  const bottomWheelAllowPageChainRef = useRef(false)
  const bottomWheelIdleTimerRef = useRef<ReturnType<typeof setTimeout> | 0>(0)
  const bottomWheelAbsorbedPxRef = useRef(0)
  const wheelLogCountRef = useRef(0)
  const innerScrollEnabledRef = useRef(innerScrollEnabled)
  const propagateWheelToPageRef = useRef(propagateWheelToPage)
  innerScrollEnabledRef.current = innerScrollEnabled
  propagateWheelToPageRef.current = propagateWheelToPage

  const activityHideTimerRef = useRef<ReturnType<typeof setTimeout> | 0>(0)
  const [activityReveal, setActivityReveal] = useState(false)
  const [thumbDragging, setThumbDragging] = useState(false)
  const scrollbarAutoHideAfterIdleMsRef = useRef(scrollbarAutoHideAfterIdleMs)
  scrollbarAutoHideAfterIdleMsRef.current = scrollbarAutoHideAfterIdleMs

  const bumpActivityReveal = useCallback(() => {
    const ms = scrollbarAutoHideAfterIdleMsRef.current
    if (ms == null) return
    setActivityReveal(true)
    if (activityHideTimerRef.current) {
      window.clearTimeout(activityHideTimerRef.current)
      activityHideTimerRef.current = 0
    }
    activityHideTimerRef.current = window.setTimeout(() => {
      activityHideTimerRef.current = 0
      setActivityReveal(false)
    }, ms)
  }, [])

  const bumpActivityRevealRef = useRef(bumpActivityReveal)
  bumpActivityRevealRef.current = bumpActivityReveal

  useEffect(() => {
    return () => {
      if (activityHideTimerRef.current) {
        window.clearTimeout(activityHideTimerRef.current)
        activityHideTimerRef.current = 0
      }
    }
  }, [])

  const dbg = useCallback(
    (msg: string, extra?: Record<string, unknown>) => {
      if (!import.meta.env.DEV || !debugScrollLabel) return
      // eslint-disable-next-line no-console
      console.log(`[PanelScrollArea:${debugScrollLabel}] ${msg}`, extra ?? '')
    },
    [debugScrollLabel],
  )

  const readMetrics = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    let stRaw = el.scrollTop
    const scrollHeight = Math.round(el.scrollHeight)
    const clientHeight = Math.round(el.clientHeight)
    const maxScroll = Math.max(0, scrollHeight - clientHeight)
    if (maxScroll > 0 && stRaw > maxScroll) {
      el.scrollTop = maxScroll
      stRaw = maxScroll
    }
    setScrollTopPx(Math.round(stRaw))
    setScrollHeightPx(scrollHeight)
    setClientHeightPx(clientHeight)
    const canScroll = maxScroll > SCROLL_SLACK_PX
    const wasStickyBottom = atBottomStickyRef.current
    let atBottom: boolean
    if (!canScroll) {
      atBottom = false
    } else if (wasStickyBottom) {
      atBottom = stRaw >= maxScroll - BOTTOM_LEAVE_PX
    } else {
      atBottom = stRaw >= maxScroll - BOTTOM_ENTER_PX
    }

    const clearBottomWheelIdle = () => {
      if (bottomWheelIdleTimerRef.current) {
        window.clearTimeout(bottomWheelIdleTimerRef.current)
        bottomWheelIdleTimerRef.current = 0
      }
    }

    // Сброс цепочки только при уходе с низа. Сброс при «входе» ломал: после таймера allow=true
    // отскок резинового скролла снова давал false→true и обнулял разрешение — страница не крутилась.
    if (!atBottom) {
      bottomWheelAllowPageChainRef.current = false
      bottomWheelAbsorbedPxRef.current = 0
      clearBottomWheelIdle()
    }

    const cb = onBottomEdgeChangeRef.current
    const prevSticky = atBottomStickyRef.current
    if (atBottom !== prevSticky) {
      dbg('atBottomSticky changed', {
        from: prevSticky,
        to: atBottom,
        stRaw: Math.round(stRaw * 100) / 100,
        maxScroll,
        canScroll,
        scrollH: scrollHeight,
        clientH: clientHeight,
      })
      atBottomStickyRef.current = atBottom
      setAtBottomSticky(atBottom)
      cb?.(atBottom)
    }

    const hasOverflow = scrollHeight - clientHeight > SCROLL_SLACK_PX
    const ob = onOverflowChangeRef.current
    if (ob && prevOverflowRef.current !== hasOverflow) {
      prevOverflowRef.current = hasOverflow
      ob(hasOverflow)
    }
  }, [dbg])

  const scrollRafRef = useRef(0)
  const scheduleReadMetrics = useCallback(() => {
    if (scrollRafRef.current) return
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = 0
      readMetrics()
    })
  }, [readMetrics])

  useEffect(() => {
    const el = viewportRef.current
    const content = contentRef.current
    if (!el) return

    readMetrics()
    const onScrollViewport = () => {
      scheduleReadMetrics()
      bumpActivityRevealRef.current()
    }
    el.addEventListener('scroll', onScrollViewport, { passive: true })

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(readMetrics)
    })
    ro.observe(el)
    if (content) ro.observe(content)

    return () => {
      el.removeEventListener('scroll', onScrollViewport)
      ro.disconnect()
      cancelAnimationFrame(scrollRafRef.current)
      scrollRafRef.current = 0
    }
  }, [readMetrics, scheduleReadMetrics])

  useEffect(() => {
    readMetrics()
  }, [innerScrollEnabled, readMetrics])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const clearBottomWheelIdle = () => {
      if (bottomWheelIdleTimerRef.current) {
        window.clearTimeout(bottomWheelIdleTimerRef.current)
        bottomWheelIdleTimerRef.current = 0
      }
    }

    if (import.meta.env.DEV && debugScrollLabel) {
      dbg('wheel listener setup', {
        stableDeps: true,
        propagateWheelToPage,
        passive: false,
        capture: true,
      })
    }

    const onWheel = (e: WheelEvent) => {
      const n = ++wheelLogCountRef.current
      const innerOn = innerScrollEnabledRef.current
      const prop = propagateWheelToPageRef.current

      if (!innerOn) {
        dbg(`wheel#${n} innerScrollEnabled=false → page`, { deltaY: e.deltaY })
        e.preventDefault()
        getPageScrollElement().scrollTop += e.deltaY
        return
      }

      {
        const mh = el.scrollHeight - el.clientHeight
        if (mh > SCROLL_SLACK_PX && e.deltaY !== 0) bumpActivityRevealRef.current()
      }

      if (!prop) {
        const maxLocal = el.scrollHeight - el.clientHeight
        if (maxLocal <= SCROLL_SLACK_PX) return
        let stLocal = el.scrollTop
        if (stLocal > maxLocal) {
          el.scrollTop = maxLocal
          stLocal = maxLocal
        }
        const atTopLocal = stLocal <= SCROLL_SLACK_PX
        const atBottomLocal = stLocal >= maxLocal - SCROLL_SLACK_PX
        if (e.deltaY > 0 && atBottomLocal) {
          e.preventDefault()
        } else if (e.deltaY < 0 && atTopLocal) {
          e.preventDefault()
        }
        return
      }

      const max = el.scrollHeight - el.clientHeight
      if (max <= SCROLL_SLACK_PX) {
        dbg(`wheel#${n} SKIP (no overflow, max<=slack)`, {
          max,
          deltaY: e.deltaY,
          scrollH: el.scrollHeight,
          clientH: el.clientHeight,
        })
        return
      }

      let st = el.scrollTop
      if (st > max) {
        el.scrollTop = max
        st = max
      }
      const atTop = st <= SCROLL_SLACK_PX
      const wasBottom = atBottomStickyRef.current
      const atBottom = wasBottom ? st >= max - BOTTOM_LEAVE_PX : st >= max - BOTTOM_ENTER_PX
      const pageEl = getPageScrollElement()
      const allow = bottomWheelAllowPageChainRef.current

      if (e.deltaY < 0 && atBottom) {
        dbg(`wheel#${n} atBottom + deltaY<0 → reset allow+timer`, { st, max })
        bottomWheelAllowPageChainRef.current = false
        bottomWheelAbsorbedPxRef.current = 0
        clearBottomWheelIdle()
      }

      if (e.deltaY > 0 && atBottom) {
        dbg(`wheel#${n} atBottom + deltaY>0`, {
          st,
          max,
          threshold: wasBottom ? max - BOTTOM_LEAVE_PX : max - BOTTOM_ENTER_PX,
          refStickyBottom: wasBottom,
          allowPageChain: allow,
          deltaY: e.deltaY,
          deltaMode: e.deltaMode,
          target: (e.target as Node) === el ? 'viewport' : 'child',
          defaultPreventedBefore: e.defaultPrevented,
        })
        e.preventDefault()
        let allowChain = allow
        if (!allowChain) {
          bottomWheelAbsorbedPxRef.current += Math.abs(e.deltaY)
          clearBottomWheelIdle()
          if (bottomWheelAbsorbedPxRef.current >= BOTTOM_WHEEL_ABSORB_CAP_PX) {
            bottomWheelAllowPageChainRef.current = true
            bottomWheelAbsorbedPxRef.current = 0
            allowChain = true
            dbg(`wheel#${n} → ABSORB cap reached → allowPageChain=true`, {
              capPx: BOTTOM_WHEEL_ABSORB_CAP_PX,
            })
          } else {
            bottomWheelIdleTimerRef.current = window.setTimeout(() => {
              bottomWheelIdleTimerRef.current = 0
              bottomWheelAllowPageChainRef.current = true
              bottomWheelAbsorbedPxRef.current = 0
              dbg('idle timer fired → allowPageChain=true', {
                gapMs: BOTTOM_WHEEL_GESTURE_GAP_MS,
              })
            }, BOTTOM_WHEEL_GESTURE_GAP_MS)
            dbg(`wheel#${n} → ABSORB (cap ${bottomWheelAbsorbedPxRef.current.toFixed(0)}/${BOTTOM_WHEEL_ABSORB_CAP_PX}, gap ${BOTTOM_WHEEL_GESTURE_GAP_MS}ms)`)
            if (el.scrollTop > max) {
              el.scrollTop = max
            }
            return
          }
        }
        const before = pageEl.scrollTop
        pageEl.scrollTop += e.deltaY
        if (el.scrollTop > max) {
          el.scrollTop = max
        }
        dbg(`wheel#${n} → CHAIN to page`, {
          pageScrollTopBefore: before,
          pageScrollTopAfter: pageEl.scrollTop,
          deltaY: e.deltaY,
        })
        return
      }

      if (e.deltaY < 0 && atTop) {
        dbg(`wheel#${n} atTop + deltaY<0 → chain to page up`, { st, deltaY: e.deltaY })
        e.preventDefault()
        getPageScrollElement().scrollTop += e.deltaY
      }
    }

    const wheelOpts = { passive: false as const, capture: true as const }
    el.addEventListener('wheel', onWheel, wheelOpts)
    return () => {
      if (import.meta.env.DEV && debugScrollLabel) {
        dbg('wheel listener removed')
      }
      el.removeEventListener('wheel', onWheel, wheelOpts)
      clearBottomWheelIdle()
    }
  }, [dbg, debugScrollLabel])

  const maxScroll = Math.max(1, scrollHeightPx - clientHeightPx)
  const scroll01 = Math.max(0, Math.min(1, scrollTopPx / maxScroll))
  const thumbPct =
    scrollHeightPx && clientHeightPx
      ? Math.max(6, Math.min(1, clientHeightPx / scrollHeightPx) * 100)
      : 0

  const scrollToPct = (pct01: number) => {
    const el = viewportRef.current
    if (!el) return
    const clamped = Math.max(0, Math.min(1, pct01))
    el.scrollTo({ top: clamped * maxScroll, behavior: 'auto' })
  }

  const scrollFromClientY = (clientY: number) => {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top))
    const thumbPx = (thumbPct / 100) * rect.height
    const denom = Math.max(1, rect.height - thumbPx)
    const pct01 = Math.max(0, Math.min(1, (y - thumbPx / 2) / denom))
    scrollToPct(pct01)
  }

  const innerOverflow = clientHeightPx > 0 && scrollHeightPx - clientHeightPx > SCROLL_SLACK_PX
  /** У сетки товаров у низа скролл отдаётся странице — ползунок скрывают. Панели без цепочки на страницу показывают ползунок и на 100%. */
  const needsScrollbar =
    innerScrollEnabled &&
    innerOverflow &&
    (propagateWheelToPage ? !atBottomSticky : true)

  const [scrollbarHoverActive, setScrollbarHoverActive] = useState(false)

  const pointerChromeHover =
    scrollbarVisibleOnHoverOnly || scrollbarAutoHideAfterIdleMs != null

  const onPanelPointerEnter = useCallback(() => {
    if (pointerChromeHover) setScrollbarHoverActive(true)
  }, [pointerChromeHover])

  const onPanelPointerLeave = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointerChromeHover || draggingRef.current) return
      const rt = e.relatedTarget as Node | null
      if (rt && pinnedRailWrapRef.current?.contains(rt)) return
      setScrollbarHoverActive(false)
    },
    [pointerChromeHover],
  )

  const onRailPointerEnter = useCallback(() => {
    if (pointerChromeHover) setScrollbarHoverActive(true)
  }, [pointerChromeHover])

  const onRailPointerLeave = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointerChromeHover || draggingRef.current) return
      const rt = e.relatedTarget as Node | null
      if (rt && wrapperRef.current?.contains(rt)) return
      setScrollbarHoverActive(false)
    },
    [pointerChromeHover],
  )

  /** Пока есть переполнение — рельс остаётся в DOM (важно для pinRailToViewport: иначе при уходе с панели к полосе рельс размонтируется и «исчезает» под курсором). */
  const mountScrollbar = needsScrollbar
  /** Скрытие только визуальное: без скролла/наведения/перетаскивания полоса прозрачна. */
  const opaqueScrollbar =
    !pointerChromeHover ||
    scrollbarHoverActive ||
    activityReveal ||
    thumbDragging

  const trackEl = mountScrollbar ? (
    <div
      className={`${scrollbarTrackSlotWrapperClass} transition-opacity duration-200 ease-out ${
        opaqueScrollbar ? 'opacity-100' : 'opacity-0'
      }`.trim()}
    >
      <div
        ref={trackRef}
        className={`pointer-events-auto ${scrollbarTrackClass}`}
        role="presentation"
        tabIndex={-1}
        onPointerDown={(e) => {
          draggingRef.current = true
          setThumbDragging(true)
          bumpActivityRevealRef.current()
          ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
          scrollFromClientY(e.clientY)
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current) return
          scrollFromClientY(e.clientY)
        }}
        onPointerUp={(e) => {
          draggingRef.current = false
          setThumbDragging(false)
          try {
            ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
          } catch {
            // ignore
          }
          if (scrollbarVisibleOnHoverOnly || scrollbarAutoHideAfterIdleMs != null) {
            const { clientX, clientY } = e
            requestAnimationFrame(() => {
              if (draggingRef.current) return
              const under = document.elementFromPoint(clientX, clientY)
              const over =
                !!under &&
                Boolean(
                  wrapperRef.current?.contains(under) ||
                    pinnedRailWrapRef.current?.contains(under),
                )
              setScrollbarHoverActive(over)
            })
          }
        }}
        onPointerCancel={() => {
          draggingRef.current = false
          setThumbDragging(false)
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
  ) : null

  const pinnedRailClass = pinnedRailClassName ?? viewportPinnedScrollbarRailClass

  const pinnedRail =
    mountScrollbar && pinRailToViewport
      ? createPortal(
          <div
            ref={pinnedRailWrapRef}
            className={`${pinnedRailClass}${pointerChromeHover ? ' !pointer-events-auto' : ''}`.trim()}
            style={pinnedRailStyle}
            aria-hidden
            onPointerEnter={onRailPointerEnter}
            onPointerLeave={onRailPointerLeave}
          >
            {trackEl}
          </div>,
          document.body,
        )
      : null

  return (
    <div
      ref={wrapperRef}
      className={`relative min-h-0 ${className}`.trim()}
      onPointerEnter={onPanelPointerEnter}
      onPointerLeave={onPanelPointerLeave}
    >
      <div
        ref={viewportRef}
        className={`no-native-scrollbar h-full min-h-0 overflow-y-auto ${viewportClassName}`.trim()}
      >
        <div ref={contentRef} className="block min-w-0">
          {children}
        </div>
      </div>

      {mountScrollbar && pinRailToViewport ? pinnedRail : null}

      {mountScrollbar && !pinRailToViewport ? (
        <div
          className={`${panelRailClassName ?? panelScrollbarRailClass}${
            pointerChromeHover ? ' !pointer-events-auto' : ''
          }`.trim()}
          aria-hidden
        >
          {trackEl}
        </div>
      ) : null}
    </div>
  )
}
