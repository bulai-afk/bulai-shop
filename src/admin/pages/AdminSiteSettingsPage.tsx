import {
  ArrowPathIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { Icon } from '@iconify/react'
import type { FormEvent, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminClientsFromApi } from '../../api/adminDataApi'
import { fetchSiteConfigFromApi, putSiteConfigToApi } from '../../api/siteConfigApi'
import { ContactPhoneField } from '../../components/ContactPhoneField'
import { ProfileSaveToast } from '../../components/ProfileSaveToast'
import { SiteBrandLogo } from '../../components/SiteBrandLogo'
import { isSiteConfigApiExpected } from '../../constants/apiBase'
import { socialIconComponentForId } from '../../constants/socialNetworkIcons'
import { buildDefaultSiteConfig } from '../data/siteSettingsDefaults'
import {
  CLIENTS_UPDATED_EVENT,
  loadClientsDraft,
  loadSiteConfigDraft,
  saveClientsDraft,
  saveSiteConfigDraft,
} from '../lib/adminDraftStorage'
import type { AdminClientRow } from '../types/adminClients'
import { contactEmailError } from '../../lib/contactEmail'
import { contactPhoneError, phoneEffectiveNationalDigits } from '../../lib/contactPhoneInputDisplay'
import { composePhoneDisplay, composePhoneTel, parsePhoneTel, phoneDigitsFromTel } from '../lib/phoneCountry'
import type { SiteConfigForm, SocialLinkForm } from '../types/siteSettings'

const inputClass =
  'mt-1 block w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50'
const labelClass = 'block text-sm font-medium text-gray-300'
const sectionClass = 'rounded-lg border border-white/10 bg-gray-950/60 p-6 shadow-sm shadow-black/20'
const sectionTitle = 'text-base font-semibold text-white'
const hintClass = 'text-xs text-gray-500'

const fieldErrorTextClass = 'mt-1 text-xs text-red-400'
const fieldInvalidBorderClass =
  'border-red-500/40 focus:border-red-500/50 focus:ring-red-500/40 aria-invalid:border-red-500/40'

const SOCIAL_OPTIONS = [
  { id: 'vk', label: 'ВКонтакте' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'viber', label: 'Viber' },
  { id: 'max', label: 'MAX' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'odnoklassniki', label: 'Одноклассники' },
] as const

function socialLabelById(id: string): string {
  const opt = SOCIAL_OPTIONS.find((item) => item.id === id)
  return opt?.label ?? id
}

function SocialNetworkIcon({ id }: { id: string }) {
  const Comp = socialIconComponentForId(id)
  if (Comp) return <Comp className="size-4 opacity-80" />
  return <Icon icon="mdi:link-variant" className="size-4" aria-hidden />
}

const LOGO_ACCEPT = 'image/svg+xml,image/png,image/jpeg,image/webp,image/gif'
const LOGO_MAX_BYTES = 1_500_000

/** Как у встроенного знака: `BulaiLogo` → `viewBox="0 0 601.85 82.3"`. */
const BULAI_LOGO_VIEWBOX_ASPECT_RATIO = '601.85 / 82.3' as const

const LOGO_CARD_INNER_CLASS =
  'flex w-full max-w-lg min-h-0 min-w-0 items-center justify-center overflow-hidden px-2 py-0.5 sm:px-3 sm:py-1'

/** Компактные кнопки у блока логотипа («Убрать логотип», «Цвет знака») — один размер. */
const LOGO_SIDE_BTN_BASE =
  'inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 text-xs font-medium text-gray-300 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50'

const COLOR_INPUT_FALLBACK = '#c4b5fd'

/** Превью на кнопке: знак без своего цвета. */
function PaletteDefaultSwatch({ className }: { className?: string }) {
  return (
    <span
      className={`relative inline-block size-3.5 shrink-0 overflow-hidden rounded-sm border border-dashed border-white/30 bg-white/[0.04] ${className ?? ''}`}
      aria-hidden
    >
      <span className="pointer-events-none absolute left-1/2 top-1/2 h-px w-[145%] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gray-500" />
    </span>
  )
}

function LogoUploadMiniCard({
  logoUrl,
  logoColor,
  onChange,
  onColorChange,
}: {
  logoUrl: string
  logoColor: string
  onChange: (next: string) => void
  onColorChange: (next: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  const applyFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      window.alert('Выберите файл изображения (SVG, PNG, JPEG, WebP или GIF).')
      return
    }
    if (file.size > LOGO_MAX_BYTES) {
      window.alert(
        'Файл слишком большой (максимум 1,5 МБ). Сожмите картинку или используйте SVG.',
      )
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') onChange(result)
    }
    reader.onerror = () => window.alert('Не удалось прочитать файл.')
    reader.readAsDataURL(file)
  }

  const hasLogo = logoUrl.trim().length > 0
  const hasTint = logoColor.trim().length > 0
  const validTintHex = /^#[0-9A-Fa-f]{6}$/.test(logoColor)
  const colorInputValue = validTintHex ? logoColor : COLOR_INPUT_FALLBACK

  return (
    <div>
      <span className={labelClass} id="brand-logo-file-label">
        Файл логотипа
      </span>
      <p className={`mt-0.5 ${hintClass}`}>
        SVG, PNG, JPEG, WebP или GIF, до 1,5&nbsp;МБ. Нажмите на карточку, чтобы выбрать файл.{' '}
        Соотношение сторон — ширина к высоте примерно 7,3&nbsp;:&nbsp;1 (ориентир по пропорциям viewBox 601.85×82.3); при
        заметно другом формате в превью и на сайте появятся поля. Размер на сайте:
        высота знака 32&nbsp;px, ширина до 200&nbsp;px; для растра закладывайте запас по пикселям (например ширина
        силуэта от ~400&nbsp;px), чтобы после масштаба не было мыла. Загрузку можно не указывать.
      </p>
      <p className={`mt-1.5 ${hintClass}`}>
        Чтобы смена цвета в шапке работала, файл должен подходить под маску: прозрачный фон и непрозрачный силуэт знака
        (PNG/WebP с альфой или SVG без залитой подложки). В SVG оформите знак контурами или путями на прозрачном холсте;
        цвет заливки в файле не важен — его заменит выбранный цвет. Несколько разноцветных слоёв или вложенный в SVG цветной
        растр перекрашиваются непредсказуемо; сплошной JPEG без прозрачности для тонировки не подходит.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept={LOGO_ACCEPT}
        className="sr-only"
        aria-labelledby="brand-logo-file-label"
        onChange={(e) => {
          applyFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <div className="mt-2">
        <div className="flex flex-wrap items-start gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label={hasLogo ? 'Заменить файл логотипа' : 'Загрузить файл логотипа'}
            className={`group flex min-w-0 max-w-lg flex-1 shrink-0 flex-col overflow-hidden rounded-xl border text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 ${
              hasLogo
                ? 'border-white/15 bg-gray-900/80 shadow-inner shadow-black/20'
                : 'border-dashed border-white/20 bg-white/[0.03] hover:border-indigo-500/35 hover:bg-indigo-950/25'
            }`}
          >
            <div
              className={`bg-black/25 ${LOGO_CARD_INNER_CLASS}`}
              style={{ aspectRatio: BULAI_LOGO_VIEWBOX_ASPECT_RATIO }}
            >
              {hasLogo ? (
                <div className="flex h-full min-h-0 w-full min-w-0 items-center justify-center px-2 py-1">
                  <SiteBrandLogo
                    logoUrl={logoUrl}
                    logoColor={logoColor}
                    layout="navbar"
                    className="!box-border !block !h-auto !max-h-full !w-full !max-w-[min(100%,95%)] !shrink-0 [aspect-ratio:601.85/82.3]"
                  />
                </div>
              ) : hasTint ? (
                <div className="flex h-full min-h-0 w-full min-w-0 items-center justify-center px-1 py-0.5 sm:px-2">
                  <div className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-2 text-center sm:gap-2.5">
                    <PhotoIcon
                      className="size-5 shrink-0 text-gray-500 transition group-hover:text-indigo-300/90 sm:size-6"
                      aria-hidden
                    />
                    <span className="min-w-0 max-w-[18rem] text-xs font-medium text-gray-300 group-hover:text-white sm:text-sm">
                      Перед сменой цвета загрузите логотип.
                    </span>
                    {validTintHex ? (
                      <span
                        className="size-5 shrink-0 rounded-sm border border-white/25 shadow-inner sm:size-6"
                        style={{ backgroundColor: logoColor }}
                        title={logoColor}
                      />
                    ) : (
                      <span
                        className="size-5 shrink-0 rounded-sm border border-dashed border-white/20 sm:size-6"
                        aria-hidden
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-full min-h-0 w-full min-w-0 items-center justify-center px-1 py-0.5 sm:px-2">
                  <div className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-2 text-center sm:gap-2.5">
                    <PhotoIcon
                      className="size-5 shrink-0 text-gray-500 transition group-hover:text-indigo-300/90 sm:size-6"
                      aria-hidden
                    />
                    <span className="min-w-0 max-w-[18rem] text-xs font-medium text-gray-300 group-hover:text-white sm:text-sm">
                      Нажмите, чтобы загрузить логотип
                    </span>
                  </div>
                </div>
              )}
            </div>
          </button>

          <div className="flex shrink-0 flex-col items-stretch gap-2">
            <button
              type="button"
              disabled={!hasLogo}
              title={hasLogo ? undefined : 'Сначала загрузите файл логотипа'}
              onClick={() => {
                if (hasLogo) onChange('')
              }}
              className={`${LOGO_SIDE_BTN_BASE} ${
                hasLogo
                  ? 'hover:border-rose-500/40 hover:bg-rose-950/30 hover:text-rose-200'
                  : 'cursor-not-allowed border-white/10 text-gray-600 opacity-60'
              }`}
            >
              <TrashIcon className="size-3.5" aria-hidden />
              Убрать логотип
            </button>
            <div className="flex w-full items-center gap-2">
              {/*
                Нативная палитра якорится к rect элемента color: инпут накрывает ту же область, что и подпись «Задать цвет».
              */}
              <label
                title="Для встроенного знака и для файла с прозрачным фоном."
                className={`${LOGO_SIDE_BTN_BASE} relative isolate min-w-0 flex-1 cursor-pointer overflow-hidden hover:border-indigo-500/40 hover:bg-indigo-950/30 hover:text-indigo-200 has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500/50`}
              >
                <input
                  id="brand-logo-color"
                  type="color"
                  value={colorInputValue}
                  onChange={(e) => onColorChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-0 z-10 m-0 h-full max-h-full w-full max-w-full cursor-pointer border-0 p-0 opacity-[0.012] [color-scheme:dark]"
                  aria-label="Задать цвет знака"
                />
                <span className="pointer-events-none relative z-0 inline-flex items-center gap-1.5">
                  {hasTint && /^#[0-9A-Fa-f]{6}$/.test(logoColor) ? (
                    <span
                      className="size-3.5 shrink-0 rounded-sm border border-white/25 shadow-inner"
                      style={{ backgroundColor: logoColor }}
                      aria-hidden
                    />
                  ) : (
                    <PaletteDefaultSwatch />
                  )}
                  Задать цвет
                </span>
              </label>
              <button
                type="button"
                disabled={!hasTint}
                title={
                  hasTint ? 'Сбросить только цвет встроенного знака' : 'Цвет уже по умолчанию'
                }
                aria-label="Сбросить цвет знака"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (hasTint) onColorChange('')
                }}
                className={`${LOGO_SIDE_BTN_BASE} relative z-20 shrink-0 justify-center px-2 ${
                  hasTint
                    ? 'hover:border-white/25 hover:bg-white/5 hover:text-white'
                    : 'cursor-not-allowed border-white/10 text-gray-600 opacity-50'
                }`}
              >
                <ArrowPathIcon className="size-4 shrink-0" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function clientRowLabel(c: AdminClientRow): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ').trim()
  return name || c.email?.trim() || c.phone?.trim() || c.id
}

function normalizeSearchDigits(s: string): string {
  return s.replace(/\D/g, '')
}

/** Поиск клиента для выдачи в подсказках — как подбор товара в заказе (фрагмент запроса в полях карточки). */
function matchesClientAdminAccessSearch(c: AdminClientRow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false
  const hit = (s: string) => s.toLowerCase().includes(q)
  const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ').trim()
  const revName = [c.lastName, c.firstName].filter(Boolean).join(' ').trim()
  if (fullName && hit(fullName)) return true
  if (revName && hit(revName)) return true
  if (c.firstName.trim() && hit(c.firstName)) return true
  if (c.lastName.trim() && hit(c.lastName)) return true
  const em = c.email?.trim()
  if (em && hit(em)) return true
  const ph = c.phone?.trim()
  if (ph && hit(ph)) return true
  const qDigits = normalizeSearchDigits(query)
  if (qDigits.length >= 3) {
    if (normalizeSearchDigits(c.phone).includes(qDigits)) return true
    const pPh = c.profile?.phone?.trim()
    if (pPh && normalizeSearchDigits(pPh).includes(qDigits)) return true
  }
  const pEm = c.profile?.email?.trim()
  if (pEm && hit(pEm)) return true
  if (c.id.toLowerCase().includes(q)) return true
  return false
}

function clientSearchThumbInitials(c: AdminClientRow): string {
  const a = c.firstName?.trim()?.[0]
  const b = c.lastName?.trim()?.[0]
  const s = `${a ?? ''}${b ?? ''}`.toUpperCase()
  return s || '?'
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className={sectionClass}>
      <h2 className={sectionTitle}>{title}</h2>
      {description ? <p className={`mt-1 ${hintClass}`}>{description}</p> : null}
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  )
}

export function AdminSiteSettingsPage() {
  const [sc, setSc] = useState<SiteConfigForm>(() => buildDefaultSiteConfig())
  const [clients, setClients] = useState<AdminClientRow[]>([])
  const [savedFlash, setSavedFlash] = useState(false)
  const [saveBlockedFlash, setSaveBlockedFlash] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [apiLoad, setApiLoad] = useState<'idle' | 'loading' | 'ok' | 'empty' | 'error' | 'off'>('idle')
  const [saveServerFailed, setSaveServerFailed] = useState(false)

  useEffect(() => {
    setSc(loadSiteConfigDraft())
    setClients(loadClientsDraft())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!isSiteConfigApiExpected()) {
      setApiLoad('off')
      return
    }
    let cancelled = false
    setApiLoad('loading')
    ;(async () => {
      try {
        const remote = await fetchSiteConfigFromApi()
        if (cancelled) return
        if (remote != null) {
          saveSiteConfigDraft(remote)
          setSc(remote)
          setApiLoad('ok')
        } else {
          setApiLoad('empty')
        }
      } catch {
        if (!cancelled) setApiLoad('error')
      }
      try {
        const remoteClients = await fetchAdminClientsFromApi()
        if (cancelled || remoteClients == null || !Array.isArray(remoteClients.clients)) return
        saveClientsDraft(remoteClients.clients)
        setClients(loadClientsDraft())
      } catch {
        /* список клиентов для подбора доступа — только из localStorage */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mounted])

  useEffect(() => {
    const sync = () => setClients(loadClientsDraft())
    window.addEventListener('storage', sync)
    window.addEventListener(CLIENTS_UPDATED_EVENT, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(CLIENTS_UPDATED_EVENT, sync)
    }
  }, [])

  const [adminAccessClientQuery, setAdminAccessClientQuery] = useState('')

  const adminAccessClientMatches = useMemo(() => {
    const q = adminAccessClientQuery.trim()
    if (!q) return []
    const inList = new Set(sc.adminAccessClientIds)
    return clients
      .filter((c) => !inList.has(c.id))
      .filter((c) => matchesClientAdminAccessSearch(c, q))
      .slice(0, 12)
  }, [clients, sc.adminAccessClientIds, adminAccessClientQuery])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('details[data-social-dropdown="true"]')) return
      document
        .querySelectorAll<HTMLDetailsElement>('details[data-social-dropdown="true"][open]')
        .forEach((el) => el.removeAttribute('open'))
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const setSite = useCallback((patch: Partial<SiteConfigForm> | ((prev: SiteConfigForm) => SiteConfigForm)) => {
    setSc((prev) => (typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }))
  }, [])

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaveServerFailed(false)
    const dSave = phoneDigitsFromTel(sc.contact.phoneTel)
    const telNorm =
      !dSave || dSave === '3' || dSave === '37' || sc.contact.phoneTel.trim() === '+'
        ? ''
        : sc.contact.phoneTel
    const p = parsePhoneTel(telNorm)
    if (contactPhoneError(p) || contactEmailError(sc.contact.email)) {
      setSaveBlockedFlash(true)
      window.setTimeout(() => setSaveBlockedFlash(false), 2800)
      return
    }
    const contact = {
      ...sc.contact,
      phoneTel: telNorm.trim() === '' ? '' : composePhoneTel(p.dial, p.nationalDigits),
      phoneDisplay: p.nationalDigits ? composePhoneDisplay(p.dial, p.nationalDigits) : '',
    }
    const next = { ...sc, contact }
    setSc(next)
    saveSiteConfigDraft(next)
    if (isSiteConfigApiExpected()) {
      try {
        await putSiteConfigToApi(next)
        setApiLoad('ok')
      } catch {
        setSaveServerFailed(true)
      }
    }
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2200)
  }

  const updateSocial = (index: number, patch: Partial<SocialLinkForm>) => {
    setSite((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }))
  }

  const removeSocial = (index: number) => {
    setSite((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index),
    }))
  }

  const setSocialId = (index: number, id: string) => {
    setSite((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.map((row, i) =>
        i === index ? { ...row, id, name: socialLabelById(id) } : row,
      ),
    }))
  }

  const addSocial = () => {
    setSite((prev) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { id: 'vk', name: socialLabelById('vk'), href: 'https://' }],
    }))
  }

  const addAdminAccessClient = (clientId: string) => {
    if (!clientId) return
    setSite((prev) => {
      if (prev.adminAccessClientIds.includes(clientId)) return prev
      return { ...prev, adminAccessClientIds: [...prev.adminAccessClientIds, clientId] }
    })
  }

  const removeAdminAccessClient = (clientId: string) => {
    setSite((prev) => ({
      ...prev,
      adminAccessClientIds: prev.adminAccessClientIds.filter((id) => id !== clientId),
    }))
  }

  if (!mounted) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm text-gray-400">Загрузка…</p>
      </div>
    )
  }

  const emailFieldError = contactEmailError(sc.contact.email)

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Настройки сайта</h1>
          <p className="mt-2 max-w-prose text-sm text-gray-400">
            Здесь задаются логотип, контакты, соцсети и текст в подвале.{' '}
            {isSiteConfigApiExpected()
              ? 'При сохранении данные уходят в базу (MariaDB) и дублируются в этом браузере для быстрого отображения на витрине.'
              : 'Локально без URL API изменения хранятся в этом браузере; для синхронизации с базой задайте VITE_API_URL на бэкенд.'}{' '}
            Текстовую ленту над шапкой настраивают в разделе{' '}
            <Link to="/admin/promo-materials/home" className="text-indigo-300 underline-offset-2 hover:underline">
              Промо материалы
            </Link>
            .
          </p>
          {apiLoad === 'loading' ? (
            <p className="mt-2 text-sm text-gray-500">Загрузка настроек с сервера…</p>
          ) : null}
          {apiLoad === 'error' ? (
            <p className="mt-2 text-sm text-amber-300/90">
              Не удалось загрузить данные из базы — показаны значения из браузера.
            </p>
          ) : null}
          {apiLoad === 'empty' ? (
            <p className="mt-2 text-sm text-gray-400">
              В базе ещё нет сохранённых настроек. После первого «Сохранить» появится запись в MariaDB.
            </p>
          ) : null}
          {apiLoad === 'ok' ? (
            <p className="mt-2 text-xs text-gray-500">Актуальные данные загружены из базы.</p>
          ) : null}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-indigo-500/20 bg-indigo-950/30 px-3 py-2.5 text-sm text-indigo-100/90">
          <InformationCircleIcon className="mt-0.5 size-5 shrink-0 text-indigo-400" aria-hidden />
          <p>
            Логотип можно не загружать — тогда на сайте останется стандартный знак магазина.
          </p>
        </div>

        <form onSubmit={onSave} className="mt-8 space-y-8">
          <Section
            title="Логотип"
            description="Показывается в шапке, на странице «О компании» и в окнах входа и оплаты. Если файл не загружен, используется встроенный знак."
          >
            <LogoUploadMiniCard
              logoUrl={sc.brand.logoUrl}
              logoColor={sc.brand.logoColor}
              onChange={(logoUrl) => setSite({ brand: { ...sc.brand, logoUrl } })}
              onColorChange={(logoColor) => setSite({ brand: { ...sc.brand, logoColor } })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="brand-logoAlt">
                  Краткое описание для подсказки и доступности
                </label>
                <p className={`mt-0.5 ${hintClass}`}>Текст при наведении и для программ чтения с экрана.</p>
                <input
                  id="brand-logoAlt"
                  type="text"
                  value={sc.brand.logoAlt}
                  onChange={(e) => setSite({ brand: { ...sc.brand, logoAlt: e.target.value } })}
                  className={inputClass}
                  placeholder="Например: Bulai Shop"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="brand-logoHref">
                  Куда вести при нажатии на логотип
                </label>
                <p className={`mt-0.5 ${hintClass}`}>Обычно главная страница, например «/».</p>
                <input
                  id="brand-logoHref"
                  type="text"
                  value={sc.brand.logoHref}
                  onChange={(e) => setSite({ brand: { ...sc.brand, logoHref: e.target.value } })}
                  className={inputClass}
                  placeholder="/"
                />
              </div>
            </div>
          </Section>

          <Section
            title="Контакты"
            description="Телефон, почта и адрес показываются в шапке, футере и других блоках сайта."
          >
            <div className="grid gap-6 sm:grid-cols-2 sm:items-start">
              <div className="w-full max-w-[22rem] sm:max-w-[26rem]">
                <label className={labelClass} htmlFor="contact-phone">
                  Телефон
                </label>
                <ContactPhoneField
                  id="contact-phone"
                  variant="admin"
                  valueTel={sc.contact.phoneTel}
                  onDigitsChange={(digits) =>
                    setSite((prev) => {
                      const p = parsePhoneTel(digits)
                      const nat = phoneEffectiveNationalDigits(p, digits)
                      return {
                        ...prev,
                        contact: {
                          ...prev.contact,
                          phoneTel: digits,
                          phoneDisplay: nat ? composePhoneDisplay(p.dial, nat) : '',
                        },
                      }
                    })
                  }
                  showDialPreview
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="contact-email">
                  Электронная почта
                </label>
                <input
                  id="contact-email"
                  type="email"
                  autoComplete="off"
                  value={sc.contact.email}
                  onChange={(e) => setSite({ contact: { ...sc.contact, email: e.target.value } })}
                  aria-invalid={emailFieldError ? true : undefined}
                  aria-describedby={emailFieldError ? 'contact-email-error' : undefined}
                  className={`${inputClass}${emailFieldError ? ` ${fieldInvalidBorderClass}` : ''}`}
                  placeholder="Введите почту"
                />
                {emailFieldError ? (
                  <p id="contact-email-error" className={fieldErrorTextClass} role="alert">
                    {emailFieldError}
                  </p>
                ) : null}
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="contact-address">
                Адрес
              </label>
              <p className={`mt-0.5 ${hintClass}`}>Город, улица, офис — как нужно показать посетителям.</p>
              <textarea
                id="contact-address"
                rows={3}
                value={sc.contact.addressDisplay}
                onChange={(e) => setSite({ contact: { ...sc.contact, addressDisplay: e.target.value } })}
                className={inputClass}
                placeholder="Город, улица, офис — одной или несколькими строками"
              />
            </div>
          </Section>

          <Section
            title="Соцсети"
            description="Ссылки в подвале и в мобильном меню. Выберите соцсеть/мессенджер из списка и вставьте ссылку."
          >
            <ul className="space-y-4">
              {sc.socialLinks.map((row, index) => (
                <li
                  key={index}
                  className="flex flex-col gap-3 rounded-md border border-white/5 bg-white/[0.02] p-4 sm:flex-row sm:items-end"
                >
                  <div className="min-w-0 sm:w-64">
                    <label className={labelClass}>Соцсеть или мессенджер</label>
                    <details data-social-dropdown="true" className="group relative mt-1">
                      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:border-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/50">
                        <span aria-hidden className="text-gray-300">
                          <SocialNetworkIcon id={row.id} />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{socialLabelById(row.id) || row.name || row.id}</span>
                        <span aria-hidden className="text-gray-400 transition group-open:rotate-180">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                            <path
                              fillRule="evenodd"
                              d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      </summary>
                      <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-md border border-white/10 bg-[#101f30] p-1 shadow-lg shadow-black/40">
                        {SOCIAL_OPTIONS.some((opt) => opt.id === row.id) ? null : (
                          <button
                            type="button"
                            onClick={(e) => {
                              setSocialId(index, row.id)
                              e.currentTarget.closest('details')?.removeAttribute('open')
                            }}
                            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-gray-200 transition hover:bg-white/10 hover:text-white"
                          >
                            <span aria-hidden className="text-gray-300">
                              <SocialNetworkIcon id={row.id} />
                            </span>
                            <span className="truncate">{row.name || row.id}</span>
                          </button>
                        )}
                        {SOCIAL_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={(e) => {
                              setSocialId(index, opt.id)
                              e.currentTarget.closest('details')?.removeAttribute('open')
                            }}
                            className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm transition hover:bg-white/10 hover:text-white ${
                              row.id === opt.id ? 'bg-white/10 text-white' : 'text-gray-200'
                            }`}
                          >
                            <span aria-hidden className="text-gray-300">
                              <SocialNetworkIcon id={opt.id} />
                            </span>
                            <span className="truncate">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </details>
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className={labelClass}>Ссылка на соцсеть или мессенджер</label>
                    <input
                      type="url"
                      value={row.href}
                      onChange={(e) => updateSocial(index, { href: e.target.value })}
                      className={inputClass}
                      placeholder="https://"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSocial(index)}
                    className="inline-flex items-center justify-center gap-1 self-start rounded-md border border-white/10 px-3 py-2 text-sm text-gray-300 transition hover:border-rose-500/40 hover:bg-rose-950/40 hover:text-rose-200 sm:self-auto"
                    aria-label="Удалить ссылку"
                  >
                    <TrashIcon className="size-4" />
                    Удалить
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={addSocial}
              className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-indigo-500/40 hover:bg-indigo-950/40 hover:text-white"
            >
              <PlusIcon className="size-4" />
              Добавить строку
            </button>
          </Section>

          <Section
            title="Реквизиты"
            description="Реквизиты или юрлицо. Можно вводить построчно: одна строка — один реквизит."
          >
            <div>
              <label className={labelClass} htmlFor="footer-legal">
                Реквизиты или юридическое название
              </label>
              <p className={`mt-0.5 ${hintClass}`}>
                Введите реквизиты по строкам: один пункт на одной строке (например, название юрлица, УНП, расчетный
                счет, банк).
              </p>
              <textarea
                id="footer-legal"
                rows={4}
                value={sc.footer.legalEntityLine}
                onChange={(e) =>
                  setSite({
                    footer: { ...sc.footer, legalEntityLine: e.target.value.replace(/\r\n?/g, '\n') },
                  })
                }
                className={inputClass}
                placeholder={'ИП Иванов И.И.\nУНП 123456789\nр/с BY00BBBB30120000000000000000'}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="footer-shop">
                Подпись магазина
              </label>
              <p className={`mt-0.5 ${hintClass}`}>Обычно копирайт и название, например: © 2026 Название магазина.</p>
              <textarea
                id="footer-shop"
                rows={2}
                value={sc.footer.shopNameLine}
                onChange={(e) => setSite({ footer: { ...sc.footer, shopNameLine: e.target.value } })}
                className={inputClass}
              />
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
              <p className={labelClass}>Как будет отображаться в футере</p>
              <p className="mt-2 break-words text-sm text-gray-300">
                {(() => {
                  const shop = sc.footer.shopNameLine.trim() || 'Подпись сайта не заполнена'
                  const legalRaw = sc.footer.legalEntityLine.trim()
                  const legal = legalRaw
                    ? legalRaw
                        .split(/\r?\n/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .join(', ')
                    : 'Реквизиты не заполнены'
                  return `${shop}, ${legal}`
                })()}
              </p>
            </div>
          </Section>

          <Section
            title="Права доступа"
            description="Пользователи из базы клиентов, которым разрешён вход в админ-панель. Совпадение проверяется по электронной почте или номеру телефона с карточкой клиента. Пока список пуст — вход в админку закрыт для всех."
          >
            <p className={`${hintClass}`}>
              После изменения списка нажмите «Сохранить» внизу страницы. Добавляйте только доверенных лиц: у них
              должна быть та же почта или телефон, что при входе на сайте.
            </p>
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-gray-400">Добавить из базы клиентов</p>
              <p className="mt-1 text-xs text-gray-500">
                Поиск по имени, почте, телефону или id — так же, как товар в заказе подбирается по SKU и названию.
              </p>
              {clients.length > 0 ? (
                <>
                  <div className="relative mt-2">
                    <MagnifyingGlassIcon
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
                      aria-hidden
                    />
                    <input
                      type="search"
                      value={adminAccessClientQuery}
                      onChange={(e) => setAdminAccessClientQuery(e.target.value)}
                      placeholder="Поиск по имени, почте, телефону…"
                      className={`${inputClass} pl-9`}
                      aria-label="Поиск клиента для прав администратора"
                    />
                  </div>
                  {adminAccessClientQuery.trim().length > 0 ? (
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                      {adminAccessClientMatches.map((c) => {
                        const sub = [c.email?.trim(), c.phone?.trim()].filter(Boolean).join(' · ')
                        return (
                          <li
                            key={`admin-access-pick-${c.id}`}
                            className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-2"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <div
                                className="flex size-9 shrink-0 items-center justify-center rounded border border-white/10 bg-white/[0.04] text-[10px] font-medium text-gray-400"
                                aria-hidden
                              >
                                {clientSearchThumbInitials(c)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm text-gray-200">{clientRowLabel(c)}</p>
                                <p className="truncate text-[11px] text-gray-500">{sub || c.id}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => addAdminAccessClient(c.id)}
                              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-gray-200 transition hover:border-indigo-400/50 hover:bg-indigo-950/40 hover:text-white"
                            >
                              <PlusIcon className="size-3.5" aria-hidden />
                              Добавить
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}
                  {adminAccessClientQuery.trim().length > 0 && adminAccessClientMatches.length === 0 ? (
                    <p className="mt-2 text-xs text-gray-500">
                      {clients.some((row) => matchesClientAdminAccessSearch(row, adminAccessClientQuery))
                        ? 'Подходящие клиенты уже в списке доступа или измените запрос.'
                        : 'Ничего не найдено. Измените поиск.'}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-2 text-xs text-gray-500">
                  В базе пока нет клиентов. Создайте записи в разделе{' '}
                  <Link to="/admin/clients" className="text-indigo-300 underline hover:text-indigo-200">
                    Клиенты
                  </Link>
                  .
                </p>
              )}
            </div>
            {sc.adminAccessClientIds.length > 0 ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Кому разрешён вход в админку
                </p>
                <ul className="mt-2 space-y-2">
                  {sc.adminAccessClientIds.map((id) => {
                    const row = clients.find((c) => c.id === id)
                    const label = row ? clientRowLabel(row) : `Удалённый клиент (${id.slice(0, 8)}…)`
                    const sub = row
                      ? [row.email?.trim(), row.phone?.trim()].filter(Boolean).join(' · ')
                      : 'Карточка не найдена — удалите строку или восстановите клиента.'
                    return (
                      <li
                        key={id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">{label}</p>
                          <p className="mt-0.5 text-xs text-gray-500">{sub}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAdminAccessClient(id)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-gray-300 transition hover:border-rose-500/40 hover:bg-rose-950/30 hover:text-rose-200"
                        >
                          <TrashIcon className="size-4" aria-hidden />
                          Убрать
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Список пуст — пункт «Панель управления» не показывается, маршрут /admin недоступен. Первых
                администраторов можно прописать в конфиге на сервере или добавить сюда, если у вас уже есть
                доступ.
              </p>
            )}
          </Section>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-6">
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              Сохранить
            </button>
            {saveBlockedFlash ? (
              <span className="text-sm text-red-400" role="status">
                Не сохранено: проверьте телефон и почту.
              </span>
            ) : null}
            {saveServerFailed ? (
              <span className="max-w-md text-sm text-amber-300/90" role="status">
                В браузере сохранено, но сервер недоступен — база не обновлена. Проверьте API и MariaDB.
              </span>
            ) : null}
          </div>
        </form>
      </div>
      <ProfileSaveToast
        open={savedFlash}
        onDismiss={() => setSavedFlash(false)}
        message="Спасибо, что обновили информацию о компании — мы это сохранили, чтобы данные сайта были актуальными."
      />
    </div>
  )
}
