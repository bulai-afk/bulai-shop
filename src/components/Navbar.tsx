import {
  ArrowRightStartOnRectangleIcon,
  ClipboardDocumentListIcon,
  LinkIcon,
  Squares2X2Icon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { ChevronDownIcon } from '@heroicons/react/16/solid'
import { ElDialog, ElDialogBackdrop, ElDialogPanel, ElPopover, ElPopoverGroup } from '@tailwindplus/elements/react'
import type { HTMLAttributes } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useOrdersDialog } from '../context/OrdersDialogContext'
import { useProfileDialog } from '../context/ProfileDialogContext'
import {
  CURRENCY_OPTIONS,
  type CurrencyCode,
  useCurrency,
} from '../context/CurrencyContext'
import {
  MEGA_MENU_CATEGORY_SLUG_ORDER,
  catalogHrefForPromoSlug,
} from '../constants/catalogCategoryPromo'
import { useStorefrontPromoMaterials } from '../context/StorefrontSettingsContext'
import { categoryVisualBySlug } from '../utils/categoryVisualsStorefront'
import { profileDisplayName } from '../utils/profileDisplayName'
import { SiteBrandLogo } from './SiteBrandLogo'
import { useAdminAccessAllowed } from '../admin/hooks/useAdminAccessAllowed'
import { useStorefrontSiteConfig } from '../context/StorefrontSettingsContext'
import { socialIconFromDraft } from '../utils/socialDraftIcons'
import { FlagCircle } from './FlagCircle'
import { ProfileAvatar } from './ProfileAvatar'

function closeMobileMenu() {
  const el = document.getElementById('mobile-menu')
  if (el && 'close' in el) (el as HTMLDialogElement).close()
}

const MOBILE_MENU_CURRENCY_FLYOUT_ID = 'mobile-menu-currency-flyout'

const mobileMenuCurrencyPopoverProps = {
  anchor: 'bottom',
  popover: '',
} as HTMLAttributes<HTMLElement> & { anchor?: string; popover?: string }

function hideMobileMenuCurrencyFlyout() {
  const el = document.getElementById(MOBILE_MENU_CURRENCY_FLYOUT_ID)
  if (el && 'hidePopover' in el) {
    ;(el as HTMLElement & { hidePopover: () => void }).hidePopover()
  }
}

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
  const { user, openAuthDialog, logout } = useAuth()
  const adminAllowed = useAdminAccessAllowed()
  const { openProfileDialog } = useProfileDialog()
  const { openOrdersDialog } = useOrdersDialog()
  const site = useStorefrontSiteConfig()
  const { categoryVisuals } = useStorefrontPromoMaterials()
  const siteBrand = site.brand
  const siteContact = site

  const megaTiles = useMemo(
    () =>
      MEGA_MENU_CATEGORY_SLUG_ORDER.map((slug) => {
        const row = categoryVisualBySlug(categoryVisuals, slug)
        return {
          title: row?.displayName ?? slug,
          href: catalogHrefForPromoSlug(slug),
          img: row?.imageMegaMenu ?? '',
          alt: row?.displayName ?? '',
        }
      }),
    [categoryVisuals],
  )
  const location = useLocation()
  const headerRef = useRef<HTMLElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [megaOpen, setMegaOpen] = useState<MegaOpen>(null)
  const [mobileProfileMenuOpen, setMobileProfileMenuOpen] = useState(false)

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
    const d = document.getElementById('mobile-menu')
    if (!d) return
    const onClose = () => setMobileProfileMenuOpen(false)
    d.addEventListener('close', onClose)
    return () => d.removeEventListener('close', onClose)
  }, [])

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

  const pickMobileMenuCurrency = (code: CurrencyCode) => {
    setCurrency(code)
    hideMobileMenuCurrencyFlyout()
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

            <div className="flex min-w-0 items-center justify-center -translate-y-1 translate-x-6 sm:-translate-y-1 sm:translate-x-7">
              <Link
                to={siteBrand.logoHref.trim() || '/'}
                className={logoClass}
                aria-label={siteBrand.logoAlt.trim() || 'На главную'}
                onClick={() => setMegaOpen(null)}
              >
                <span className="sr-only">{siteBrand.logoAlt.trim() || 'Bulai Shop'}</span>
                <SiteBrandLogo
                  logoUrl={siteBrand.logoUrl}
                  logoColor={siteBrand.logoColor}
                  layout="navbar"
                />
              </Link>
            </div>

            <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-2">
              {siteContact.contact.phoneTel.trim() ? (
                <a
                  href={`tel:${siteContact.contact.phoneTel.trim()}`}
                  className="hidden h-10 min-w-0 max-w-[min(100%,15rem)] items-center truncate rounded-md px-2 text-base font-semibold leading-none tabular-nums text-indigo-400 transition hover:text-indigo-300 sm:inline-flex lg:text-lg"
                >
                  {siteContact.contact.phoneDisplay.trim() || siteContact.contact.phoneTel.trim()}
                </a>
              ) : null}
              <button
                type="button"
                onClick={openCart}
                className="group inline-flex h-10 items-center gap-2 rounded-md px-2 transition hover:bg-white/5"
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
                      {megaTiles.map((tile) => (
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
            <ElDialogPanel className={`fixed inset-y-0 left-0 z-[100] flex w-full max-w-xs transform flex-col overflow-y-auto border-r border-white/10 pb-8 shadow-xl shadow-black/40 transition duration-300 ease-in-out data-closed:-translate-x-full ${HERO_TOP_GLASS}`}>
              <div className="flex items-center justify-between gap-3 px-4 pt-5 pb-2">
                <ElPopoverGroup className="group/popover relative shrink-0">
                  <button
                    type="button"
                    popoverTarget={MOBILE_MENU_CURRENCY_FLYOUT_ID}
                    className="inline-flex items-center gap-1.5 rounded-md py-1.5 pl-2 pr-1.5 text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-white"
                    aria-haspopup="dialog"
                    aria-label="Валюта"
                  >
                    <FlagCircle code={currency} variant="onDark" />
                    <span className="tabular-nums">{currency}</span>
                    <ChevronDownIcon aria-hidden className="size-4 shrink-0 opacity-80" />
                  </button>
                  <ElPopover
                    id={MOBILE_MENU_CURRENCY_FLYOUT_ID}
                    className="z-[110] w-[var(--button-width)] min-w-0 rounded-lg bg-indigo-950 p-2 shadow-lg ring-1 ring-white/10 transition transition-discrete [--anchor-gap:6px] backdrop:bg-transparent open:block data-closed:pointer-events-none data-closed:opacity-0 data-enter:duration-150 data-enter:ease-out data-leave:duration-100 data-leave:ease-in"
                    {...mobileMenuCurrencyPopoverProps}
                  >
                    <div className="flex flex-col gap-0.5" role="listbox" aria-label="Выбор валюты">
                      {CURRENCY_OPTIONS.map((opt) => (
                        <button
                          key={opt.code}
                          type="button"
                          role="option"
                          aria-selected={currency === opt.code}
                          aria-label={opt.code}
                          className={`flex w-full items-center gap-2 rounded-md py-1.5 pl-2 pr-2 text-left text-sm font-medium ${
                            currency === opt.code
                              ? 'bg-white/15 text-white'
                              : 'text-white/90 hover:bg-white/10 hover:text-white'
                          }`}
                          onClick={() => pickMobileMenuCurrency(opt.code)}
                        >
                          <FlagCircle code={opt.code} variant="onDark" />
                          <span className="tabular-nums">{opt.code}</span>
                        </button>
                      ))}
                    </div>
                  </ElPopover>
                </ElPopoverGroup>
                <button
                  type="button"
                  command="close"
                  commandfor="mobile-menu"
                  className="relative -m-2 inline-flex shrink-0 items-center justify-center rounded-md p-2 text-gray-300 transition-colors hover:text-white"
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

              <div className="border-b border-white/10 px-4 py-4">
                {user ? (
                  <div className="px-2">
                    <button
                      type="button"
                      id="mobile-menu-profile-trigger"
                      aria-expanded={mobileProfileMenuOpen}
                      aria-controls="mobile-menu-profile-dropdown"
                      onClick={() => setMobileProfileMenuOpen((o) => !o)}
                      className="flex w-full items-center gap-3 rounded-md py-2.5 pl-2 pr-2 text-left transition-colors hover:bg-white/10"
                    >
                      <ProfileAvatar user={user} sizeClass="size-9" />
                      <span
                        className="min-w-0 flex-1 truncate text-base font-medium text-gray-100"
                        title={user.email}
                      >
                        {profileDisplayName(user)}
                      </span>
                      <ChevronDownIcon
                        aria-hidden
                        className={`size-5 shrink-0 text-gray-300 opacity-90 transition-transform duration-200 ${
                          mobileProfileMenuOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {mobileProfileMenuOpen ? (
                      <div
                        id="mobile-menu-profile-dropdown"
                        role="region"
                        aria-labelledby="mobile-menu-profile-trigger"
                        className="mt-1 space-y-1 border-t border-white/10 pt-2"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setMobileProfileMenuOpen(false)
                            closeMobileMenu()
                            openProfileDialog()
                          }}
                          className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-base font-medium text-gray-200 transition-colors hover:bg-white/10"
                        >
                          <UserIcon aria-hidden className="size-5 shrink-0 opacity-90" />
                          Профиль
                        </button>
                        {adminAllowed ? (
                          <Link
                            to="/admin"
                            onClick={() => {
                              setMobileProfileMenuOpen(false)
                              closeMobileMenu()
                            }}
                            className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-base font-medium text-gray-200 transition-colors hover:bg-white/10"
                          >
                            <Squares2X2Icon aria-hidden className="size-5 shrink-0 opacity-90" />
                            Панель управления
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setMobileProfileMenuOpen(false)
                            closeMobileMenu()
                            openOrdersDialog()
                          }}
                          className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-base font-medium text-gray-200 transition-colors hover:bg-white/10"
                        >
                          <ClipboardDocumentListIcon
                            aria-hidden
                            className="size-5 shrink-0 opacity-90"
                          />
                          История заказов
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMobileProfileMenuOpen(false)
                            closeMobileMenu()
                            logout()
                          }}
                          className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-base font-medium text-gray-200 transition-colors hover:bg-white/10"
                        >
                          <ArrowRightStartOnRectangleIcon
                            aria-hidden
                            className="size-5 shrink-0 opacity-90"
                          />
                          Выйти
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu()
                      openAuthDialog()
                    }}
                    className="flex w-full items-center justify-center rounded-md px-2 py-2.5 text-center text-base font-medium text-gray-200 transition-colors hover:bg-white/10"
                  >
                    Вход и Регистрация
                  </button>
                )}
              </div>

              <nav
                className="flex border-b border-white/10 px-2"
                aria-label="Основные разделы"
              >
                <NavLink
                  to="/"
                  end
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `flex-1 border-b-2 py-3 text-center text-sm font-semibold transition-colors ${
                      isActive
                        ? 'border-indigo-400 text-white'
                        : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`
                  }
                >
                  Главная
                </NavLink>
                <NavLink
                  to="/catalog"
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `flex-1 border-b-2 py-3 text-center text-sm font-semibold transition-colors ${
                      isActive
                        ? 'border-indigo-400 text-white'
                        : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`
                  }
                >
                  Каталог
                </NavLink>
                <NavLink
                  to="/about"
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `flex-1 border-b-2 py-3 text-center text-sm font-semibold transition-colors ${
                      isActive
                        ? 'border-indigo-400 text-white'
                        : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`
                  }
                >
                  О компании
                </NavLink>
              </nav>

              <div className="mt-2 space-y-10 px-4 pt-6 pb-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-10">
                  {megaTiles.map((tile) => (
                    <MobileTile key={tile.title} img={tile.img} title={tile.title} href={tile.href} />
                  ))}
                </div>
              </div>

              <div className="shrink-0 border-t border-white/10 px-4 py-6 text-center">
                <p className="sr-only">Связаться с магазином</p>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-gray-300">
                  {siteContact.socialLinks
                    .filter((item) => item.href.trim())
                    .map((item) => {
                      const href = item.href.trim()
                      const IconFn = socialIconFromDraft(item.id, item.name)
                      return (
                        <a
                          key={`${item.id}-${item.name}`}
                          href={href}
                          className="transition hover:text-white"
                          {...(href.startsWith('http')
                            ? { target: '_blank', rel: 'noopener noreferrer' }
                            : {})}
                        >
                          <span className="sr-only">{item.name}</span>
                          {IconFn ? (
                            <IconFn className="size-6" />
                          ) : (
                            <LinkIcon className="size-6" aria-hidden />
                          )}
                        </a>
                      )
                    })}
                </div>
                {siteContact.contact.phoneTel.trim() ? (
                  <a
                    href={`tel:${siteContact.contact.phoneTel.trim()}`}
                    className="mt-5 block text-lg font-semibold tracking-tight text-gray-100 transition hover:text-white sm:text-xl"
                  >
                    {siteContact.contact.phoneDisplay.trim() || siteContact.contact.phoneTel.trim()}
                  </a>
                ) : null}
                <a
                  href={`mailto:${siteContact.contact.email.trim() || 'hello@example.com'}`}
                  className="mx-auto mt-3 block max-w-full break-words text-base font-medium text-gray-200 transition hover:text-white sm:text-lg"
                >
                  {siteContact.contact.email.trim() || 'hello@example.com'}
                </a>
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
