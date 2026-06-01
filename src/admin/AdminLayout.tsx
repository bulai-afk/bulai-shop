import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  CalendarIcon,
  ChartPieIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  HomeIcon,
  MegaphoneIcon,
  ShoppingBagIcon,
  TagIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { BulaiLogo } from '../components/BulaiLogo'
import { PanelScrollArea } from '../components/PanelScrollArea'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { adminSidebarPanelScrollbarRailClass } from '../components/scrollbarShared'
import { isProfileExtrasStorageEventKey } from '../constants/profileExtrasStorage'
import { useAuth } from '../context/AuthContext'
import { useProfileDialog } from '../context/ProfileDialogContext'
import { useAdminAccessAllowed } from './hooks/useAdminAccessAllowed'
import { profileDisplayNameWithSavedExtras } from '../utils/profileDisplayName'
import {
  formatCalendarSidebarBadgeTitle,
  getCalendarSidebarCountsForMonth,
} from './lib/calendarSidebarCounts'
import {
  loadOrdersDraft,
  loadProductsInventoryDraft,
  ORDERS_UPDATED_EVENT,
  PRODUCTS_INVENTORY_UPDATED_EVENT,
} from './lib/adminDraftStorage'

/** Как в `AuthContext` — для `storage` из другой вкладки */
const AUTH_LOCAL_STORAGE_KEY = 'bulai-shop-auth'

function classNames(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ')
}

type NavItemProps = {
  to: string
  end?: boolean
  icon: ReactNode
  children: ReactNode
  badge?: string
  /** Подсказка к бейджу (например разбивка по типам). */
  badgeTitle?: string
}

function SidebarNavItem({ to, end, icon, children, badge, badgeTitle }: NavItemProps) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          classNames(
            'group flex min-w-0 gap-x-3 rounded-md p-2 text-sm/6 font-semibold transition-colors',
            isActive
              ? 'bg-white/5 text-white'
              : 'text-gray-400 hover:bg-white/5 hover:text-white',
          )
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={classNames(
                'size-6 shrink-0',
                isActive ? 'text-white' : 'text-gray-400 group-hover:text-white',
              )}
            >
              {icon}
            </span>
            <span className="truncate">{children}</span>
            {badge != null ? (
              <span
                aria-hidden
                title={badgeTitle}
                className={classNames(
                  'ml-auto w-9 min-w-max rounded-full px-2.5 py-0.5 text-center text-xs/5 font-medium whitespace-nowrap outline-1 -outline-offset-1',
                  isActive
                    ? 'bg-indigo-500/15 text-indigo-300 outline-indigo-500/30'
                    : 'bg-gray-900 text-gray-400 outline-white/15 group-hover:outline-white/25',
                )}
              >
                {badge}
              </span>
            ) : null}
          </>
        )}
      </NavLink>
    </li>
  )
}

const iconClass = 'size-6'

function ProductsSidebarGroup() {
  const { pathname } = useLocation()
  const isUnderProducts = pathname.startsWith('/admin/products')
  const [menuOpen, setMenuOpen] = useState(isUnderProducts)
  const showSubNav = menuOpen || isUnderProducts

  useEffect(() => {
    if (!isUnderProducts) setMenuOpen(false)
  }, [isUnderProducts])

  const subLinkClass = ({ isActive }: { isActive: boolean }) =>
    classNames(
      'block min-w-0 truncate rounded-md py-1.5 pr-2 pl-2 text-sm font-medium transition-colors',
      isActive ? 'bg-white/5 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white',
    )

  return (
    <li>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-expanded={showSubNav}
        className={classNames(
          'group flex w-full min-w-0 items-center gap-x-3 rounded-md p-2 text-left text-sm/6 font-semibold transition-colors',
          isUnderProducts
            ? 'bg-white/5 text-white'
            : 'text-gray-400 hover:bg-white/5 hover:text-white',
        )}
      >
        <span
          className={classNames(
            'size-6 shrink-0',
            isUnderProducts ? 'text-white' : 'text-gray-400 group-hover:text-white',
          )}
        >
          <ShoppingBagIcon className={iconClass} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate">Товары</span>
        <ChevronRightIcon
          aria-hidden
          className={classNames(
            'size-5 shrink-0 text-gray-500 transition-transform duration-200',
            showSubNav ? 'rotate-90' : '',
          )}
        />
      </button>
      {showSubNav ? (
        <ul role="list" className="mt-1 ml-2 space-y-0.5 border-l border-white/10 py-1 pl-3">
          <li>
            <NavLink to="/admin/products/catalog" className={subLinkClass}>
              Каталог товаров
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/products/stocks" className={subLinkClass}>
              Остатки по складам
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/products/dictionaries" className={subLinkClass}>
              Справочники
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/products/discounts" className={subLinkClass}>
              Скидки
            </NavLink>
          </li>
        </ul>
      ) : null}
    </li>
  )
}

function DiscountsPromoSidebarGroup() {
  const { pathname } = useLocation()
  const isUnderGroup =
    pathname.startsWith('/admin/discounts') ||
    pathname.startsWith('/admin/promo-codes') ||
    pathname.startsWith('/admin/products/discounts')
  const [menuOpen, setMenuOpen] = useState(isUnderGroup)
  const showSubNav = menuOpen || isUnderGroup

  useEffect(() => {
    if (!isUnderGroup) setMenuOpen(false)
  }, [isUnderGroup])

  const subLinkClass = ({ isActive }: { isActive: boolean }) =>
    classNames(
      'block min-w-0 truncate rounded-md py-1.5 pr-2 pl-2 text-sm font-medium transition-colors',
      isActive ? 'bg-white/5 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white',
    )

  return (
    <li>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-expanded={showSubNav}
        className={classNames(
          'group flex w-full min-w-0 items-center gap-x-3 rounded-md p-2 text-left text-sm/6 font-semibold transition-colors',
          isUnderGroup
            ? 'bg-white/5 text-white'
            : 'text-gray-400 hover:bg-white/5 hover:text-white',
        )}
      >
        <span
          className={classNames(
            'size-6 shrink-0',
            isUnderGroup ? 'text-white' : 'text-gray-400 group-hover:text-white',
          )}
        >
          <TagIcon className={iconClass} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate">Скидки и промокоды</span>
        <ChevronRightIcon
          aria-hidden
          className={classNames(
            'size-5 shrink-0 text-gray-500 transition-transform duration-200',
            showSubNav ? 'rotate-90' : '',
          )}
        />
      </button>
      {showSubNav ? (
        <ul role="list" className="mt-1 ml-2 space-y-0.5 border-l border-white/10 py-1 pl-3">
          <li>
            <NavLink to="/admin/products/discounts" className={subLinkClass}>
              Скидки по товарам
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/promo-codes" className={subLinkClass}>
              Промокоды
            </NavLink>
          </li>
        </ul>
      ) : null}
    </li>
  )
}

function PromoMaterialsSidebarGroup() {
  const { pathname } = useLocation()
  const isUnderPromo = pathname.startsWith('/admin/promo-materials')
  const [menuOpen, setMenuOpen] = useState(isUnderPromo)
  const showSubNav = menuOpen || isUnderPromo

  useEffect(() => {
    if (!isUnderPromo) setMenuOpen(false)
  }, [isUnderPromo])

  const subLinkClass = ({ isActive }: { isActive: boolean }) =>
    classNames(
      'block min-w-0 truncate rounded-md py-1.5 pr-2 pl-2 text-sm font-medium transition-colors',
      isActive ? 'bg-white/5 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white',
    )

  return (
    <li>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-expanded={showSubNav}
        className={classNames(
          'group flex w-full min-w-0 items-center gap-x-3 rounded-md p-2 text-left text-sm/6 font-semibold transition-colors',
          isUnderPromo
            ? 'bg-white/5 text-white'
            : 'text-gray-400 hover:bg-white/5 hover:text-white',
        )}
      >
        <span
          className={classNames(
            'size-6 shrink-0',
            isUnderPromo ? 'text-white' : 'text-gray-400 group-hover:text-white',
          )}
        >
          <MegaphoneIcon className={iconClass} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate">Промо материалы</span>
        <ChevronRightIcon
          aria-hidden
          className={classNames(
            'size-5 shrink-0 text-gray-500 transition-transform duration-200',
            showSubNav ? 'rotate-90' : '',
          )}
        />
      </button>
      {showSubNav ? (
        <ul role="list" className="mt-1 ml-2 space-y-0.5 border-l border-white/10 py-1 pl-3">
          <li>
            <NavLink to="/admin/promo-materials/home" className={subLinkClass}>
              Главная
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/promo-materials/about" className={subLinkClass}>
              О компании
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/promo-materials/catalog" className={subLinkClass}>
              Каталог
            </NavLink>
          </li>
        </ul>
      ) : null}
    </li>
  )
}

function useNewOrdersCount(): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const sync = () => {
      setCount(loadOrdersDraft().filter((o) => o.stageId === 'new').length)
    }
    sync()
    window.addEventListener('storage', sync)
    window.addEventListener(ORDERS_UPDATED_EVENT, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(ORDERS_UPDATED_EVENT, sync)
    }
  }, [])
  return count
}

function useCalendarSidebarCounts() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const bump = () => setTick((t) => t + 1)
    window.addEventListener(ORDERS_UPDATED_EVENT, bump)
    window.addEventListener(PRODUCTS_INVENTORY_UPDATED_EVENT, bump)
    window.addEventListener('storage', bump)
    return () => {
      window.removeEventListener(ORDERS_UPDATED_EVENT, bump)
      window.removeEventListener(PRODUCTS_INVENTORY_UPDATED_EVENT, bump)
      window.removeEventListener('storage', bump)
    }
  }, [])
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return useMemo(() => {
    const now = new Date()
    return getCalendarSidebarCountsForMonth(
      loadOrdersDraft(),
      loadProductsInventoryDraft(),
      now.getFullYear(),
      now.getMonth(),
    )
  }, [tick])
}

function AdminAccessDenied() {
  const { openProfileDialog } = useProfileDialog()
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-950 px-6 py-12 text-center">
      <div className="max-w-md rounded-xl border border-white/10 bg-gray-900/80 p-8 shadow-xl shadow-black/40">
        <h1 className="text-xl font-semibold tracking-tight text-white">Доступ к панели ограничен</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          В списке прав доступа в «Настройках сайта» указаны клиенты, которым разрешён вход. Войдите на сайте под
          аккаунтом с той же электронной почтой или номером телефона, что в карточке этого клиента.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:border-white/25 hover:bg-white/10"
          >
            На витрину
          </Link>
          <button
            type="button"
            onClick={() => openProfileDialog()}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Профиль / войти
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminLayout() {
  const newOrdersCount = useNewOrdersCount()
  const ordersBadge = newOrdersCount > 0 ? String(newOrdersCount) : undefined
  const calendarCounts = useCalendarSidebarCounts()
  const calendarBadge =
    calendarCounts.total > 0 ? (calendarCounts.total > 99 ? '99+' : String(calendarCounts.total)) : undefined
  const calendarBadgeTitle = formatCalendarSidebarBadgeTitle(calendarCounts)
  const { user, hydrated } = useAuth()
  const adminAllowed = useAdminAccessAllowed()
  const { openProfileDialog, profileDialogOpen } = useProfileDialog()
  const [profileUiTick, setProfileUiTick] = useState(0)
  const prevProfileOpen = useRef(profileDialogOpen)

  useEffect(() => {
    if (prevProfileOpen.current && !profileDialogOpen) {
      setProfileUiTick((t) => t + 1)
    }
    prevProfileOpen.current = profileDialogOpen
  }, [profileDialogOpen])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (isProfileExtrasStorageEventKey(e.key) || e.key === AUTH_LOCAL_STORAGE_KEY) {
        setProfileUiTick((t) => t + 1)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const sidebarProfileName = useMemo(
    () => profileDisplayNameWithSavedExtras(user),
    [user, profileUiTick],
  )

  if (!hydrated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-950 text-sm text-gray-400">
        Загрузка…
      </div>
    )
  }

  if (!adminAllowed) {
    return <AdminAccessDenied />
  }

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 w-full overflow-hidden font-sans antialiased">
      <div className="flex h-full min-h-0 w-72 shrink-0 flex-col overflow-x-hidden border-r border-white/10 bg-gray-950 py-8">
        <div className="flex h-16 min-w-0 shrink-0 items-center px-6">
          <Link
            to="/admin"
            className="flex min-w-0 max-w-full items-center gap-2 overflow-hidden text-white"
            aria-label="Админка — на главную панели"
          >
            <BulaiLogo className="h-8 w-auto text-indigo-400" layout="navbar" />
          </Link>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
          <PanelScrollArea
            className="min-h-0 min-w-0 w-full flex-1"
            viewportClassName="overflow-x-hidden overscroll-contain pl-6 pr-6"
            panelRailClassName={adminSidebarPanelScrollbarRailClass}
          >
            <nav aria-label="Разделы админки" className="min-w-0">
              <ul role="list" className="-mx-2 space-y-1 pb-2">
                  <SidebarNavItem
                    to="/admin"
                    end
                    badge="5"
                    icon={<HomeIcon className={iconClass} aria-hidden />}
                  >
                    Обзор
                  </SidebarNavItem>
                  <SidebarNavItem to="/admin/clients" icon={<UserGroupIcon className={iconClass} aria-hidden />}>
                    Клиенты
                  </SidebarNavItem>
                  <SidebarNavItem
                    to="/admin/orders"
                    badge={ordersBadge}
                    icon={<ClipboardDocumentListIcon className={iconClass} aria-hidden />}
                  >
                    Заказы
                  </SidebarNavItem>
                  <SidebarNavItem
                    to="/admin/calendar"
                    badge={calendarBadge}
                    badgeTitle={calendarBadgeTitle}
                    icon={<CalendarIcon className={iconClass} aria-hidden />}
                  >
                    Календарь
                  </SidebarNavItem>
                  <ProductsSidebarGroup />
                  <DiscountsPromoSidebarGroup />
                  <PromoMaterialsSidebarGroup />
                  <SidebarNavItem
                    to="/admin/documents"
                    icon={<DocumentDuplicateIcon className={iconClass} aria-hidden />}
                  >
                    Документы
                  </SidebarNavItem>
                  <SidebarNavItem to="/admin/reports" icon={<ChartPieIcon className={iconClass} aria-hidden />}>
                    Отчёты
                  </SidebarNavItem>
              </ul>
            </nav>
          </PanelScrollArea>

          <div className="relative z-10 shrink-0 space-y-1 overflow-x-hidden border-t border-white/10 bg-gray-950 px-6 pt-4">
            <Link
              to="/api/doc"
              className="flex min-w-0 items-center gap-x-3 rounded-md px-2 py-2.5 text-sm/6 font-semibold text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <DocumentTextIcon aria-hidden className="size-6 shrink-0 opacity-90" />
              <span className="min-w-0 flex-1 truncate">Документация API</span>
            </Link>
            <Link
              to="/admin/site-settings"
              className="flex min-w-0 items-center gap-x-3 rounded-md px-2 py-2.5 text-sm/6 font-semibold text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Cog6ToothIcon aria-hidden className="size-6 shrink-0 opacity-90" />
              <span className="min-w-0 flex-1 truncate">Настройки сайта</span>
            </Link>
            <button
              type="button"
              onClick={() => openProfileDialog()}
              className="flex min-w-0 w-full cursor-pointer items-center gap-x-4 rounded-md px-2 py-3 text-left text-sm/6 font-semibold text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
              aria-label={user ? `Профиль, ${sidebarProfileName}` : 'Профиль, войти или изменить данные'}
            >
              {hydrated && user ? (
                <ProfileAvatar user={user} sizeClass="size-8" />
              ) : hydrated ? (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 outline -outline-offset-1 outline-white/15">
                  <UserIcon className="size-4 text-gray-400" aria-hidden />
                </span>
              ) : (
                <span
                  className="size-8 shrink-0 rounded-full bg-white/10 motion-safe:animate-pulse"
                  aria-hidden
                />
              )}
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-xs text-gray-500">Профиль</span>
                <span className="truncate text-white">{hydrated ? sidebarProfileName : '…'}</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-gray-900">
        <Outlet />
      </div>
    </div>
  )
}
