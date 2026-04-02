import {
  ArrowRightStartOnRectangleIcon,
  ClipboardDocumentListIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { ChevronDownIcon } from '@heroicons/react/16/solid'
import { ElPopover, ElPopoverGroup } from '@tailwindplus/elements/react'
import type { HTMLAttributes } from 'react'
import { useEffect, useState } from 'react'
import type { AuthUser } from '../context/AuthContext'
import { useAuth } from '../context/AuthContext'
import { useOrdersDialog } from '../context/OrdersDialogContext'
import { useProfileDialog } from '../context/ProfileDialogContext'
import {
  CURRENCY_OPTIONS,
  type CurrencyCode,
  useCurrency,
} from '../context/CurrencyContext'
import { FlagCircle } from './FlagCircle'

const MESSAGES = [
  'Бесплатная доставка при заказе от 5 000 ₽',
  'Скидка 15% — промокод HELLO15',
  'Распродажа сезона: до −40% в каталоге',
  'Помощь с размером — в разделе «Контакты»',
] as const

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

function avatarInitials(email: string): string {
  const local = email.split('@')[0]?.trim() ?? ''
  if (!local) return '?'
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0]![0]
    const b = parts[1]![0]
    if (a && b) return (a + b).toUpperCase()
  }
  return local.slice(0, 2).toUpperCase()
}

function ProfileAvatar({ user }: { user: AuthUser }) {
  if (user.yandexAvatarUrl) {
    return (
      <img
        src={user.yandexAvatarUrl}
        alt=""
        className="size-6 shrink-0 rounded-full object-cover ring-1 ring-white/30"
      />
    )
  }
  return (
    <span
      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-[9px] font-semibold text-white ring-1 ring-white/30 sm:text-[10px]"
      aria-hidden
    >
      {avatarInitials(user.email)}
    </span>
  )
}

/**
 * Верхняя полоска: валюта (flyout слева), ротация промо по центру, «Авторизация» справа (диалог входа).
 */
export function DeliveryPromoBar() {
  const { currency, setCurrency } = useCurrency()
  const { user, openAuthDialog, logout } = useAuth()
  const { openProfileDialog } = useProfileDialog()
  const { openOrdersDialog } = useOrdersDialog()
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
    if (reducedMotion) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length)
    }, INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [reducedMotion])

  const active = MESSAGES[reducedMotion ? 0 : index]

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
            {MESSAGES[0]}
          </p>
        ) : (
          <div className="relative h-10 w-full max-w-4xl overflow-hidden">
            {MESSAGES.map((text, i) => {
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

        <div className="flex min-w-0 shrink-0 items-center justify-end gap-1 sm:gap-2">
          {user ? (
            <ElPopoverGroup className="relative shrink-0">
              <button
                type="button"
                popoverTarget={PROFILE_FLYOUT_ID}
                className="-m-1 inline-flex max-w-full min-h-9 items-center gap-1.5 rounded-md py-1 pl-1 pr-1.5 text-left text-white/90 hover:bg-white/10 hover:text-white sm:m-0 sm:min-h-0 sm:gap-2 sm:pl-1.5 sm:pr-2 sm:py-1"
                aria-haspopup="menu"
                aria-label={`Меню профиля: ${user.email}`}
              >
                <ProfileAvatar user={user} />
                <span
                  className="min-w-0 max-w-[5.5rem] truncate text-[10px] font-medium sm:max-w-[9rem] sm:text-xs md:max-w-[14rem] md:text-sm"
                  title={user.email}
                >
                  {user.email}
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
              aria-label="Авторизация"
            >
              <UserIcon aria-hidden className="size-4 shrink-0 opacity-90" />
              <span className="hidden sm:inline">Авторизация</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
