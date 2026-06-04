import { CameraIcon } from '@heroicons/react/24/outline'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { CLIENTS_UPDATED_EVENT } from '../admin/lib/adminDraftStorage'
import { composePhoneDisplay, parsePhoneTel, PHONE_INPUT_MAX_DIGITS } from '../admin/lib/phoneCountry'
import { fetchStorefrontClientMe, putStorefrontClientProfileMe } from '../api/storefrontClientProfileApi'
import { ContactPhoneField } from '../components/ContactPhoneField'
import { isSiteConfigApiExpected } from '../constants/apiBase'
import type { AuthUser } from '../context/AuthContext'
import { profileExtrasStorageKey } from '../constants/profileExtrasStorage'
import { getProfileExtrasJsonRawForAccount } from '../utils/profileExtrasLocalRead'
import { useAuth } from '../context/AuthContext'
import { phoneEffectiveNationalDigits } from '../lib/contactPhoneInputDisplay'

/** Как получать уведомления: SMS, email или оба */
export type NotificationReceiveMethod = 'sms' | 'email' | 'all'

export type ProfileExtras = {
  firstName: string
  lastName: string
  phone: string
  /** Как `contact.phoneTel` в настройках сайта: только цифры для маски ввода. */
  phoneTel: string
  email: string
  /** В профиле хранится как YYYY-MM-DD (календарь); поддерживается чтение старых ДД.ММ.ГГГГ и значений из Яндекса */
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

/** Значение для `<input type="date" />` из сохранённой строки (ISO, ДД.ММ.ГГГГ). */
function birthdayStorageToDateInputValue(stored: string): string {
  const t = stored.trim()
  if (!t) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (m) {
    const dd = m[1].padStart(2, '0')
    const mm = m[2].padStart(2, '0')
    const yyyy = m[3]
    const d = Number(dd)
    const mo = Number(mm)
    const y = Number(yyyy)
    if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return ''
    const dt = new Date(y, mo - 1, d)
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return ''
    return `${yyyy}-${mm}-${dd}`
  }
  return ''
}

export function createDefaultProfileExtras(): ProfileExtras {
  return defaultExtras()
}

const defaultExtras = (): ProfileExtras => ({
  firstName: '',
  lastName: '',
  phone: '',
  phoneTel: '',
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

/** Синхронизирует `phoneTel` и форматированный `phone` (для таблиц и API), в т.ч. после старых сохранений. */
export function migrateProfileExtrasPhoneFields(e: ProfileExtras): ProfileExtras {
  let phoneTel = (e.phoneTel ?? '').replace(/\D/g, '').slice(0, PHONE_INPUT_MAX_DIGITS)
  if (!phoneTel && e.phone) {
    phoneTel = e.phone.replace(/\D/g, '').slice(0, PHONE_INPUT_MAX_DIGITS)
  }
  const p = parsePhoneTel(phoneTel)
  const nat = phoneEffectiveNationalDigits(p, phoneTel)
  const phone = nat ? composePhoneDisplay(p.dial, nat) : e.phone || ''
  return { ...e, phoneTel, phone }
}

/** Строка клиента из админки / API → поля формы профиля. */
export function profileExtrasFromClientTableRow(row: {
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  profile?: Partial<ProfileExtras> | Record<string, unknown> | null
}): ProfileExtras {
  const d = createDefaultProfileExtras()
  const p =
    row.profile && typeof row.profile === 'object' && !Array.isArray(row.profile)
      ? (row.profile as Partial<ProfileExtras>)
      : {}
  const merged: ProfileExtras = { ...d, ...p }
  merged.email = row.email ?? merged.email
  merged.firstName = row.firstName ?? merged.firstName
  merged.lastName = row.lastName ?? merged.lastName
  merged.phone = row.phone ?? merged.phone
  return migrateProfileExtrasPhoneFields(merged)
}

export function readProfileExtras(accountEmail: string): ProfileExtras {
  try {
    const raw = getProfileExtrasJsonRawForAccount(accountEmail)
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
    return migrateProfileExtrasPhoneFields(merged)
  } catch {
    return migrateProfileExtrasPhoneFields(defaultExtras())
  }
}

function writeExtras(accountEmail: string, e: ProfileExtras) {
  localStorage.setItem(profileExtrasStorageKey(accountEmail), JSON.stringify(e))
}

export function buildFormFromUser(user: AuthUser, extras: ProfileExtras): ProfileExtras {
  return migrateProfileExtrasPhoneFields({
    ...extras,
    firstName: extras.firstName || user.firstName || '',
    lastName: extras.lastName || user.lastName || '',
    phone: extras.phone || user.phone || '',
    email: extras.email || user.email,
    birthday: extras.birthday || user.birthday || '',
    streetAddress: extras.streetAddress || user.deliveryAddress || '',
  })
}

export type ProfileFormAdminDraft = {
  clientId: string
  initialExtras: ProfileExtras
  onPersist: (extras: ProfileExtras) => void
}

type ProfileFormProps = {
  /** После успешного сохранения (например закрыть модалку и показать тост). */
  onSaveSuccess?: () => void
  /**
   * Витрина: после сохранения с попыткой записи в БД клиентов (`PUT /api/profile/me` + JWT).
   * Если не передан — при отсутствии adminDraft вызывается `onSaveSuccess`.
   */
  onStorefrontSaveDone?: (r: { serverSyncOk: boolean }) => void
  /** Редактирование профиля клиента в админке — тот же вид формы, данные без привязки к аккаунту. */
  adminDraft?: ProfileFormAdminDraft
}

export function ProfileForm({ onSaveSuccess, onStorefrontSaveDone, adminDraft }: ProfileFormProps) {
  const { user, sessionJwt, openAuthDialog } = useAuth()
  const [form, setForm] = useState<ProfileExtras | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const savedSnapshot = useRef<string>('')

  const hydrate = useCallback((u: AuthUser) => {
    const merged = buildFormFromUser(u, readProfileExtras(u.email))
    setForm(merged)
    savedSnapshot.current = JSON.stringify(merged)
    setAvatarPreview(null)
  }, [])

  useEffect(() => {
    if (adminDraft) return
    if (user) hydrate(user)
  }, [user, hydrate, adminDraft])

  useEffect(() => {
    if (adminDraft || !user || !sessionJwt || !isSiteConfigApiExpected()) return
    let cancelled = false
    void (async () => {
      try {
        const row = await fetchStorefrontClientMe(sessionJwt)
        if (cancelled || !row) return
        const next = buildFormFromUser(user, profileExtrasFromClientTableRow(row))
        setForm(next)
        savedSnapshot.current = JSON.stringify(next)
      } catch {
        /* без API или ошибка — остаётся hydrate + localStorage */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.email, adminDraft, user, sessionJwt])

  useEffect(() => {
    if (!adminDraft) return
    const merged = migrateProfileExtrasPhoneFields({
      ...createDefaultProfileExtras(),
      ...adminDraft.initialExtras,
    })
    setForm(merged)
    savedSnapshot.current = JSON.stringify(merged)
    setAvatarPreview(null)
  }, [adminDraft?.clientId])

  if (!adminDraft && !user) {
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

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return

    let serverSyncOk = true

    if (adminDraft) {
      adminDraft.onPersist(form)
    } else {
      if (!user) return
      writeExtras(user.email, form)
      const tryServer = Boolean(user) && Boolean(sessionJwt) && isSiteConfigApiExpected()
      serverSyncOk = !tryServer
      if (tryServer && user && sessionJwt) {
        try {
          await putStorefrontClientProfileMe(sessionJwt, {
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone,
            profile: form,
          })
          window.dispatchEvent(new Event(CLIENTS_UPDATED_EVENT))
          serverSyncOk = true
        } catch {
          serverSyncOk = false
        }
      }
    }

    savedSnapshot.current = JSON.stringify(form)
    if (adminDraft) {
      onSaveSuccess?.()
    } else if (onStorefrontSaveDone) {
      onStorefrontSaveDone({ serverSyncOk })
    } else {
      onSaveSuccess?.()
    }
  }

  const onCancel = () => {
    try {
      const parsed = JSON.parse(savedSnapshot.current) as ProfileExtras
      setForm(migrateProfileExtrasPhoneFields(parsed))
    } catch {
      if (user) hydrate(user)
      else if (adminDraft) {
        const merged = migrateProfileExtrasPhoneFields({
          ...createDefaultProfileExtras(),
          ...adminDraft.initialExtras,
        })
        setForm(merged)
      }
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

            {/* Одна сетка: на мобильной порядок — фото|почта, имя|фамилия, телефон|дата; на sm+ — фото|почта|телефон и имя|фамилия|дата */}
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-8">
                <div className="order-1 min-w-0 sm:order-1">
                  <p className="block text-sm/6 font-medium text-white">Фото</p>
                  <div className="mt-2 flex items-center gap-2 sm:mt-3 sm:gap-3">
                    {avatarPreview || (!adminDraft && user?.yandexAvatarUrl) ? (
                      <img
                        src={(avatarPreview ?? (!adminDraft ? user?.yandexAvatarUrl : undefined)) as string}
                        alt=""
                        className="size-12 shrink-0 rounded-full border border-white/10 object-cover"
                      />
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden
                        className="size-12 shrink-0 text-gray-500"
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
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/10 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:size-11"
                      aria-label="Загрузить или сменить фото"
                    >
                      <CameraIcon className="size-5" strokeWidth={1.75} aria-hidden />
                    </button>
                  </div>
                </div>
                <div className="order-2 min-w-0 sm:order-2">
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
                <div className="order-3 min-w-0 sm:order-4">
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
                <div className="order-4 min-w-0 sm:order-5">
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
                <div className="order-5 min-w-0 max-w-full sm:order-3 sm:max-w-[26rem]">
                  <label htmlFor="phone" className="block text-sm/6 font-medium text-gray-300">
                    Телефон
                  </label>
                  <ContactPhoneField
                    id="phone"
                    name="phone"
                    variant="admin"
                    valueTel={form.phoneTel}
                    onDigitsChange={(digits) => {
                      setForm((prev) => {
                        if (!prev) return prev
                        const p = parsePhoneTel(digits)
                        const nat = phoneEffectiveNationalDigits(p, digits)
                        return {
                          ...prev,
                          phoneTel: digits,
                          phone: nat ? composePhoneDisplay(p.dial, nat) : '',
                        }
                      })
                    }}
                  />
                </div>
                <div className="order-6 min-w-0 sm:order-6">
                  <label htmlFor="birthday" className="block text-sm/6 font-medium text-white">
                    Дата рождения
                  </label>
                  <div className="mt-2">
                    <input
                      id="birthday"
                      type="date"
                      name="birthday"
                      autoComplete="bday"
                      min="1900-01-01"
                      max={new Date().toISOString().slice(0, 10)}
                      value={birthdayStorageToDateInputValue(form.birthday)}
                      onChange={(ev) => setField('birthday', ev.target.value)}
                      className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 [color-scheme:dark] focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
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

            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-6 sm:gap-x-6 sm:gap-y-8">
              <div className="col-span-1 min-w-0 sm:col-span-2">
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

              <div className="col-span-1 min-w-0 sm:col-span-2">
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

              <div className="col-span-1 min-w-0 sm:col-span-2">
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

              <div className="col-span-1 min-w-0 sm:col-span-2">
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

              <div className="col-span-2 sm:col-span-4">
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
