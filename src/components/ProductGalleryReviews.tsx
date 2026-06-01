import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { PanelScrollArea } from './PanelScrollArea'
import { postProductReview } from '../api/reviewsApi'
import { useAuth } from '../context/AuthContext'
import { useMainScrollbarSuppression } from '../context/MainScrollbarSuppressionContext'
import { useProductReviews, notifyReviewsUpdated } from '../hooks/useProductReviews'
import { getPageScrollElement } from '../utils/getPageScrollElement'
import { WriteReviewDialog, type WriteReviewProductPreview } from './WriteReviewDialog'

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const PAGE_SCROLL_BOTTOM_SLACK_PX = 4

type Props = {
  productId: string
  productRating: number
  reviewCount: number
  productPreview?: WriteReviewProductPreview | null
}

export function ProductGalleryReviews({
  productId,
  productRating,
  reviewCount,
  productPreview,
}: Props) {
  const headingId = useId().replace(/:/g, '')
  const [reviewStarsFilter, setReviewStarsFilter] = useState<number | null>(null)
  const reviewsSidebarRef = useRef<HTMLDivElement>(null)
  const [reviewsListViewportHeightPx, setReviewsListViewportHeightPx] = useState<number | null>(null)
  const [pageScrollAtBottom, setPageScrollAtBottom] = useState(false)
  const { setHideMainScrollbarForCatalogBottom } = useMainScrollbarSuppression()
  const [writeReviewOpen, setWriteReviewOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { isAuthenticated, openAuthDialog } = useAuth()
  const { reviews: recentReviews, productRating: apiRating, reviewCount: apiCount, reload } =
    useProductReviews(productId)

  const displayRating = apiRating ?? productRating
  const displayCount = apiCount ?? reviewCount
  const total = recentReviews.length

  const countByStar = recentReviews.reduce<Record<number, number>>((acc, r) => {
    acc[r.rating] = (acc[r.rating] ?? 0) + 1
    return acc
  }, {})

  const breakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: countByStar[stars] ?? 0,
  }))

  const pct = (count: number) => (total === 0 ? 0 : Math.round((count / total) * 100))

  const filteredRecentReviews =
    reviewStarsFilter === null
      ? recentReviews
      : recentReviews.filter((review) => review.rating === reviewStarsFilter)

  const roundedSummary = Math.round(displayRating * 2) / 2

  const reviewsListExtraPx = 28
  const reviewsListHeightPx =
    reviewsListViewportHeightPx != null
      ? Math.max(reviewsListViewportHeightPx + reviewsListExtraPx, 388)
      : 448

  useLayoutEffect(() => {
    const el = reviewsSidebarRef.current
    if (!el) return
    const update = () => {
      requestAnimationFrame(() => {
        const h = el.getBoundingClientRect().height
        if (h > 0) setReviewsListViewportHeightPx(Math.round(h))
      })
    }
    update()
    const ro = new ResizeObserver(() => update())
    ro.observe(el)
    return () => ro.disconnect()
  }, [reviewStarsFilter])

  useEffect(() => {
    const scroller = getPageScrollElement()
    const pageScrollRafRef = { current: 0 }
    const update = () => {
      const st = scroller.scrollTop
      const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
      const atBottom =
        maxScroll <= PAGE_SCROLL_BOTTOM_SLACK_PX || st >= maxScroll - PAGE_SCROLL_BOTTOM_SLACK_PX
      setPageScrollAtBottom(atBottom)
    }
    const schedule = () => {
      if (pageScrollRafRef.current) return
      pageScrollRafRef.current = requestAnimationFrame(() => {
        pageScrollRafRef.current = 0
        update()
      })
    }
    update()
    scroller.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      scroller.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(pageScrollRafRef.current)
      pageScrollRafRef.current = 0
    }
  }, [])

  useEffect(() => {
    setHideMainScrollbarForCatalogBottom(pageScrollAtBottom)
    return () => setHideMainScrollbarForCatalogBottom(false)
  }, [pageScrollAtBottom, setHideMainScrollbarForCatalogBottom])

  return (
    <section
      aria-labelledby={`product-reviews-${headingId}`}
      className="mt-12 scroll-mt-[6.5rem] bg-gray-900 sm:mt-16"
    >
      <div className="px-4 pt-10 pb-5 sm:px-6 sm:pb-6 lg:px-8">
        <div className="w-full overflow-hidden rounded-lg">
          <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-8">
            <div ref={reviewsSidebarRef} className="lg:col-span-4">
              <h2
                id={`product-reviews-${headingId}`}
                className="text-center text-2xl font-bold tracking-tight text-white lg:text-left"
              >
                Отзывы о товаре
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-y-1">
                <div>
                  <div
                    className="flex items-center"
                    aria-label={`Рейтинг ${displayRating.toFixed(1)} из 5`}
                  >
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFull = roundedSummary >= star
                      const isHalf = !isFull && roundedSummary + 0.5 === star

                      if (isFull) {
                        return (
                          <span key={star} aria-hidden className="text-amber-300">
                            ★
                          </span>
                        )
                      }
                      if (isHalf) {
                        return (
                          <span key={star} aria-hidden className="relative inline-block text-gray-600">
                            ★
                            <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden text-amber-300">
                              ★
                            </span>
                          </span>
                        )
                      }
                      return (
                        <span key={star} aria-hidden className="text-gray-600">
                          ★
                        </span>
                      )
                    })}
                  </div>
                  <p className="sr-only">{displayRating.toFixed(1)} из 5</p>
                </div>
                <p className="ml-3 text-sm font-semibold text-white">{displayRating.toFixed(1)}</p>
                <p className="ml-4 text-sm text-white">
                  На основе {displayCount.toLocaleString('ru-RU')} отзывов
                </p>
              </div>

              <div className="mt-6">
                <h3 className="sr-only">Распределение оценок</h3>

                <dl className="space-y-3">
                  {breakdown.map((row) => {
                    const percent = pct(row.count)
                    const active = reviewStarsFilter === row.stars
                    return (
                      <div key={row.stars} className="text-sm">
                        <button
                          type="button"
                          onClick={() =>
                            setReviewStarsFilter((prev) => (prev === row.stars ? null : row.stars))
                          }
                          aria-pressed={active}
                          className={classNames(
                            'flex w-full items-center rounded-md px-1.5 py-1 transition focus:outline-none focus:ring-2 focus:ring-indigo-500',
                            active ? 'bg-white/10' : 'hover:bg-white/5',
                          )}
                        >
                          <dt className="flex flex-1 items-center">
                            <div className="flex w-[5.25rem] items-center gap-0.5" aria-hidden>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <span
                                  key={s}
                                  className={s <= row.stars ? 'text-amber-300' : 'text-gray-600'}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                            <span className="sr-only">{row.stars} звёзд</span>

                            <div aria-hidden className="ml-3 flex flex-1 items-center">
                              <div className="relative flex-1">
                                <div className="h-3 rounded-full border border-white/10 bg-white/5" />
                                <div
                                  className={classNames(
                                    'absolute inset-y-0 left-0 h-3 rounded-full',
                                    active ? 'bg-amber-300' : 'bg-amber-300/80',
                                  )}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          </dt>
                          <dd className="ml-3 w-10 text-right text-sm tabular-nums text-white/90">
                            {percent}%
                          </dd>
                        </button>
                      </div>
                    )
                  })}
                </dl>

                {reviewStarsFilter !== null ? (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setReviewStarsFilter(null)}
                      className="text-sm font-semibold text-indigo-300 hover:text-indigo-200"
                    >
                      Сбросить фильтр
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="mt-10">
                <h3 className="text-base font-semibold text-white">Поделитесь мнением</h3>
                <p className="mt-1 text-sm text-gray-300">
                  Если вы покупали у нас, оставьте отзыв — это помогает другим выбрать.
                </p>
                {submitError ? <p className="mt-3 text-sm text-red-400">{submitError}</p> : null}
                <button
                  type="button"
                  onClick={() => {
                    setSubmitError(null)
                    if (!isAuthenticated) {
                      openAuthDialog({ mode: 'signin' })
                      return
                    }
                    setWriteReviewOpen(true)
                  }}
                  className="mt-6 w-full rounded-lg bg-slate-700/65 px-4 py-2.5 text-center text-sm font-semibold text-gray-100 transition hover:bg-slate-600/75"
                >
                  Написать отзыв
                </button>
              </div>
            </div>

            <div
              className="mt-16 w-full overflow-hidden lg:col-span-7 lg:col-start-6 lg:mt-0"
              style={{ height: reviewsListHeightPx }}
            >
              <PanelScrollArea
                className="h-full min-h-0"
                viewportClassName="pr-1 sm:pr-3"
                innerScrollEnabled={pageScrollAtBottom}
                propagateWheelToPage
              >
                <h3 className="sr-only">Последние отзывы</h3>

                <div className="flow-root">
                  <div className="-my-6 divide-y divide-white/10">
                    {filteredRecentReviews.length === 0 ? (
                      <p className="py-8 text-center text-sm text-gray-400">
                        Пока нет отзывов об этом товаре. Будьте первым.
                      </p>
                    ) : null}
                    {filteredRecentReviews.map((review) => (
                      <div key={review.id} className="py-6">
                        <div className="flex items-center">
                          <img
                            src={review.avatar}
                            alt={`${review.name}.`}
                            className="h-12 w-12 rounded-full"
                          />
                          <div className="ml-4">
                            <h4 className="text-sm font-bold text-white">{review.name}</h4>
                            <div className="mt-1 flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  aria-hidden
                                  className={star <= review.rating ? 'text-amber-300' : 'text-gray-700'}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                            <p className="sr-only">{review.rating} из 5</p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-6 text-base italic text-gray-300">
                          <p>{review.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </PanelScrollArea>
            </div>
          </div>
        </div>
      </div>

      <WriteReviewDialog
        open={writeReviewOpen}
        onClose={() => setWriteReviewOpen(false)}
        productPreview={productPreview}
        onSubmit={async (payload) => {
          setSubmitError(null)
          try {
            await postProductReview(productId, payload)
            notifyReviewsUpdated()
            await reload()
          } catch {
            setSubmitError('Не удалось отправить отзыв. Войдите в аккаунт и попробуйте снова.')
          }
        }}
      />
    </section>
  )
}
