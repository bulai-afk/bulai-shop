import { ElDialog, ElDialogBackdrop, ElDialogPanel } from '@tailwindplus/elements/react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { CURRENCY_OPTIONS, useCurrency } from '../context/CurrencyContext'
import { CATEGORY_QUERY_SLUG } from '../data/catalogProducts'
import { BulaiLogo } from './BulaiLogo'
import { FlagCircle } from './FlagCircle'

function closeMobileMenu() {
  const el = document.getElementById('mobile-menu')
  if (el && 'close' in el) (el as HTMLDialogElement).close()
}

const IMG = {
  m1: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-04-detail-product-shot-01.jpg',
  m2: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/category-page-02-image-card-06.jpg',
  m3: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-01.jpg',
  m4: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-02.jpg',
} as const

/** Временные категории в мегаменю (как плитки с картинкой); `category` совпадает с фильтром каталога. */
const MEGA_TILES = [
  {
    title: 'Новинки',
    href: `/catalog?category=${CATEGORY_QUERY_SLUG['новинки']}`,
    img: IMG.m1,
    alt: 'Новинки коллекции',
  },
  {
    title: 'Майки',
    href: `/catalog?category=${CATEGORY_QUERY_SLUG['майки']}`,
    img: IMG.m2,
    alt: 'Майки',
  },
  {
    title: 'Рубашки',
    href: `/catalog?category=${CATEGORY_QUERY_SLUG['рубашки']}`,
    img: IMG.m3,
    alt: 'Рубашки',
  },
  {
    title: 'Брюки',
    href: `/catalog?category=${CATEGORY_QUERY_SLUG['брюки']}`,
    img: IMG.m4,
    alt: 'Брюки',
  },
] as const

/** Тёмный фон шапки при скролле на главной (поверх hero). */
const NAV_SCROLLED_BG = 'bg-[#0d1b2a]'

/** «Стекло» вверху главной: лёгкое затемнение + blur — одно и то же для шапки и мегаменю. */
const HERO_TOP_GLASS = 'bg-[#0d1b2a]/15 backdrop-blur-xl backdrop-saturate-150'

type NavbarProps = {
  overlay?: boolean
  embeddedInFixedHeader?: boolean
}

type MegaOpen = 'men' | null

export function Navbar({
  overlay = false,
  embeddedInFixedHeader = false,
}: NavbarProps) {
  const { currency, setCurrency } = useCurrency()
  const { totalCount, openCart } = useCart()
  const location = useLocation()
  const headerRef = useRef<HTMLElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [megaOpen, setMegaOpen] = useState<MegaOpen>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMegaOpen(null)
  }, [location.pathname, location.search])

  useEffect(() => {
    setScrolled(window.scrollY > 12)
  }, [location.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMegaOpen(null)
    }
    const onPointer = (e: MouseEvent) => {
      const el = headerRef.current
      if (el && !el.contains(e.target as Node)) setMegaOpen(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [])

  /** Главная с hero: прозрачно → тёмно при скролле, светлый текст, лого фиолетовое. */
  const isHeroOverlay = overlay && embeddedInFixedHeader

  const navSurfaceDefault = `${NAV_SCROLLED_BG} shadow-sm shadow-black/20`
  const navSurfaceHeroScrolled = `${NAV_SCROLLED_BG} shadow-lg shadow-black/30`

  const shell = isHeroOverlay
    ? `transition-[background-color,box-shadow] duration-300 ease-out ${
        scrolled ? navSurfaceHeroScrolled : HERO_TOP_GLASS
      }`
    : `border-b border-white/10 ${navSurfaceDefault}`

  /** Нижняя линия под строкой навбара (в т.ч. на главной с hero). */
  const navBorder = 'border-b border-white/10'

  const navLinkBase =
    'text-sm/6 font-semibold text-gray-200 transition-colors hover:text-white'

  const navLinkActive = 'text-indigo-400'

  const megaTriggerBase =
    'relative flex items-center justify-center text-sm/6 font-semibold transition-colors duration-200 ease-out'
  const megaTriggerIdle = `${megaTriggerBase} text-gray-200 hover:text-white`
  const megaTriggerActive = `${megaTriggerBase} text-indigo-400`

  const megaLine = (on: boolean) =>
    `absolute inset-x-0 -bottom-px z-30 h-0.5 duration-200 ease-in ${on ? 'bg-indigo-400' : 'bg-transparent'}`

  const logoClass = 'inline-flex text-violet-400 transition-opacity hover:opacity-90'

  const toggleMega = (key: Exclude<MegaOpen, null>) => {
    setMegaOpen((prev) => (prev === key ? null : key))
  }

  const megaPanelLabelId = megaOpen === 'men' ? 'mega-trigger-men' : undefined

  return (
    <header ref={headerRef} className={`relative ${shell}`}>
      <nav aria-label="Основная навигация" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={navBorder}>
          <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-x-2 sm:gap-x-4">
            <div className="flex min-w-0 items-center justify-start gap-2">
              <button
                type="button"
                command="show-modal"
                commandfor="mobile-menu"
                className="relative -m-2 inline-flex shrink-0 items-center justify-center rounded-md p-2 text-gray-200 nav:hidden"
              >
                <span className="absolute -inset-0.5" />
                <span className="sr-only">Открыть меню</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  data-slot="icon"
                  aria-hidden
                  className="size-6"
                >
                  <path
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <div className="hidden nav:flex nav:h-full nav:items-stretch">
                <div className="flex h-full space-x-8">
                  <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                      `flex items-center ${navLinkBase} ${isActive ? navLinkActive : ''}`
                    }
                    onClick={() => setMegaOpen(null)}
                  >
                    Главная
                  </NavLink>
                  <div className="relative flex">
                    <button
                      id="mega-trigger-men"
                      type="button"
                      className={megaOpen === 'men' ? megaTriggerActive : megaTriggerIdle}
                      aria-expanded={megaOpen === 'men'}
                      aria-controls="desktop-mega-panel"
                      onClick={() => toggleMega('men')}
                    >
                      Мужское
                      <span aria-hidden className={megaLine(megaOpen === 'men')} />
                    </button>
                  </div>
                  <NavLink
                    to="/about"
                    className={({ isActive }) =>
                      `flex items-center ${navLinkBase} ${isActive ? navLinkActive : ''}`
                    }
                    onClick={() => setMegaOpen(null)}
                  >
                    О компании
                  </NavLink>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 justify-center translate-x-6 -translate-y-1 sm:translate-x-7 sm:-translate-y-1">
              <Link
                to="/"
                className={logoClass}
                aria-label="На главную"
                onClick={() => setMegaOpen(null)}
              >
                <span className="sr-only">Bulai Shop</span>
                <BulaiLogo
                  layout="navbar"
                  className="h-8 w-auto max-w-[min(100%,200px)] sm:h-8"
                />
              </Link>
            </div>

            <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-2">
              <button
                type="button"
                onClick={openCart}
                className="group -m-2 inline-flex h-10 items-center gap-2 rounded-md p-2 transition hover:bg-white/5"
                aria-label={
                  totalCount > 0 ? `Корзина, ${totalCount} поз.` : 'Открыть корзину'
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  data-slot="icon"
                  aria-hidden
                  className="size-6 shrink-0 text-gray-300 group-hover:opacity-90"
                >
                  <path
                    d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  className="tabular-nums text-sm font-medium leading-none text-gray-200 group-hover:opacity-90"
                >
                  {totalCount}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div
          className="hidden nav:grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
          style={{ gridTemplateRows: megaOpen ? '1fr' : '0fr' }}
        >
          <div
            className={`min-h-0 overflow-hidden text-sm text-gray-300 ${!megaOpen ? 'pointer-events-none' : ''}`}
            aria-hidden={!megaOpen}
          >
            <div
              id="desktop-mega-panel"
              role="region"
              aria-labelledby={megaPanelLabelId}
            >
              <div className={navBorder}>
                {megaOpen === 'men' ? (
                  <div className="mx-auto max-w-5xl py-12 sm:py-16">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4 lg:gap-x-8">
                      {MEGA_TILES.map((tile) => (
                        <MegaCard
                          key={tile.title}
                          img={tile.img}
                          alt={tile.alt}
                          title={tile.title}
                          href={tile.href}
                          onNavigate={() => setMegaOpen(null)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <ElDialog>
        <dialog id="mobile-menu" className="backdrop:bg-transparent nav:hidden">
          <ElDialogBackdrop className="fixed inset-0 z-[90] bg-black/25 transition-opacity duration-300 ease-linear data-closed:opacity-0" />
          <div tabIndex={0} className="fixed inset-0 z-[90] flex focus:outline-none">
            <ElDialogPanel className={`fixed inset-y-0 left-0 z-[100] flex w-full max-w-xs transform flex-col overflow-y-auto border-r border-white/10 pb-12 shadow-xl shadow-black/40 transition duration-300 ease-in-out data-closed:-translate-x-full ${HERO_TOP_GLASS}`}>
              <div className="flex px-4 pt-5 pb-2">
                <button
                  type="button"
                  command="close"
                  commandfor="mobile-menu"
                  className="relative -m-2 inline-flex items-center justify-center rounded-md p-2 text-gray-300 transition-colors hover:text-white"
                >
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Закрыть меню</span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    data-slot="icon"
                    aria-hidden
                    className="size-6"
                  >
                    <path
                      d="M6 18 18 6M6 6l12 12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              <div className="mt-2 space-y-10 px-4 pt-6 pb-8">
                <div className="grid grid-cols-2 gap-x-4 gap-y-10">
                  {MEGA_TILES.map((tile) => (
                    <MobileTile key={tile.title} img={tile.img} title={tile.title} href={tile.href} />
                  ))}
                </div>
              </div>

              <div className="space-y-6 border-t border-white/10 px-4 py-6">
                <Link
                  to="/"
                  className="-m-2 block p-2 font-medium text-gray-200 transition-colors hover:text-white"
                  onClick={closeMobileMenu}
                >
                  Главная
                </Link>
                <Link
                  to="/about"
                  className="-m-2 block p-2 font-medium text-gray-200 transition-colors hover:text-white"
                  onClick={closeMobileMenu}
                >
                  О компании
                </Link>
              </div>

              <div className="border-t border-white/10 px-4 py-6">
                <p className="px-2 pb-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                  Валюта
                </p>
                <div className="space-y-1">
                  {CURRENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      aria-label={opt.code}
                      onClick={() => {
                        setCurrency(opt.code)
                        closeMobileMenu()
                      }}
                      className={`flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-base font-medium transition-colors ${
                        currency === opt.code
                          ? 'bg-indigo-500/20 text-indigo-200'
                          : 'text-gray-200 hover:bg-white/10'
                      }`}
                    >
                      <FlagCircle code={opt.code} variant="onDark" size="md" />
                      <span className="tabular-nums">{opt.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            </ElDialogPanel>
          </div>
        </dialog>
      </ElDialog>
    </header>
  )
}

function MegaCard({
  img,
  alt,
  title,
  href,
  onNavigate,
}: {
  img: string
  alt: string
  title: string
  href: string
  onNavigate?: () => void
}) {
  return (
    <div className="group relative text-base sm:text-sm">
      <img
        src={img}
        alt={alt}
        className="aspect-square w-full rounded-lg bg-gray-800 object-cover ring-1 ring-white/10 group-hover:opacity-75"
      />
      <Link
        to={href}
        onClick={onNavigate}
        className="mt-6 block font-medium text-gray-100 transition-colors hover:text-indigo-300"
      >
        <span aria-hidden className="absolute inset-0 z-10" />
        {title}
      </Link>
      <p
        aria-hidden
        className="mt-1 text-sm text-indigo-400 transition-colors group-hover:text-indigo-300"
      >
        В каталог
      </p>
    </div>
  )
}

function MobileTile({
  img,
  title,
  href,
}: {
  img: string
  title: string
  href: string
}) {
  return (
    <div className="group relative text-sm">
      <img
        src={img}
        alt=""
        className="aspect-square w-full rounded-lg bg-gray-800 object-cover ring-1 ring-white/10 group-hover:opacity-75"
      />
      <Link
        to={href}
        className="mt-6 block font-medium text-gray-100 transition-colors hover:text-indigo-300"
        onClick={closeMobileMenu}
      >
        <span aria-hidden className="absolute inset-0 z-10" />
        {title}
      </Link>
      <p
        aria-hidden
        className="mt-1 text-sm text-indigo-400 transition-colors group-hover:text-indigo-300"
      >
        В каталог
      </p>
    </div>
  )
}
