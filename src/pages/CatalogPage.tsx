import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from '@headlessui/react'
import { ArrowsUpDownIcon, XMarkIcon } from '@heroicons/react/24/outline'
import {
  ChevronDownIcon,
  FunnelIcon,
  MinusIcon,
  PlusIcon,
  Squares2X2Icon,
} from '@heroicons/react/20/solid'
import { useSearchParams } from 'react-router-dom'
import { CatalogProductCard } from '../components/CatalogProductCard'
import { WriteReviewDialog } from '../components/WriteReviewDialog'
import { PanelScrollArea } from '../components/PanelScrollArea'
import { catalogFiltersPinnedScrollbarRailClass } from '../components/scrollbarShared'
import { useCatalogInventory } from '../context/CatalogInventoryContext'
import { useMainScrollbarSuppression } from '../context/MainScrollbarSuppressionContext'
import { getPageScrollElement } from '../utils/getPageScrollElement'

import { CATALOG_KEY_DETAILS_SLUG_ORDER } from '../constants/catalogCategoryPromo'
import { useStorefrontPromoMaterials } from '../context/StorefrontSettingsContext'
import {
  parseCategoriesFromQueryParam,
  categoriesToQueryParam,
  type ProductMeta,
  type CategoryOption,
} from '../data/catalogProducts'
import { categoryVisualBySlug } from '../utils/categoryVisualsStorefront'
import { postStoreReview } from '../api/reviewsApi'
import { useAuth } from '../context/AuthContext'
import { useStoreReviews, notifyReviewsUpdated } from '../hooks/useStoreReviews'

const CATEGORY_OPTIONS: CategoryOption[] = ['новинки', 'майки', 'рубашки', 'брюки']
const SIZE_OPTIONS = ['L', 'XL', 'XXL'] as const
const FIT_OPTIONS: ProductMeta['fit'][] = ['slim', 'regular', 'relaxed', 'wide']
const FIT_LABELS: Record<ProductMeta['fit'], string> = {
  slim: 'Приталенная',
  regular: 'Стандартная',
  relaxed: 'Свободная',
  wide: 'Широкая',
}
const MATERIAL_OPTIONS: ProductMeta['material'][] = ['хлопок', 'деним', 'смесовая', 'лен']
const SEASON_OPTIONS: ProductMeta['season'][] = ['лето', 'деми', 'зима']

const PRODUCTS_PER_PAGE = 16
type SortOption = 'popular' | 'priceAsc' | 'priceDesc' | 'rating'

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const SORT_OPTIONS: Array<{ value: SortOption; name: string }> = [
  { value: 'popular', name: 'По популярности' },
  { value: 'rating', name: 'По рейтингу' },
  { value: 'priceAsc', name: 'Цена: по возрастанию' },
  { value: 'priceDesc', name: 'Цена: по убыванию' },
]

const CatalogProductsBar = memo(function CatalogProductsBar({
  sortBy,
  onSortChange,
  onMobileFiltersOpen,
  gridDense,
  onToggleGridDensity,
}: {
  sortBy: SortOption
  onSortChange: (v: SortOption) => void
  onMobileFiltersOpen: () => void
  /** true: 2 колонки на телефоне, 4 на ПК; false: 1 и 2 соответственно */
  gridDense: boolean
  onToggleGridDensity: () => void
}) {
  return (
    <div className="relative z-10 shrink-0 border-b border-white/10 bg-gray-900">
      <div className="flex h-16 items-center justify-between gap-4 sm:gap-5 lg:h-[4.25rem] lg:gap-8">
        <div className="min-w-0 flex-1 sm:flex-none lg:min-w-[12rem]">
          <h1 className="text-center text-2xl font-semibold tracking-tight text-white sm:text-left sm:text-3xl">
            Каталог товаров
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          <Menu as="div" className="relative inline-block text-left">
            <MenuButton
              type="button"
              className="group inline-flex shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0.5 text-gray-400 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              <span className="sr-only">Сортировка</span>
              <ArrowsUpDownIcon aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
            </MenuButton>
            <MenuItems
              transition
              className="absolute right-0 z-20 mt-2 w-52 origin-top-right rounded-md bg-[#0d1b2a] p-1 shadow-2xl ring-1 ring-white/10 transition focus:outline-none data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
            >
              {SORT_OPTIONS.map((option) => (
                <MenuItem key={option.value}>
                  <button
                    type="button"
                    onClick={() => onSortChange(option.value)}
                    className={classNames(
                      sortBy === option.value ? 'font-medium text-white' : 'text-gray-300',
                      'block w-full rounded-md px-3 py-2 text-left text-sm data-focus:bg-white/10',
                    )}
                  >
                    {option.name}
                  </button>
                </MenuItem>
              ))}
            </MenuItems>
          </Menu>

          <button
            type="button"
            aria-pressed={gridDense}
            aria-label={
              gridDense
                ? 'Показать крупнее: одна карточка в ряд на телефоне, две на ПК'
                : 'Показать сеткой: две карточки на телефоне, четыре на ПК'
            }
            title={gridDense ? 'Крупные карточки' : 'Плотная сетка'}
            onClick={onToggleGridDensity}
            className="-m-2 inline-flex shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-2 text-indigo-400 outline-none transition-colors hover:text-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 [text-shadow:0_0_14px_rgba(129,140,248,0.45)] hover:[text-shadow:0_0_18px_rgba(165,180,252,0.55)]"
          >
            <span className="sr-only">
              {gridDense ? 'Переключить на крупные карточки' : 'Переключить на плотную сетку'}
            </span>
            {gridDense ? (
              <Squares2X2Icon aria-hidden className="size-5" />
            ) : (
              <>
                <span
                  aria-hidden
                  className="flex size-5 items-center justify-center lg:hidden"
                >
                  <span className="size-[14px] rounded-[3px] bg-indigo-400 ring-1 ring-indigo-300/60 shadow-[0_0_10px_rgba(129,140,248,0.75),0_0_18px_rgba(129,140,248,0.4)]" />
                </span>
                <span
                  aria-hidden
                  className="hidden size-5 items-center justify-center gap-0.5 lg:inline-flex"
                >
                  <span className="size-2 rounded-[2px] bg-current opacity-95 shadow-[0_0_8px_rgba(129,140,248,0.55)]" />
                  <span className="size-2 rounded-[2px] bg-current opacity-95 shadow-[0_0_8px_rgba(129,140,248,0.55)]" />
                </span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onMobileFiltersOpen}
            className="-m-2 p-2 text-gray-400 hover:bg-white/5 hover:text-white lg:hidden"
          >
            <span className="sr-only">Открыть фильтры</span>
            <FunnelIcon aria-hidden className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
})

export function CatalogPage() {
  const { products, metaById } = useCatalogInventory()
  const { catalogKeyDetailsSection, categoryVisuals } = useStorefrontPromoMaterials()
  const { reviews: storeReviews, reload: reloadStoreReviews } = useStoreReviews()
  const { isAuthenticated, openAuthDialog } = useAuth()
  const getScroller = () => getPageScrollElement()

  const lastVisibleCardRef = useRef<HTMLLIElement | null>(null)
  const reviewsSectionRef = useRef<HTMLElement | null>(null)
  const reviewsSidebarRef = useRef<HTMLDivElement | null>(null)
  const [reviewsListViewportHeightPx, setReviewsListViewportHeightPx] = useState<number | null>(null)

  const [activeColorByProduct, setActiveColorByProduct] = useState<Record<string, string>>(() =>
    Object.fromEntries(products.map((product) => [product.id, product.colors[0]?.name ?? ''])),
  )

  useEffect(() => {
    setActiveColorByProduct(
      Object.fromEntries(products.map((product) => [product.id, product.colors[0]?.name ?? ''])),
    )
  }, [products])

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [catalogGridDense, setCatalogGridDense] = useState(true)
  const toggleCatalogGridDensity = useCallback(() => setCatalogGridDense((d) => !d), [])
  const [reviewStarsFilter, setReviewStarsFilter] = useState<number | null>(null)
  const [writeReviewOpen, setWriteReviewOpen] = useState(false)
  const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(null)
  const [productPanelAtBottom, setProductPanelAtBottom] = useState(false)
  /** Удерживает «низ панели» после кратких false от гистерезиса — иначе основной скроллбар мигает. */
  const [productPanelAtBottomDebounced, setProductPanelAtBottomDebounced] = useState(false)
  const [productPanelOverflow, setProductPanelOverflow] = useState<boolean | null>(null)
  const [pageScrollAtBottom, setPageScrollAtBottom] = useState(false)
  /** Внутренний скролл сетки/фильтров только пока страница у верха; иначе колесо крутит документ. */
  const [catalogInnerScrollEnabled, setCatalogInnerScrollEnabled] = useState(true)

  const { setBlockPageScrollbarForCatalog, setHideMainScrollbarForCatalogBottom } =
    useMainScrollbarSuppression()

  const PAGE_SCROLL_BOTTOM_SLACK_PX = 4
  /** Включаем внутренний скролл только у самого верха страницы; выключаем с гистерезисом — без дрожания при мелком page scroll. */
  const CATALOG_PAGE_TOP_ON_PX = 0.5
  /** Больше зазор — меньше переключений при первых пикселях скролла с кастомного скроллбара. */
  const CATALOG_PAGE_TOP_OFF_PX = 56

  useEffect(() => {
    const scroller = getScroller()
    const pageScrollRafRef = { current: 0 }
    const update = () => {
      const st = scroller.scrollTop
      const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
      const atBottom =
        maxScroll <= PAGE_SCROLL_BOTTOM_SLACK_PX || st >= maxScroll - PAGE_SCROLL_BOTTOM_SLACK_PX
      setPageScrollAtBottom(atBottom)
      startTransition(() => {
        setCatalogInnerScrollEnabled((prev) => {
          if (st < CATALOG_PAGE_TOP_ON_PX) return true
          if (st > CATALOG_PAGE_TOP_OFF_PX) return false
          return prev
        })
      })
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

  useEffect(() => {
    if (productPanelAtBottom) {
      setProductPanelAtBottomDebounced(true)
          return
        }
    const t = window.setTimeout(() => setProductPanelAtBottomDebounced(false), 120)
    return () => window.clearTimeout(t)
  }, [productPanelAtBottom])

  const blockCatalogScrollbarPrevRef = useRef<boolean | null>(null)

  useEffect(() => {
    if (productPanelOverflow === null) return
    const block =
      catalogInnerScrollEnabled && productPanelOverflow && !productPanelAtBottomDebounced
    if (import.meta.env.DEV && blockCatalogScrollbarPrevRef.current !== block) {
      blockCatalogScrollbarPrevRef.current = block
      // eslint-disable-next-line no-console
      console.log('[CatalogPage] blockPageScrollbarForCatalog', block, {
        catalogInnerScrollEnabled,
        productPanelOverflow,
        productPanelAtBottom,
        productPanelAtBottomDebounced,
      })
    }
    setBlockPageScrollbarForCatalog(block)
  }, [
    catalogInnerScrollEnabled,
    productPanelOverflow,
    productPanelAtBottomDebounced,
    setBlockPageScrollbarForCatalog,
  ])

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

  const [searchParams, setSearchParams] = useSearchParams()
  const [categories, setCategories] = useState<CategoryOption[]>(() =>
    parseCategoriesFromQueryParam(searchParams.get('category')),
  )
  const [sizes, setSizes] = useState<string[]>([])
  const [colors, setColors] = useState<string[]>([])
  const [priceFrom, setPriceFrom] = useState('')
  const [priceTo, setPriceTo] = useState('')
  const [fit, setFit] = useState<ProductMeta['fit'] | ''>('')
  const [material, setMaterial] = useState<ProductMeta['material'] | ''>('')
  const [season, setSeason] = useState<ProductMeta['season'] | ''>('')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('popular')
  const [currentPage, setCurrentPage] = useState(1)

  /** До отрисовки: чтобы при переходе с ?category= фильтр и раскрытие «Категория» были согласованы. */
  useLayoutEffect(() => {
    const parsed = parseCategoriesFromQueryParam(searchParams.get('category'))
    setCategories((prev) =>
      prev.length === parsed.length && prev.every((c, i) => c === parsed[i]) ? prev : parsed,
    )
  }, [searchParams])

  const categoryParam = searchParams.get('category') ?? ''
  const categoryDisclosureKey = useMemo(
    () => `${categoryParam}:${[...categories].sort().join(',')}`,
    [categoryParam, categories],
  )

  const toggleCategory = useCallback(
    (option: CategoryOption) => {
      const next = categories.includes(option)
        ? categories.filter((c) => c !== option)
        : [...categories, option]
      setCategories(next)
      setSearchParams(
        (p) => {
          const n = new URLSearchParams(p)
          const q = categoriesToQueryParam(next)
          if (q) n.set('category', q)
          else n.delete('category')
          return n
        },
        { replace: true },
      )
    },
    [categories, setSearchParams],
  )

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    if (mobileFiltersOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = prevOverflow || ''
    }

    return () => {
      document.body.style.overflow = prevOverflow || ''
    }
  }, [mobileFiltersOpen])

  const allColors = useMemo(
    () => Array.from(new Set(products.flatMap((product) => product.colors.map((color) => color.name)))),
    [products],
  )

  const filteredProducts = useMemo(() => {
    const from = priceFrom.trim() === '' ? null : Number(priceFrom)
    const to = priceTo.trim() === '' ? null : Number(priceTo)

    const base = products.filter((product) => {
      const meta = metaById[product.id]
      if (!meta) return false

      const productPrice = Number(product.price.replace(/[^\d]/g, ''))
      const hasCategory =
        categories.length === 0 ||
        categories.some((c) => (c === 'новинки' ? meta.isNew : meta.category === c))
      const hasSize = sizes.length === 0 || sizes.some((size) => product.sizes.includes(size))
      const hasColor = colors.length === 0 || product.colors.some((c) => colors.includes(c.name))
      const hasPriceFrom = from === null || productPrice >= from
      const hasPriceTo = to === null || productPrice <= to
      const hasFit = fit === '' || meta.fit === fit
      const hasMaterial = material === '' || meta.material === material
      const hasSeason = season === '' || meta.season === season
      const hasStock = !inStockOnly || meta.inStock

      return (
        hasCategory &&
        hasSize &&
        hasColor &&
        hasPriceFrom &&
        hasPriceTo &&
        hasFit &&
        hasMaterial &&
        hasSeason &&
        hasStock
      )
    })

    const sorted = [...base]
    if (sortBy === 'priceAsc') {
      sorted.sort((a, b) => Number(a.price.replace(/[^\d]/g, '')) - Number(b.price.replace(/[^\d]/g, '')))
    } else if (sortBy === 'priceDesc') {
      sorted.sort((a, b) => Number(b.price.replace(/[^\d]/g, '')) - Number(a.price.replace(/[^\d]/g, '')))
    } else if (sortBy === 'rating') {
      sorted.sort((a, b) => b.rating - a.rating)
    } else {
      sorted.sort((a, b) => b.reviews - a.reviews)
    }
    return sorted
  }, [
    products,
    metaById,
    categories,
    sizes,
    colors,
    priceFrom,
    priceTo,
    fit,
    material,
    season,
    inStockOnly,
    sortBy,
  ])

  useEffect(() => {
    setCurrentPage(1)
  }, [categories, sizes, colors, priceFrom, priceTo, fit, material, season, inStockOnly, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE))
  const pageStart = (currentPage - 1) * PRODUCTS_PER_PAGE
  const visibleProducts = filteredProducts.slice(pageStart, pageStart + PRODUCTS_PER_PAGE)

  const toggleArrayValue = (value: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  const hasActiveFilters = useMemo(
    () =>
      categories.length > 0 ||
      sizes.length > 0 ||
      colors.length > 0 ||
      priceFrom.trim() !== '' ||
      priceTo.trim() !== '' ||
      fit !== '' ||
      material !== '' ||
      season !== '' ||
      inStockOnly,
    [
      categories,
      sizes,
      colors,
      priceFrom,
      priceTo,
      fit,
      material,
      season,
      inStockOnly,
    ],
  )

  const resetFilters = () => {
    setCategories([])
    setSizes([])
    setColors([])
    setPriceFrom('')
    setPriceTo('')
    setFit('')
    setMaterial('')
    setSeason('')
    setInStockOnly(false)
    setSortBy('popular')
    setSearchParams(
      (p) => {
        const n = new URLSearchParams(p)
        n.delete('category')
        return n
      },
      { replace: true },
    )
  }

  return (
    <section className="pt-0">
      <Dialog
        open={mobileFiltersOpen}
        onClose={setMobileFiltersOpen}
        className="relative z-[210] lg:hidden"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 z-[210] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-linear data-closed:opacity-0"
        />
        <div className="fixed inset-0 z-[210] flex">
          <DialogPanel
            transition
            className="relative z-[211] ml-auto flex h-full w-full max-w-xs transform flex-col overflow-y-auto bg-[#0d1b2a] pt-4 pb-6 shadow-xl ring-1 ring-white/10 transition duration-300 ease-in-out data-closed:translate-x-full"
          >
            <div className="flex items-center justify-between px-4">
              <h2 className="text-lg font-semibold text-white">Фильтра</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="relative -mr-2 flex h-10 w-10 items-center justify-center rounded-md text-gray-300 hover:bg-white/10 hover:text-white"
              >
                <span className="sr-only">Закрыть фильтры</span>
                <XMarkIcon aria-hidden className="size-6" />
              </button>
            </div>

            <form className="mt-4 border-t border-white/10 px-4 pb-4">
              <div className="border-b border-white/10 py-4">
                <p className="mb-3 text-sm font-medium text-gray-100">Цена</p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={priceFrom}
                    onChange={(e) => setPriceFrom(e.target.value)}
                    placeholder="от"
                    className="w-full rounded-md bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 ring-1 ring-inset ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    value={priceTo}
                    onChange={(e) => setPriceTo(e.target.value)}
                    placeholder="до"
                    className="w-full rounded-md bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 ring-1 ring-inset ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <Disclosure
                key={categoryDisclosureKey}
                as="div"
                className="border-b border-white/10 py-4"
                defaultOpen={categories.length > 0}
              >
                <h3 className="-my-3 flow-root">
                  <DisclosureButton className="group flex w-full items-center justify-between py-3 text-sm text-gray-400 hover:text-gray-300">
                    <span className="font-medium text-gray-100">Категория</span>
                    <span className="ml-6 flex items-center">
                      <PlusIcon aria-hidden className="size-5 group-data-open:hidden" />
                      <MinusIcon aria-hidden className="size-5 group-not-data-open:hidden" />
                    </span>
                  </DisclosureButton>
                </h3>
                <DisclosurePanel className="pt-4">
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleCategory(option)}
                        className={`rounded-md px-3 py-1.5 text-sm transition ${
                          categories.includes(option)
                            ? 'bg-indigo-500 text-white'
                            : 'border border-white/10 text-gray-200 hover:bg-white/10'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </DisclosurePanel>
              </Disclosure>

              <Disclosure as="div" className="border-b border-white/10 py-4">
                <h3 className="-my-3 flow-root">
                  <DisclosureButton className="group flex w-full items-center justify-between py-3 text-sm text-gray-400 hover:text-gray-300">
                    <span className="font-medium text-gray-100">Размер</span>
                    <span className="ml-6 flex items-center">
                      <PlusIcon aria-hidden className="size-5 group-data-open:hidden" />
                      <MinusIcon aria-hidden className="size-5 group-not-data-open:hidden" />
                    </span>
                  </DisclosureButton>
                </h3>
                <DisclosurePanel className="pt-4">
                  <div className="flex flex-wrap gap-2">
                    {SIZE_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleArrayValue(option, sizes, setSizes)}
                        className={`rounded-md px-3 py-1.5 text-sm transition ${
                          sizes.includes(option)
                            ? 'bg-indigo-500 text-white'
                            : 'border border-white/10 text-gray-200 hover:bg-white/10'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </DisclosurePanel>
              </Disclosure>

              <Disclosure as="div" className="border-b border-white/10 py-4">
                <h3 className="-my-3 flow-root">
                  <DisclosureButton className="group flex w-full items-center justify-between py-3 text-sm text-gray-400 hover:text-gray-300">
                    <span className="font-medium text-gray-100">Цвет</span>
                    <span className="ml-6 flex items-center">
                      <PlusIcon aria-hidden className="size-5 group-data-open:hidden" />
                      <MinusIcon aria-hidden className="size-5 group-not-data-open:hidden" />
                    </span>
                  </DisclosureButton>
                </h3>
                <DisclosurePanel className="pt-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {allColors.map((colorName) => {
                      const swatch = products.flatMap((p) => p.colors).find((c) => c.name === colorName)
                      const active = colors.includes(colorName)

                      return (
                        <button
                          key={colorName}
                          type="button"
                          onClick={() => toggleArrayValue(colorName, colors, setColors)}
                          aria-label={colorName}
                          aria-pressed={active}
                          className={`h-7 w-7 rounded-full border border-white/80 ${
                            swatch?.className ?? 'bg-gray-500'
                          } ${active ? 'shadow-[0_0_0_2px_rgba(129,140,248,0.95),0_0_12px_rgba(129,140,248,0.65)]' : ''}`}
                          title={colorName}
                        />
                      )
                    })}
                  </div>
                </DisclosurePanel>
              </Disclosure>

              <Disclosure as="div" className="border-b border-white/10 py-4">
                <h3 className="-my-3 flow-root">
                  <DisclosureButton className="group flex w-full items-center justify-between py-3 text-sm text-gray-400 hover:text-gray-300">
                    <span className="font-medium text-gray-100">Дополнительные параметры</span>
                    <span className="ml-6 flex items-center">
                      <PlusIcon aria-hidden className="size-5 group-data-open:hidden" />
                      <MinusIcon aria-hidden className="size-5 group-not-data-open:hidden" />
                    </span>
                  </DisclosureButton>
                </h3>
                <DisclosurePanel className="pt-4">
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-100">Посадка</p>
                      <div className="relative">
                        <select
                          value={fit}
                          onChange={(e) => setFit(e.target.value as ProductMeta['fit'] | '')}
                          className="w-full appearance-none rounded-md bg-white/5 py-2 pl-3 pr-10 text-sm text-gray-100 ring-1 ring-inset ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Все</option>
                          {FIT_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {FIT_LABELS[option]}
                            </option>
                          ))}
                        </select>
                        <ChevronDownIcon
                          aria-hidden
                          className="pointer-events-none absolute top-1/2 right-2.5 size-5 -translate-y-1/2 text-gray-400"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-100">Материал</p>
                      <div className="relative">
                        <select
                          value={material}
                          onChange={(e) => setMaterial(e.target.value as ProductMeta['material'] | '')}
                          className="w-full appearance-none rounded-md bg-white/5 py-2 pl-3 pr-10 text-sm text-gray-100 ring-1 ring-inset ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Все</option>
                          {MATERIAL_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <ChevronDownIcon
                          aria-hidden
                          className="pointer-events-none absolute top-1/2 right-2.5 size-5 -translate-y-1/2 text-gray-400"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-100">Сезон</p>
                      <div className="relative">
                        <select
                          value={season}
                          onChange={(e) => setSeason(e.target.value as ProductMeta['season'] | '')}
                          className="w-full appearance-none rounded-md bg-white/5 py-2 pl-3 pr-10 text-sm text-gray-100 ring-1 ring-inset ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Все</option>
                          {SEASON_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <ChevronDownIcon
                          aria-hidden
                          className="pointer-events-none absolute top-1/2 right-2.5 size-5 -translate-y-1/2 text-gray-400"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={inStockOnly}
                      onClick={() => setInStockOnly((v) => !v)}
                      className="flex w-full items-center justify-between gap-3 pt-1"
                    >
                      <span className="text-sm text-gray-200">Только в наличии</span>
                      <span
                        aria-hidden
                        className={`relative h-6 w-10 rounded-full transition ${
                          inStockOnly ? 'bg-indigo-500' : 'bg-white/15'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform ${
                            inStockOnly ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  </div>
                </DisclosurePanel>
              </Disclosure>

              <div className="mt-2 flex flex-col gap-3">
                <p className="text-sm text-gray-300">Найдено товаров: {filteredProducts.length}</p>
                {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                    className="w-full rounded-md border border-white/10 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-white/10"
                >
                  Сбросить
                </button>
                ) : null}
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      <div className="mt-0 w-full min-w-0 px-4 pt-0 sm:px-6 lg:px-8">

        <section
          aria-labelledby="products-heading"
          className="scroll-mt-[6.5rem] flex h-[calc(100dvh-6.5rem)] min-h-0 flex-col overflow-hidden bg-gray-900"
        >
          <CatalogProductsBar
            sortBy={sortBy}
            onSortChange={setSortBy}
            onMobileFiltersOpen={() => setMobileFiltersOpen(true)}
            gridDense={catalogGridDense}
            onToggleGridDensity={toggleCatalogGridDensity}
          />

          <h2 id="products-heading" className="sr-only">
            Товары
          </h2>

          <div className="grid min-h-0 flex-1 auto-rows-[minmax(0,1fr)] grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-4 lg:items-stretch lg:gap-x-10 lg:gap-y-0 xl:gap-x-12">
            <PanelScrollArea
              className="relative z-40 hidden min-h-0 h-full max-h-full lg:block"
              viewportClassName="pr-1 lg:pt-1 lg:pr-2"
              pinRailToViewport
              pinnedRailClassName={catalogFiltersPinnedScrollbarRailClass}
              propagateWheelToPage={false}
              scrollbarVisibleOnHoverOnly
              innerScrollEnabled={catalogInnerScrollEnabled}
              debugScrollLabel="catalog-filters"
            >
              <form className="pr-2 lg:pr-4">
              <h3 className="sr-only">Фильтры</h3>

              <div className="border-b border-white/10 py-6">
                <p className="mb-2 text-sm font-semibold text-gray-200">Цена</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={priceFrom}
                    onChange={(e) => setPriceFrom(e.target.value)}
                    placeholder="от"
                    className="w-full rounded-md bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 ring-1 ring-inset ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    value={priceTo}
                    onChange={(e) => setPriceTo(e.target.value)}
                    placeholder="до"
                    className="w-full rounded-md bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 ring-1 ring-inset ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <Disclosure
                key={categoryDisclosureKey}
                as="div"
                className="border-b border-white/10 py-6"
                defaultOpen={categories.length > 0}
              >
                <h3 className="-my-3 flow-root">
                  <DisclosureButton className="group flex w-full items-center justify-between py-3 text-sm text-gray-400 hover:text-gray-300">
                    <span className="font-medium text-gray-100">Категория</span>
                    <span className="ml-6 flex items-center">
                      <PlusIcon aria-hidden className="size-5 group-data-open:hidden" />
                      <MinusIcon aria-hidden className="size-5 group-not-data-open:hidden" />
                    </span>
                  </DisclosureButton>
                </h3>
                <DisclosurePanel className="pt-6">
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleCategory(option)}
                        className={`rounded-md px-3 py-1.5 text-sm transition ${
                          categories.includes(option)
                            ? 'bg-indigo-500 text-white'
                            : 'border border-white/10 text-gray-200 hover:bg-white/10'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </DisclosurePanel>
              </Disclosure>

              <Disclosure as="div" className="border-b border-white/10 py-6">
                <h3 className="-my-3 flow-root">
                  <DisclosureButton className="group flex w-full items-center justify-between py-3 text-sm text-gray-400 hover:text-gray-300">
                    <span className="font-medium text-gray-100">Размер</span>
                    <span className="ml-6 flex items-center">
                      <PlusIcon aria-hidden className="size-5 group-data-open:hidden" />
                      <MinusIcon aria-hidden className="size-5 group-not-data-open:hidden" />
                    </span>
                  </DisclosureButton>
                </h3>
                <DisclosurePanel className="pt-6">
                  <div className="flex flex-wrap gap-2">
                    {SIZE_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleArrayValue(option, sizes, setSizes)}
                        className={`rounded-md px-3 py-1.5 text-sm transition ${
                          sizes.includes(option)
                            ? 'bg-indigo-500 text-white'
                            : 'border border-white/10 text-gray-200 hover:bg-white/10'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </DisclosurePanel>
              </Disclosure>

              <Disclosure as="div" className="border-b border-white/10 py-6">
                <h3 className="-my-3 flow-root">
                  <DisclosureButton className="group flex w-full items-center justify-between py-3 text-sm text-gray-400 hover:text-gray-300">
                    <span className="font-medium text-gray-100">Цвет</span>
                    <span className="ml-6 flex items-center">
                      <PlusIcon aria-hidden className="size-5 group-data-open:hidden" />
                      <MinusIcon aria-hidden className="size-5 group-not-data-open:hidden" />
                    </span>
                  </DisclosureButton>
                </h3>
                <DisclosurePanel className="pt-6">
                  <div className="flex flex-wrap items-center gap-3">
                    {allColors.map((colorName) => {
                      const swatch = products.flatMap((p) => p.colors).find((c) => c.name === colorName)
                      const active = colors.includes(colorName)

                      return (
                        <button
                          key={colorName}
                          type="button"
                          onClick={() => toggleArrayValue(colorName, colors, setColors)}
                          aria-label={colorName}
                          aria-pressed={active}
                          className={`h-7 w-7 rounded-full border border-white/80 ${
                            swatch?.className ?? 'bg-gray-500'
                          } ${active ? 'shadow-[0_0_0_2px_rgba(129,140,248,0.95),0_0_12px_rgba(129,140,248,0.65)]' : ''}`}
                          title={colorName}
                        />
                      )
                    })}
                  </div>
                </DisclosurePanel>
              </Disclosure>

              <Disclosure as="div" className="border-b border-white/10 py-6">
                <h3 className="-my-3 flow-root">
                  <DisclosureButton className="group flex w-full items-center justify-between py-3 text-sm text-gray-400 hover:text-gray-300">
                    <span className="font-medium text-gray-100">Дополнительные параметры</span>
                    <span className="ml-6 flex items-center">
                      <PlusIcon aria-hidden className="size-5 group-data-open:hidden" />
                      <MinusIcon aria-hidden className="size-5 group-not-data-open:hidden" />
                    </span>
                  </DisclosureButton>
                </h3>
                <DisclosurePanel className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-sm font-semibold text-gray-200">Посадка</p>
                      <div className="relative">
                        <select
                          value={fit}
                          onChange={(e) => setFit(e.target.value as ProductMeta['fit'] | '')}
                          className="w-full appearance-none rounded-md bg-white/5 py-2 pl-3 pr-10 text-sm text-gray-100 ring-1 ring-inset ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Все</option>
                          {FIT_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {FIT_LABELS[option]}
                            </option>
                          ))}
                        </select>
                        <ChevronDownIcon
                          aria-hidden
                          className="pointer-events-none absolute top-1/2 right-2.5 size-5 -translate-y-1/2 text-gray-400"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-semibold text-gray-200">Материал</p>
                      <div className="relative">
                        <select
                          value={material}
                          onChange={(e) => setMaterial(e.target.value as ProductMeta['material'] | '')}
                          className="w-full appearance-none rounded-md bg-white/5 py-2 pl-3 pr-10 text-sm text-gray-100 ring-1 ring-inset ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Все</option>
                          {MATERIAL_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <ChevronDownIcon
                          aria-hidden
                          className="pointer-events-none absolute top-1/2 right-2.5 size-5 -translate-y-1/2 text-gray-400"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-semibold text-gray-200">Сезон</p>
                      <div className="relative">
                        <select
                          value={season}
                          onChange={(e) => setSeason(e.target.value as ProductMeta['season'] | '')}
                          className="w-full appearance-none rounded-md bg-white/5 py-2 pl-3 pr-10 text-sm text-gray-100 ring-1 ring-inset ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Все</option>
                          {SEASON_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <ChevronDownIcon
                          aria-hidden
                          className="pointer-events-none absolute top-1/2 right-2.5 size-5 -translate-y-1/2 text-gray-400"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={inStockOnly}
                      onClick={() => setInStockOnly((v) => !v)}
                      className="flex w-full items-center justify-between gap-3 pt-1"
                    >
                      <span className="text-sm text-gray-200">Только в наличии</span>
                      <span
                        aria-hidden
                        className={`relative h-6 w-10 rounded-full transition ${
                          inStockOnly ? 'bg-indigo-500' : 'bg-white/15'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform ${
                            inStockOnly ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  </div>
                </DisclosurePanel>
              </Disclosure>

              <div className="pt-6 pb-10">
                <p
                  className={`text-sm text-gray-300 ${hasActiveFilters ? 'mb-3' : ''}`}
                >
                  Найдено товаров: {filteredProducts.length}
                </p>
                {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full rounded-md border border-white/10 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-white/10"
                >
                  Сбросить фильтры
                </button>
                ) : null}
              </div>
            </form>
            </PanelScrollArea>

            <PanelScrollArea
              className="relative z-0 min-h-0 h-full max-h-full lg:col-span-3"
              viewportClassName="pt-4 pb-4 px-2 sm:px-3 lg:pl-2 lg:pr-4 lg:pt-5 lg:pb-8"
              pinRailToViewport
              onBottomEdgeChange={setProductPanelAtBottom}
              onOverflowChange={setProductPanelOverflow}
              propagateWheelToPage
              innerScrollEnabled={catalogInnerScrollEnabled}
              debugScrollLabel="catalog-products"
            >
              <ul
                className={classNames(
                  'grid gap-5 lg:gap-x-6 lg:gap-y-8',
                  catalogGridDense ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 lg:grid-cols-2',
                )}
              >
          {visibleProducts.map((product, idx) => {
            const meta = metaById[product.id]
            const isLast = idx === visibleProducts.length - 1

            return (
              <li
                key={product.id}
                ref={isLast ? lastVisibleCardRef : null}
                className="group min-w-0"
              >
                <CatalogProductCard
                  product={product}
                  meta={meta}
                  activeColorName={activeColorByProduct[product.id]}
                  onPickColor={(colorName) =>
                    setActiveColorByProduct((prev) => ({ ...prev, [product.id]: colorName }))
                  }
                />
              </li>
            )
          })}
              </ul>

              {filteredProducts.length > PRODUCTS_PER_PAGE ? (
                <nav aria-label="Пагинация каталога" className="mt-8 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Назад
                  </button>

                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      aria-current={currentPage === page ? 'page' : undefined}
                      className={`min-w-9 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                        currentPage === page
                          ? 'bg-indigo-500 text-white'
                          : 'border border-white/10 text-gray-200 hover:bg-white/10'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Вперед
                  </button>
                </nav>
              ) : null}
            </PanelScrollArea>
          </div>
        </section>

        <section
          aria-labelledby="features-heading"
          className="scroll-mt-[6.5rem] bg-gray-900"
        >
          <div className="w-full overflow-hidden rounded-lg">
            <div className="px-4 py-10 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center sm:text-left">
                <h2 id="features-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {catalogKeyDetailsSection.heading}
                </h2>
                <p className="mt-4 text-gray-300">{catalogKeyDetailsSection.lead}</p>
              </div>

              <TabGroup className="mt-8 block">
                <div className="-mx-4 flex overflow-x-auto sm:mx-0">
                  <div className="flex-auto border-b border-white/10 px-4 sm:px-0">
                    <TabList className="-mb-px flex space-x-10">
                      {CATALOG_KEY_DETAILS_SLUG_ORDER.map((slug) => {
                        const row = categoryVisualBySlug(categoryVisuals, slug)
                        const label = row?.displayName ?? slug
                        return (
                          <Tab
                            key={slug}
                            className={({ selected }) =>
                              classNames(
                                'whitespace-nowrap border-b-2 px-1 py-6 text-sm font-medium outline-none transition',
                                selected
                                  ? 'border-indigo-400 text-indigo-300'
                                  : 'border-transparent text-gray-400 hover:border-white/20 hover:text-gray-200',
                              )
                            }
                          >
                            {label}
                          </Tab>
                        )
                      })}
                    </TabList>
                  </div>
                </div>

                <TabPanels>
                  {CATALOG_KEY_DETAILS_SLUG_ORDER.map((slug) => {
                    const row = categoryVisualBySlug(categoryVisuals, slug)
                    const title = row?.keyDetailsTitle ?? ''
                    const body = row?.keyDetailsBody ?? ''
                    const img = row?.imageKeyDetails ?? ''
                    return (
                      <TabPanel key={slug} className="pt-10 outline-none">
                        <div className="flex flex-col-reverse gap-10 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-8">
                          <div className="lg:col-span-5">
                            <h3 className="text-lg font-medium text-white">{title}</h3>
                            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">{body}</p>
                          </div>
                          <div className="lg:col-span-7">
                            {img ? (
                              <img
                                src={img}
                                alt={title}
                                className="aspect-[5/2] w-full rounded-lg bg-white/5 object-cover"
                              />
                            ) : (
                              <div className="flex aspect-[5/2] w-full items-center justify-center rounded-lg bg-white/5 text-sm text-gray-500">
                                Добавьте фото в промо «Каталог»
                              </div>
                            )}
                          </div>
                        </div>
                      </TabPanel>
                    )
                  })}
                </TabPanels>
              </TabGroup>
            </div>
          </div>
        </section>

        <section
          ref={reviewsSectionRef}
          aria-labelledby="reviews-heading"
          className="scroll-mt-[6.5rem] bg-gray-900"
        >
            <div className="px-4 py-10 sm:px-6 lg:px-8">
            <div className="w-full overflow-hidden rounded-lg">
              {(() => {
                const recentReviews = storeReviews

                const total = recentReviews.length
                const avg = total === 0 ? 0 : recentReviews.reduce((acc, r) => acc + r.rating, 0) / total
                const rounded = Math.round(avg * 2) / 2
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

                const reviewsListExtraPx = 28
                const reviewsListHeightPx =
                  reviewsListViewportHeightPx != null
                    ? Math.max(reviewsListViewportHeightPx + reviewsListExtraPx, 388)
                    : 448

                return (
                  <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-8">
                    <div ref={reviewsSidebarRef} className="lg:col-span-4">
                      <div className="w-full text-center lg:text-left">
                        <h2
                          id="reviews-heading"
                          className="text-2xl font-bold tracking-tight text-white"
                        >
                          Отзывы покупателей
                        </h2>
                      </div>

                      <div className="mt-3 flex items-center">
                        <div>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const isFull = rounded >= star
                              const isHalf = !isFull && rounded + 0.5 === star

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
                          <p className="sr-only">{avg} из 5</p>
                        </div>
                        <p className="ml-3 text-sm font-semibold text-white">{avg.toFixed(1)}</p>
                        <p className="ml-4 text-sm text-white">На основе {total.toLocaleString('ru-RU')} отзывов</p>
                      </div>

                      <div className="mt-6">
                        <h3 className="sr-only">Review data</h3>

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
                                    <span className="sr-only">{row.stars} отзывов со звёздами</span>

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
                        {reviewSubmitError ? (
                          <p className="mt-3 text-sm text-red-400">{reviewSubmitError}</p>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setReviewSubmitError(null)
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
                              Пока нет отзывов. Будьте первым — нажмите «Написать отзыв».
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
                )
              })()}
            </div>
          </div>
        </section>

        <WriteReviewDialog
          open={writeReviewOpen}
          onClose={() => setWriteReviewOpen(false)}
          onSubmit={async (payload) => {
            setReviewSubmitError(null)
            try {
              await postStoreReview({ ...payload, productId: null })
              notifyReviewsUpdated()
              await reloadStoreReviews()
            } catch {
              setReviewSubmitError('Не удалось отправить отзыв. Войдите в аккаунт и попробуйте снова.')
            }
          }}
        />
      </div>
    </section>
  )
}
