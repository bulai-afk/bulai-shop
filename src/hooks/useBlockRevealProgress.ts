import { type RefObject, useEffect, useState } from 'react'

/** Доля высоты блока для «зоны» докрутки: прогресс 0→1 за первые 50% высоты блока. */
export const BLOCK_REVEAL_FRACTION = 0.5

/**
 * Прогресс прокрутки по высоте блока: 0 — верх блока у верха вьюпорта, 1 — прокручено `revealFraction` от высоты (по умолчанию 50% — см. {@link BLOCK_REVEAL_FRACTION}).
 * Для длинных секций можно передать `revealFraction={1}`, чтобы 0→1 шло за всю высоту (напр. «Популярные товары» с товарами + доставка/возврат).
 */
export function useBlockRevealProgress(
  blockRef: RefObject<HTMLElement | null>,
  revealFraction: number = BLOCK_REVEAL_FRACTION,
) {
  const [progress, setProgress] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 1
      : 0,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')

    let raf = 0
    const update = () => {
      if (mq.matches) {
        setProgress(1)
        return
      }
      const el = blockRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const h = rect.height
      if (h <= 0) return
      const scrolledPast = Math.max(0, -rect.top)
      const denom = Math.max(1e-6, revealFraction * h)
      setProgress(Math.min(1, scrolledPast / denom))
    }

    const onScrollOrResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }

    const onMq = () => {
      onScrollOrResize()
    }

    update()
    mq.addEventListener('change', onMq)
    // Скролл может жить как на `window` (обычно), так и на `body` (когда `html { overflow: hidden }`).
    // Чтобы не зависеть от конкретной модели браузера — слушаем оба источника.
    const scroller = document.scrollingElement
    window.addEventListener('scroll', onScrollOrResize, { passive: true })
    scroller?.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize)

    return () => {
      mq.removeEventListener('change', onMq)
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScrollOrResize)
      scroller?.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [blockRef, revealFraction])

  return progress
}

/** Алиас для hero-блока (та же логика, что useBlockRevealProgress). */
export function useHeroRevealProgress(heroRef: RefObject<HTMLElement | null>) {
  return useBlockRevealProgress(heroRef)
}
