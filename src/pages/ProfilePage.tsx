import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { AuthUser } from '../context/AuthContext'
import { useAuth } from '../context/AuthContext'

const PROFILE_EXTRAS_KEY = 'bulai-shop-profile-extras'

/** Как получать уведомления: SMS, email или оба */
export type NotificationReceiveMethod = 'sms' | 'email' | 'all'

type ProfileExtras = {
  firstName: string
  lastName: string
  phone: string
  email: string
  /** ДД.ММ.ГГГГ или как пришло из Яндекса */
  birthday: string
  country: string
  streetAddress: string
  city: string
  region: string
  postalCode: string
  notifyReceiveMethod: NotificationReceiveMethod
  /** Информация о заказах */
  notifyOrders: boolean
  /** Акции и скидки */
  notifyPromotions: boolean
}

const defaultExtras = (): ProfileExtras => ({
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  birthday: '',
  country: 'Россия',
  streetAddress: '',
  city: '',
  region: '',
  postalCode: '',
  notifyReceiveMethod: 'email',
  notifyOrders: true,
  notifyPromotions: true,
})

/** Старые сохранённые значения селекта «Страна» (англ.) → русские подписи в списке */
const LEGACY_COUNTRY_LABEL: Record<string, string> = {
  'United States': 'США',
  Canada: 'Канада',
  Mexico: 'Мексика',
  Russia: 'Россия',
  Kazakhstan: 'Казахстан',
  Belarus: 'Беларусь',
}

function deliveryFromLegacyBools(email: boolean, sms: boolean): NotificationReceiveMethod {
  if (email && sms) return 'all'
  if (sms) return 'sms'
  return 'email'
}

function isReceiveMethod(v: unknown): v is NotificationReceiveMethod {
  return v === 'sms' || v === 'email' || v === 'all'
}

function readExtras(): ProfileExtras {
  try {
    const raw = localStorage.getItem(PROFILE_EXTRAS_KEY)
    if (!raw) return defaultExtras()
    const p = JSON.parse(raw) as Record<string, unknown>
    const {
      username: _u,
      about: _a,
      notifyComments: _nc,
      pushNotifications: _pn,
      notifyCandidates: legacyOrders,
      notifyOffers: legacyOffersCheckbox,
      notifyOrdersEmail: legOE,
      notifyOrdersSms: legOS,
      notifyOffersEmail: legFE,
      notifyOffersSms: legFS,
      notifyOrdersDelivery: oldOrdersDel,
      notifyOffersDelivery: oldPromoDel,
      ...rest
    } = p
    const merged: ProfileExtras = { ...defaultExtras(), ...(rest as Partial<ProfileExtras>) }

    if (!('notifyReceiveMethod' in rest)) {
      if (isReceiveMethod(oldOrdersDel) && isReceiveMethod(oldPromoDel) && oldOrdersDel === oldPromoDel) {
        merged.notifyReceiveMethod = oldOrdersDel
      } else if (oldOrdersDel !== undefined || oldPromoDel !== undefined) {
        merged.notifyReceiveMethod = 'all'
      } else if (typeof legOE === 'boolean' || typeof legOS === 'boolean') {
        merged.notifyReceiveMethod = deliveryFromLegacyBools(!!legOE, !!legOS)
      }
    }

    if (!('notifyOrders' in rest)) {
      if (oldOrdersDel !== undefined || oldPromoDel !== undefined) merged.notifyOrders = true
      else if (typeof legacyOrders === 'boolean') merged.notifyOrders = legacyOrders
    }

    if (!('notifyPromotions' in rest)) {
      if (oldOrdersDel !== undefined || oldPromoDel !== undefined) merged.notifyPromotions = true
      else if (typeof legacyOffersCheckbox === 'boolean') merged.notifyPromotions = legacyOffersCheckbox
    }

    const c = merged.country
    if (c && LEGACY_COUNTRY_LABEL[c]) merged.country = LEGACY_COUNTRY_LABEL[c]
    return merged
  } catch {
    return defaultExtras()
  }
}

function writeExtras(e: ProfileExtras) {
  localStorage.setItem(PROFILE_EXTRAS_KEY, JSON.stringify(e))
}

function buildFormFromUser(user: AuthUser, extras: ProfileExtras): ProfileExtras {
  return {
    ...extras,
    firstName: extras.firstName || user.firstName || '',
    lastName: extras.lastName || user.lastName || '',
    phone: extras.phone || user.phone || '',
    email: extras.email || user.email,
    birthday: extras.birthday || user.birthday || '',
    streetAddress: extras.streetAddress || user.deliveryAddress || '',
  }
}

type ProfileFormProps = {
  /** После успешного сохранения (например закрыть модалку и показать тост). */
  onSaveSuccess?: () => void
}

export function ProfileForm({ onSaveSuccess }: ProfileFormProps) {
  const { user, openAuthDialog } = useAuth()
  const [form, setForm] = useState<ProfileExtras | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const savedSnapshot = useRef<string>('')

  const hydrate = useCallback((u: AuthUser) => {
    const merged = buildFormFromUser(u, readExtras())
    setForm(merged)
    savedSnapshot.current = JSON.stringify(merged)
    setAvatarPreview(null)
  }, [])

  useEffect(() => {
    if (user) hydrate(user)
  }, [user, hydrate])

  if (!user) {
    return (
      <div className="max-w-lg">
        <p className="text-gray-400">Войдите, чтобы просмотреть и изменить данные профиля.</p>
        <button
          type="button"
          onClick={() => openAuthDialog()}
          className="mt-6 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Войти
        </button>
      </div>
    )
  }

  if (!form) return null

  const setField = <K extends keyof ProfileExtras>(key: K, value: ProfileExtras[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const onSave = (e: FormEvent) => {
    e.preventDefault()
    writeExtras(form)
    savedSnapshot.current = JSON.stringify(form)
    onSaveSuccess?.()
  }

  const onCancel = () => {
    try {
      const parsed = JSON.parse(savedSnapshot.current) as ProfileExtras
      setForm(parsed)
    } catch {
      hydrate(user)
    }
    setAvatarPreview(null)
  }

  const readFileAsDataUrl = (file: File, setUrl: (s: string | null) => void) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => setUrl(typeof reader.result === 'string' ? reader.result : null)
    reader.readAsDataURL(file)
  }

  return (
    <form className="w-full" onSubmit={onSave}>
        <div className="space-y-12">
          <div className="border-b border-white/10 pb-12">
            <h2 className="text-base/7 font-semibold text-white">Основное</h2>
            <p className="mt-1 text-sm/6 text-gray-400">
              Хотим узнать вас чуть ближе и говорить с вами по-человечески. Будем признательны, если заполните профиль
              — фото, имя, контакты, дату рождения и всё остальное, чем готовы поделиться.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="col-span-full sm:col-span-3">
                <p className="block text-sm/6 font-medium text-white">Фото</p>
                <div className="mt-2 flex items-center gap-x-3">
                  {avatarPreview || user.yandexAvatarUrl ? (
                    <img
                      src={avatarPreview ?? user.yandexAvatarUrl!}
                      alt=""
                      className="size-12 rounded-full border border-white/10 object-cover"
                    />
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden
                      className="size-12 text-gray-500"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                      />
                    </svg>
                  )}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="sr-only"
                    onChange={(ev) => {
                      const f = ev.target.files?.[0]
                      if (f) readFileAsDataUrl(f, setAvatarPreview)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/5 hover:bg-white/20"
                  >
                    Изменить
                  </button>
                </div>
              </div>

              <div className="col-span-full sm:col-span-3">
                <label htmlFor="birthday" className="block text-sm/6 font-medium text-white">
                  Дата рождения
                </label>
                <div className="mt-2">
                  <input
                    id="birthday"
                    type="text"
                    name="birthday"
                    autoComplete="bday"
                    inputMode="numeric"
                    placeholder="ДД.ММ.ГГГГ"
                    value={form.birthday}
                    onChange={(ev) => setField('birthday', ev.target.value)}
                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="first-name" className="block text-sm/6 font-medium text-white">
                  Имя
                </label>
                <div className="mt-2">
                  <input
                    id="first-name"
                    type="text"
                    name="first-name"
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={(ev) => setField('firstName', ev.target.value)}
                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="last-name" className="block text-sm/6 font-medium text-white">
                  Фамилия
                </label>
                <div className="mt-2">
                  <input
                    id="last-name"
                    type="text"
                    name="last-name"
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={(ev) => setField('lastName', ev.target.value)}
                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="phone" className="block text-sm/6 font-medium text-white">
                  Телефон
                </label>
                <div className="mt-2">
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(ev) => setField('phone', ev.target.value)}
                    placeholder="+7 900 000-00-00"
                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="email" className="block text-sm/6 font-medium text-white">
                  Электронная почта
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(ev) => setField('email', ev.target.value)}
                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-white/10 pb-12">
            <h2 className="text-base/7 font-semibold text-white">Адрес доставки</h2>
            <p className="mt-1 text-sm/6 text-gray-400">
              Хотим привозить заказы туда, где вам удобнее всего. Будем признательны, если поделитесь адресом — так
              доставка пройдёт спокойнее и без лишних уточнений.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label htmlFor="country" className="block text-sm/6 font-medium text-white">
                  Страна
                </label>
                <div className="mt-2 grid grid-cols-1">
                  <select
                    id="country"
                    name="country"
                    autoComplete="country-name"
                    value={form.country}
                    onChange={(ev) => setField('country', ev.target.value)}
                    className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white/5 py-1.5 pr-8 pl-3 text-base text-white outline-1 -outline-offset-1 outline-white/10 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 [&>option]:bg-gray-800"
                  >
                    <option>Россия</option>
                    <option>Беларусь</option>
                    <option>Казахстан</option>
                    <option>США</option>
                    <option>Канада</option>
                    <option>Мексика</option>
                  </select>
                  <svg
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    aria-hidden
                    className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-400 sm:size-4"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                    />
                  </svg>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="region" className="block text-sm/6 font-medium text-white">
                  Регион / область
                </label>
                <div className="mt-2">
                  <input
                    id="region"
                    type="text"
                    name="region"
                    autoComplete="address-level1"
                    value={form.region}
                    onChange={(ev) => setField('region', ev.target.value)}
                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="city" className="block text-sm/6 font-medium text-white">
                  Город
                </label>
                <div className="mt-2">
                  <input
                    id="city"
                    type="text"
                    name="city"
                    autoComplete="address-level2"
                    value={form.city}
                    onChange={(ev) => setField('city', ev.target.value)}
                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="postal-code" className="block text-sm/6 font-medium text-white">
                  Индекс
                </label>
                <div className="mt-2">
                  <input
                    id="postal-code"
                    type="text"
                    name="postal-code"
                    autoComplete="postal-code"
                    value={form.postalCode}
                    onChange={(ev) => setField('postalCode', ev.target.value)}
                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label htmlFor="street-address" className="block text-sm/6 font-medium text-white">
                  Адрес (улица, дом)
                </label>
                <div className="mt-2">
                  <input
                    id="street-address"
                    type="text"
                    name="street-address"
                    autoComplete="street-address"
                    value={form.streetAddress}
                    onChange={(ev) => setField('streetAddress', ev.target.value)}
                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-white/10 pb-12">
            <h2 className="text-base/7 font-semibold text-white">Уведомления</h2>
            <p className="mt-1 text-sm/6 text-gray-400">
              Хотим выходить на связь там и тогда, где вам это комфортно. Будем признательны, если настроите
              уведомления — почту и телефон для этого можно указать в разделе «Основное».
            </p>

            <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-8">
              <fieldset className="min-w-0 border-0 p-0">
                <legend className="text-sm/6 font-semibold text-white">Способ получения уведомлений</legend>
                <p className="mt-1 text-sm/6 text-gray-400">Выберите способ получения уведомлений.</p>
                <div className="mt-4 flex flex-col gap-y-3">
                  {(
                    [
                      { value: 'sms' as const, label: 'По SMS' },
                      { value: 'email' as const, label: 'По Email' },
                      { value: 'all' as const, label: 'Все' },
                    ] as const
                  ).map(({ value, label }) => {
                    const inputId = `notify-receive-${value}`
                    return (
                      <div key={value} className="flex items-center gap-x-3">
                        <input
                          id={inputId}
                          type="radio"
                          name="notify-receive-method"
                          value={value}
                          checked={form.notifyReceiveMethod === value}
                          onChange={() => setField('notifyReceiveMethod', value)}
                          className="relative size-4 appearance-none rounded-full border border-white/10 bg-white/5 before:absolute before:inset-1 before:hidden before:rounded-full before:bg-white checked:border-indigo-500 checked:bg-indigo-500 checked:before:block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                        />
                        <label htmlFor={inputId} className="text-sm/6 font-medium text-white">
                          {label}
                        </label>
                      </div>
                    )
                  })}
                </div>
              </fieldset>

              <fieldset className="min-w-0 border-0 p-0">
                <legend className="text-sm/6 font-semibold text-white">Тип уведомлений</legend>
                <p className="mt-1 text-sm/6 text-gray-400">Можно выбрать одно или оба направления.</p>
                <div className="mt-6 space-y-6">
                  {(
                    [
                      {
                        id: 'notify-orders',
                        field: 'notifyOrders' as const,
                        title: 'Информация о заказах',
                        desc: 'Статус заказа, доставка, важные сообщения по покупке.',
                      },
                      {
                        id: 'notify-promotions',
                        field: 'notifyPromotions' as const,
                        title: 'Акции и скидки',
                        desc: 'Персональные предложения и распродажи.',
                      },
                    ] as const
                  ).map(({ id, field, title, desc }) => (
                    <div key={id} className="flex gap-3">
                      <div className="relative flex h-6 shrink-0 items-center">
                        <input
                          id={id}
                          type="checkbox"
                          checked={form[field]}
                          onChange={(ev) => setField(field, ev.target.checked)}
                          aria-describedby={`${id}-description`}
                          className="peer sr-only"
                        />
                        <div
                          aria-hidden
                          className="flex size-4 items-center justify-center rounded-sm border border-white/10 bg-white/5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-500 peer-checked:border-indigo-500 peer-checked:bg-indigo-500 peer-checked:[&>svg]:opacity-100"
                        >
                          <svg viewBox="0 0 14 14" fill="none" className="size-3.5 stroke-white opacity-0">
                            <path
                              d="M3 8L6 11L11 3.5"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="text-sm/6">
                        <label htmlFor={id} className="font-medium text-white">
                          {title}
                        </label>
                        <p id={`${id}-description`} className="text-gray-400">
                          {desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-x-6">
          <button type="button" onClick={onCancel} className="text-sm/6 font-semibold text-white">
            Отмена
          </button>
          <button
            type="submit"
            className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            Сохранить
          </button>
        </div>
      </form>
  )
}
