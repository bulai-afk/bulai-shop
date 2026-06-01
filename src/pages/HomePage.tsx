import { useEffect, useRef, useState } from 'react'
import { CategoryPreviews } from '../components/CategoryPreviews'
import { PageScrollbar } from '../components/PageScrollbar'
import { PopularProducts } from '../components/PopularProducts'
import { FaqAccordion } from '../components/FaqAccordion'
import { AdvantagesGrid } from '../components/AdvantagesGrid'
import { FeaturesGrid } from '../components/FeaturesGrid'
import { Hero } from '../components/Hero'
import { useStorefrontPromoMaterials } from '../context/StorefrontSettingsContext'
import { useBlockRevealProgress, useHeroRevealProgress } from '../hooks/useBlockRevealProgress'

/** Нижняя граница фиксированной шапки: DeliveryPromoBar + Navbar = 6.5rem. */
const NAVBAR_STACK_HEIGHT_PX = 104
/** Порог «вперёд» (вниз) для стабильной докрутки между первыми секциями. */
const SNAP_FORWARD_THRESHOLD = 0.72
/** Порог «назад» (вверх): ниже — гистерезис, отпускание раньше, как раньше ощущалось нормально. */
const SNAP_BACK_THRESHOLD = 0.48
const ENABLE_PROGRESS_SNAP = false
const ENABLE_STEP_WHEEL_SCROLL = false

/** Шапка и футер — в `Layout`. Отступ контента под фикс. шапку: `pt-[6.5rem]` в `Layout` для `/`. */
export function HomePage() {
  const promo = useStorefrontPromoMaterials()
  const heroRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLElement | null>(null)
  const advantagesRef = useRef<HTMLElement | null>(null)
  const categoryRef = useRef<HTMLElement | null>(null)
  const popularRef = useRef<HTMLElement | null>(null)
  const faqRef = useRef<HTMLElement | null>(null)

  const [sectionsTotalHeightPx, setSectionsTotalHeightPx] = useState<number | null>(null)

  useEffect(() => {
    const measure = () => {
      const h = (el: HTMLElement | null) => (el ? Math.round(el.getBoundingClientRect().height) : null)
      const footerEl = document.querySelector('footer') as HTMLElement | null

      const total =
        (h(heroRef.current) ?? 0) +
        (h(featuresRef.current) ?? 0) +
        (h(categoryRef.current) ?? 0) +
        (h(popularRef.current) ?? 0) +
        (h(advantagesRef.current) ?? 0) +
        (h(faqRef.current) ?? 0) +
        (h(footerEl) ?? 0)

      setSectionsTotalHeightPx(total || null)

      // eslint-disable-next-line no-console
      console.log('[HomePage] section heights (px)', {
        hero: h(heroRef.current),
        features: h(featuresRef.current),
        advantages: h(advantagesRef.current),
        categories: h(categoryRef.current),
        popular: h(popularRef.current),
        faq: h(faqRef.current),
        footer: h(footerEl),
        total,
      })
    }

    const raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
  }, [])

  const prevHeroProgressRef = useRef<number | null>(null)
  const featuresSnapDoneRef = useRef(false)
  const heroSnapDoneRef = useRef(false)

  const prevFeaturesProgressRef = useRef<number | null>(null)
  const categorySnapDoneRef = useRef(false)
  const featuresSnapBackFromCategoryRef = useRef(false)

  const prevCategoryProgressRef = useRef<number | null>(null)
  const popularSnapDoneRef = useRef(false)
  const categorySnapBackFromPopularRef = useRef(false)

  const prevPopularProgressRef = useRef<number | null>(null)
  const faqSnapDoneRef = useRef(false)
  const popularSnapBackFromFaqRef = useRef(false)

  const heroRevealProgress = useHeroRevealProgress(heroRef)
  const featuresRevealProgress = useBlockRevealProgress(featuresRef)
  const categoryRevealProgress = useBlockRevealProgress(categoryRef)
  /** Вся секция включая сетку товаров и блок «доставка / возврат / …» — иначе докрутка к FAQ срабатывала слишком рано. */
  const popularRevealProgress = useBlockRevealProgress(popularRef, 1)

  const reachedNavbarLine = (el: HTMLElement | null) =>
    !!el && el.getBoundingClientRect().top <= NAVBAR_STACK_HEIGHT_PX

  useEffect(() => {
    if (!ENABLE_STEP_WHEEL_SCROLL) return
    const sections = [
      heroRef.current,
      featuresRef.current,
      categoryRef.current,
      popularRef.current,
      advantagesRef.current,
      faqRef.current,
    ].filter(Boolean) as HTMLElement[]

    if (!sections.length) return

    let locked = false
    let unlockTimer = 0
    let wheelAcc = 0
    let wheelIdleTimer = 0
    const WHEEL_TRIGGER = 110
    const SNAP_LOCK_MS = 1800
    const GESTURE_IDLE_MS = 420
    let lastSnapAt = 0
    let snapIndex: number | null = null
    let snappedInCurrentGesture = false

    const nearestSectionIndex = () => {
      let idx = 0
      let bestDist = Number.POSITIVE_INFINITY
      for (let i = 0; i < sections.length; i += 1) {
        const dist = Math.abs(sections[i].getBoundingClientRect().top - NAVBAR_STACK_HEIGHT_PX)
        if (dist < bestDist) {
          bestDist = dist
          idx = i
        }
      }
      return idx
    }

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 4 || e.ctrlKey || locked) return
      if (Date.now() - lastSnapAt < SNAP_LOCK_MS) return

      wheelAcc += e.deltaY
      window.clearTimeout(wheelIdleTimer)
      wheelIdleTimer = window.setTimeout(() => {
        wheelAcc = 0
        snappedInCurrentGesture = false
      }, GESTURE_IDLE_MS)

      // Один жест (пока wheel не "успокоился") = один переход между блоками.
      if (snappedInCurrentGesture) return

      if (Math.abs(wheelAcc) < WHEEL_TRIGGER) return

      const curr = snapIndex ?? nearestSectionIndex()
      const direction = wheelAcc > 0 ? 1 : -1
      wheelAcc = 0
      const next =
        direction > 0 ? Math.min(sections.length - 1, curr + 1) : Math.max(0, curr - 1)

      if (next === curr) return
      e.preventDefault()
      locked = true
      lastSnapAt = Date.now()
      snapIndex = next
      snappedInCurrentGesture = true
      sections[next].scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.clearTimeout(unlockTimer)
      unlockTimer = window.setTimeout(() => {
        locked = false
        wheelAcc = 0
      }, SNAP_LOCK_MS)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.clearTimeout(unlockTimer)
      window.clearTimeout(wheelIdleTimer)
    }
  }, [])

  /** Hero → «Почему мы»: вниз — по порогу прогресса (стабильнее), вверх — по SNAP_BACK_THRESHOLD. */
  useEffect(() => {
    if (!ENABLE_PROGRESS_SNAP) return
    const curr = heroRevealProgress
    const prev = prevHeroProgressRef.current

    if (prev === null) {
      prevHeroProgressRef.current = curr
      return
    }

    if (curr < SNAP_BACK_THRESHOLD) {
      featuresSnapDoneRef.current = false
    }
    if (curr >= SNAP_FORWARD_THRESHOLD) {
      heroSnapDoneRef.current = false
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const behavior = reduced ? ('auto' as const) : ('smooth' as const)

    if (curr >= SNAP_FORWARD_THRESHOLD && !featuresSnapDoneRef.current) {
      featuresSnapDoneRef.current = true
      const el = featuresRef.current
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior, block: 'start' })
        })
      }
    }

    if (
      prev >= SNAP_BACK_THRESHOLD &&
      curr < SNAP_BACK_THRESHOLD &&
      !heroSnapDoneRef.current
    ) {
      heroSnapDoneRef.current = true
      const el = heroRef.current
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior, block: 'start' })
        })
      }
    }

    prevHeroProgressRef.current = curr
  }, [heroRevealProgress])

  /** «Почему мы» → категории: вниз — по порогу прогресса (стабильнее), вверх — по SNAP_BACK_THRESHOLD. */
  useEffect(() => {
    if (!ENABLE_PROGRESS_SNAP) return
    const curr = featuresRevealProgress
    const prev = prevFeaturesProgressRef.current

    if (prev === null) {
      prevFeaturesProgressRef.current = curr
      return
    }

    if (curr < SNAP_BACK_THRESHOLD) {
      categorySnapDoneRef.current = false
    }
    if (curr >= SNAP_FORWARD_THRESHOLD) {
      featuresSnapBackFromCategoryRef.current = false
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const behavior = reduced ? ('auto' as const) : ('smooth' as const)

    if (curr >= SNAP_FORWARD_THRESHOLD && !categorySnapDoneRef.current) {
      categorySnapDoneRef.current = true
      const el = categoryRef.current
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior, block: 'start' })
        })
      }
    }

    if (
      prev >= SNAP_BACK_THRESHOLD &&
      curr < SNAP_BACK_THRESHOLD &&
      !featuresSnapBackFromCategoryRef.current
    ) {
      featuresSnapBackFromCategoryRef.current = true
      const el = featuresRef.current
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior, block: 'start' })
        })
      }
    }

    prevFeaturesProgressRef.current = curr
  }, [featuresRevealProgress])

  /** Категории → «Популярные товары»: вниз — по порогу прогресса (стабильнее), вверх — по SNAP_BACK_THRESHOLD. */
  useEffect(() => {
    if (!ENABLE_PROGRESS_SNAP) return
    const curr = categoryRevealProgress
    const prev = prevCategoryProgressRef.current

    if (prev === null) {
      prevCategoryProgressRef.current = curr
      return
    }

    if (curr < SNAP_BACK_THRESHOLD) {
      popularSnapDoneRef.current = false
    }
    if (curr >= SNAP_FORWARD_THRESHOLD) {
      categorySnapBackFromPopularRef.current = false
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const behavior = reduced ? ('auto' as const) : ('smooth' as const)

    if (curr >= SNAP_FORWARD_THRESHOLD && !popularSnapDoneRef.current) {
      popularSnapDoneRef.current = true
      const el = popularRef.current
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior, block: 'start' })
        })
      }
    }

    if (
      prev >= SNAP_BACK_THRESHOLD &&
      curr < SNAP_BACK_THRESHOLD &&
      !categorySnapBackFromPopularRef.current
    ) {
      categorySnapBackFromPopularRef.current = true
      const el = categoryRef.current
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior, block: 'start' })
        })
      }
    }

    prevCategoryProgressRef.current = curr
  }, [categoryRevealProgress])

  /**
   * Блок «Наши преимущества» (промо) → FAQ: триггер по верхней кромке секции с картинками.
   */
  useEffect(() => {
    if (!ENABLE_PROGRESS_SNAP) return
    const curr = popularRevealProgress
    const prev = prevPopularProgressRef.current

    if (prev === null) {
      prevPopularProgressRef.current = curr
      return
    }

    if (curr < SNAP_BACK_THRESHOLD) {
      faqSnapDoneRef.current = false
    }
    if (reachedNavbarLine(advantagesRef.current)) {
      popularSnapBackFromFaqRef.current = false
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const behavior = reduced ? ('auto' as const) : ('smooth' as const)

    if (reachedNavbarLine(advantagesRef.current) && !faqSnapDoneRef.current) {
      faqSnapDoneRef.current = true
      const el = faqRef.current
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior, block: 'start' })
        })
      }
    }

    if (
      prev >= SNAP_BACK_THRESHOLD &&
      curr < SNAP_BACK_THRESHOLD &&
      !popularSnapBackFromFaqRef.current
    ) {
      popularSnapBackFromFaqRef.current = true
      const el = popularRef.current
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior, block: 'start' })
        })
      }
    }

    prevPopularProgressRef.current = curr
  }, [popularRevealProgress])

  return (
    <>
      <PageScrollbar
        virtualContentHeight={
          sectionsTotalHeightPx ? sectionsTotalHeightPx + NAVBAR_STACK_HEIGHT_PX : null
        }
      />

      <div ref={heroRef} className="min-h-0 scroll-mt-[6.5rem]">
        <Hero />
      </div>
      <FeaturesGrid
        ref={featuresRef}
        block={promo.homeFeatures}
        headingId="features-heading"
        tone="primary"
      />
      <CategoryPreviews ref={categoryRef} />
      <PopularProducts ref={popularRef} />
      <AdvantagesGrid
        ref={advantagesRef}
        block={promo.homeAdvantages}
        headingId="advantages-heading"
        tone="secondary"
      />
      <FaqAccordion ref={faqRef} />
    </>
  )
}
