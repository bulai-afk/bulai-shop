import {
  ArrowRightStartOnRectangleIcon,
  ClipboardDocumentListIcon,
  Squares2X2Icon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { ChevronDownIcon } from '@heroicons/react/16/solid'
import { ElPopover, ElPopoverGroup } from '@tailwindplus/elements/react'
import type { HTMLAttributes } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOrdersDialog } from '../context/OrdersDialogContext'
import { useProfileDialog } from '../context/ProfileDialogContext'
import {
  CURRENCY_OPTIONS,
  type CurrencyCode,
  useCurrency,
} from '../context/CurrencyContext'
import { profileDisplayName } from '../utils/profileDisplayName'
import { FlagCircle } from './FlagCircle'
import { ProfileAvatar } from './ProfileAvatar'
import { useAdminAccessAllowed } from '../admin/hooks/useAdminAccessAllowed'
import { buildDefaultPromoMaterials } from '../admin/data/siteSettingsDefaults'
import { useStorefrontPromoMaterials } from '../context/StorefrontSettingsContext'

const FALLBACK_TICKER = buildDefaultPromoMaterials().tickerMessages

const INTERVAL_MS = 4500
const FADE_MS = 420

const popoverCurrencyProps = {
  anchor: 'bottom',
  popover: '',
} as HTMLAttributes<HTMLElement> & { anchor?: string; popover?: string }

const FLYOUT_ID = 'currency-flyout'
const PROFILE_FLYOUT_ID = 'profile-flyout'

function hideCurrencyFlyout() {
  const el = document.getElementById(FLYOUT_ID)
  if (el && 'hidePopover' in el) {
    ;(el as HTMLElement & { hidePopover: () => void }).hidePopover()
  }
}

function hideProfileFlyout() {
  const el = document.getElementById(PROFILE_FLYOUT_ID)
  if (el && 'hidePopover' in el) {
    ;(el as HTMLElement & { hidePopover: () => void }).hidePopover()
  }
}

/**
 * Верхняя полоска: валюта слева и профиль справа с `nav:`; на узкой ширине валюта — в шапке мобильного меню (`Navbar`). По центру — ротация промо.
 */
export function DeliveryPromoBar() {
  const { currency, setCurrency } = useCurrency()
  const { user, openAuthDialog, logout } = useAuth()
  const { allowed: adminAllowed } = useAdminAccessAllowed()
  const { openProfileDialog } = useProfileDialog()
  const { openOrdersDialog } = useOrdersDialog()
  const promo = useStorefrontPromoMaterials()
  const messages = useMemo(() => {
    const t = promo.tickerMessages.map((s) => s.trim()).filter(Boolean)
    return t.length > 0 ? t : FALLBACK_TICKER
  }, [promo])
  const [index, setIndex] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    setIndex((i) => (messages.length === 0 ? 0 : i % messages.length))
  }, [messages.length])

  useEffect(() => {
    if (reducedMotion) return
    if (messages.length <= 1) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % messages.length)
    }, INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [reducedMotion, messages.length])

  const active = messages[reducedMotion ? 0 : index % Math.max(1, messages.length)]

  const pick = (code: CurrencyCode) => {
    setCurrency(code)
    hideCurrencyFlyout()
  }

  return (
    <div className="relative isolate flex h-10 max-h-10 min-h-10 shrink-0 items-center overflow-hidden bg-indigo-600 px-3 sm:px-6 lg:px-8">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {active}
      </div>

      {/* Текст по центру всей полоски; боковые блоки разной ширины не смещают середину */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden px-12 sm:px-28 md:px-36 lg:px-40">
        {reducedMotion ? (
          <p className="max-w-full truncate text-center text-xs font-medium text-white sm:text-sm" aria-hidden>
            {messages[0]}
          </p>
        ) : (
          <div className="relative h-10 w-full max-w-4xl overflow-hidden">
            {messages.map((text, i) => {
              const on = i === index
              return (
                <p
                  key={i}
                  className={`absolute inset-0 z-0 flex items-center justify-center bg-indigo-600 px-1 text-center text-xs font-medium text-white transition-opacity ease-out sm:px-2 sm:text-sm ${
                    on ? 'z-10 opacity-100' : 'opacity-0'
                  }`}
                  style={{ transitionDuration: `${FADE_MS}ms` }}
                  aria-hidden={!on}
                >
                  {text}
                </p>
              )
            })}
          </div>
        )}
      </div>

      <div className="relative z-20 flex min-w-0 flex-1 items-center justify-between gap-2 sm:gap-3">
        <div className="hidden min-w-0 shrink-0 nav:block">
        <ElPopoverGroup className="group/popover relative min-w-0 shrink-0">
        <button
          type="button"
          popoverTarget={FLYOUT_ID}
          className="inline-flex items-center gap-1.5 rounded-md py-1 pr-1 pl-1.5 text-xs font-medium text-white/90 hover:bg-white/10 hover:text-white sm:gap-2 sm:pl-2 sm:text-sm"
          aria-haspopup="dialog"
          aria-label="Валюта"
        >
          <FlagCircle code={currency} variant="onDark" />
          <span className="tabular-nums">{currency}</span>
          <ChevronDownIcon aria-hidden className="size-3.5 shrink-0 opacity-80 sm:size-4" />
        </button>
        <ElPopover
          id={FLYOUT_ID}
          className="z-[100] w-[var(--button-width)] min-w-0 rounded-lg bg-indigo-950 p-1.5 shadow-lg ring-1 ring-white/10 transition transition-discrete [--anchor-gap:6px] backdrop:bg-transparent open:block data-closed:opacity-0 data-closed:pointer-events-none data-enter:duration-150 data-enter:ease-out data-leave:duration-100 data-leave:ease-in sm:p-2"
          {...popoverCurrencyProps}
        >
          <div className="flex flex-col gap-0.5" role="listbox" aria-label="Выбор валюты">
            {CURRENCY_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                role="option"
                aria-selected={currency === opt.code}
                aria-label={opt.code}
                className={`flex w-full items-center gap-1.5 rounded-md py-1 pr-1 pl-1.5 text-left text-xs font-medium sm:gap-2 sm:pl-2 sm:text-sm ${
                  currency === opt.code
                    ? 'bg-white/15 text-white'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => pick(opt.code)}
              >
                <FlagCircle code={opt.code} variant="onDark" />
                <span className="tabular-nums">{opt.code}</span>
              </button>
            ))}
          </div>
        </ElPopover>
        </ElPopoverGroup>
        </div>

        <div className="hidden min-w-0 shrink-0 items-center justify-end gap-1 nav:flex sm:gap-2">
          {user ? (
            <ElPopoverGroup className="relative shrink-0">
              <button
                type="button"
                popoverTarget={PROFILE_FLYOUT_ID}
                className="-m-1 inline-flex max-w-full min-h-9 items-center gap-1.5 rounded-md py-1 pl-1 pr-1.5 text-left text-white/90 hover:bg-white/10 hover:text-white sm:m-0 sm:min-h-0 sm:gap-2 sm:pl-1.5 sm:pr-2 sm:py-1"
                aria-haspopup="menu"
                aria-label={`Меню профиля, ${user.email}`}
              >
                <ProfileAvatar user={user} />
                <span
                  className="min-w-0 max-w-[5.5rem] truncate text-[10px] font-medium sm:max-w-[9rem] sm:text-xs md:max-w-[14rem] md:text-sm"
                  title={user.email}
                >
                  {profileDisplayName(user)}
                </span>
                <ChevronDownIcon
                  aria-hidden
                  className="size-3.5 shrink-0 opacity-80 sm:size-4"
                />
              </button>
              <ElPopover
                id={PROFILE_FLYOUT_ID}
                className="z-[100] min-w-[12rem] rounded-lg bg-indigo-950 p-1.5 shadow-lg ring-1 ring-white/10 transition transition-discrete [--anchor-gap:6px] backdrop:bg-transparent open:block data-closed:opacity-0 data-closed:pointer-events-none data-enter:duration-150 data-enter:ease-out data-leave:duration-100 data-leave:ease-in sm:p-2"
                {...popoverCurrencyProps}
              >
                <nav className="flex flex-col gap-0.5" role="menu" aria-label="Профиль">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      hideProfileFlyout()
                      openProfileDialog()
                    }}
                    className="flex w-full items-center gap-2 rounded-md py-1.5 pl-2 pr-2 text-left text-xs font-medium text-white/90 hover:bg-white/10 hover:text-white sm:text-sm"
                  >
                    <UserIcon aria-hidden className="size-4 shrink-0 opacity-90" />
                    Профиль
                  </button>
                  {adminAllowed ? (
                    <Link
                      to="/admin"
                      role="menuitem"
                      onClick={() => hideProfileFlyout()}
                      className="flex w-full items-center gap-2 rounded-md py-1.5 pl-2 pr-2 text-left text-xs font-medium text-white/90 hover:bg-white/10 hover:text-white sm:text-sm"
                    >
                      <Squares2X2Icon aria-hidden className="size-4 shrink-0 opacity-90" />
                      Панель управления
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      hideProfileFlyout()
                      openOrdersDialog()
                    }}
                    className="flex w-full items-center gap-2 rounded-md py-1.5 pl-2 pr-2 text-left text-xs font-medium text-white/90 hover:bg-white/10 hover:text-white sm:text-sm"
                  >
                    <ClipboardDocumentListIcon
                      aria-hidden
                      className="size-4 shrink-0 opacity-90"
                    />
                    История заказов
                  </button>
                  <div className="my-0.5 h-px bg-white/10" role="presentation" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      hideProfileFlyout()
                      logout()
                    }}
                    className="flex w-full items-center gap-2 rounded-md py-1.5 pl-2 pr-2 text-left text-xs font-medium text-white/90 hover:bg-white/10 hover:text-white sm:text-sm"
                  >
                    <ArrowRightStartOnRectangleIcon
                      aria-hidden
                      className="size-4 shrink-0 opacity-90"
                    />
                    Выйти
                  </button>
                </nav>
              </ElPopover>
            </ElPopoverGroup>
          ) : (
            <button
              type="button"
              onClick={() => openAuthDialog()}
              className="-m-1 inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-md text-xs font-medium text-white/90 hover:bg-white/10 hover:text-white sm:m-0 sm:min-h-0 sm:min-w-0 sm:justify-start sm:gap-2 sm:px-2 sm:py-1 sm:text-sm"
              aria-label="Вход и Регистрация"
            >
              <UserIcon aria-hidden className="size-4 shrink-0 opacity-90" />
              <span className="hidden sm:inline">Вход и Регистрация</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
