import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import { ChevronUpDownIcon, MagnifyingGlassIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { ProfileSettingsDialog } from '../../components/ProfileSettingsDialog'
import {
  createDefaultProfileExtras,
  profileExtrasFromClientTableRow,
  type ProfileExtras,
} from '../../pages/ProfilePage'
import { saveClientsDraft } from '../lib/adminDraftStorage'
import type { AdminClientRow } from '../types/adminClients'
import type { ProductCatalogRow, ProductsInventoryDraft } from '../types/siteSettings'
import {
  ORDER_PAYMENT_METHODS,
  ORDER_STAGES,
  orderStageLabel,
  paymentStatusLabel,
  type AdminOrderRow,
  type OrderPaymentMethodId,
  type OrderStageId,
} from '../types/adminOrders'
import { findClientForOrder, orderClientLinkPatch } from '../../utils/clientOrderLink'

const inputClass =
  'block w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50'

const listboxOptionsPanelClass =
  'z-[200] mt-1 max-h-60 w-[var(--button-width)] overflow-auto rounded-md border border-white/10 bg-gray-900 py-1 text-sm shadow-xl shadow-black/40 outline-none [--anchor-gap:0.25rem] focus:outline-none data-closed:scale-95 data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in'

const listboxOptionClass =
  'cursor-pointer px-3 py-2 text-left text-gray-200 data-focus:bg-white/10 data-selected:bg-indigo-500/20 data-selected:font-medium data-selected:text-white'

/** Страны — как в форме профиля на сайте */
const PROFILE_COUNTRY_OPTIONS = ['Россия', 'Беларусь', 'Казахстан', 'США', 'Канада', 'Мексика'] as const

function clientRowToProfileExtras(row: AdminClientRow): ProfileExtras {
  return profileExtrasFromClientTableRow(row)
}

function patchClientProfile(row: AdminClientRow, patch: Partial<ProfileExtras>): AdminClientRow {
  const mergedExtras = { ...clientRowToProfileExtras(row), ...patch }
  return {
    ...row,
    firstName: mergedExtras.firstName,
    lastName: mergedExtras.lastName,
    email: mergedExtras.email,
    phone: mergedExtras.phone,
    profile: {
      ...createDefaultProfileExtras(),
      ...row.profile,
      ...patch,
    },
  }
}

function PaymentMethodSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: OrderPaymentMethodId
  onChange: (id: OrderPaymentMethodId) => void
  ariaLabel?: string
}) {
  const aria = ariaLabel ?? 'Способ оплаты'
  const current = ORDER_PAYMENT_METHODS.find((m) => m.id === value) ?? ORDER_PAYMENT_METHODS[0]
  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <ListboxButton
          className={`${inputClass} mt-1 flex w-full cursor-default items-center justify-between gap-2 text-left`}
          aria-label={aria}
        >
          <span className="min-w-0 flex-1 truncate">{current.label}</span>
          <ChevronUpDownIcon className="size-4 shrink-0 text-gray-400" aria-hidden />
        </ListboxButton>
        <ListboxOptions
          modal={false}
          portal
          transition
          anchor="bottom start"
          className={listboxOptionsPanelClass}
        >
          {ORDER_PAYMENT_METHODS.map((m) => (
            <ListboxOption key={m.id} value={m.id} className={listboxOptionClass}>
              {m.label}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}

function CountryListbox({
  value,
  onChange,
  ariaLabel,
}: {
  value: string
  onChange: (country: string) => void
  ariaLabel?: string
}) {
  const options = (() => {
    const known = (PROFILE_COUNTRY_OPTIONS as readonly string[]).includes(value)
    if (value && !known) return [value, ...PROFILE_COUNTRY_OPTIONS]
    return [...PROFILE_COUNTRY_OPTIONS]
  })()

  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <ListboxButton
          className={`${inputClass} mt-1 flex w-full cursor-default items-center justify-between gap-2 text-left`}
          aria-label={ariaLabel ?? 'Страна'}
        >
          <span className="min-w-0 flex-1 truncate">{value || '—'}</span>
          <ChevronUpDownIcon className="size-4 shrink-0 text-gray-400" aria-hidden />
        </ListboxButton>
        <ListboxOptions
          modal={false}
          portal
          transition
          anchor="bottom start"
          className={listboxOptionsPanelClass}
        >
          {options.map((c) => (
            <ListboxOption key={c} value={c} className={listboxOptionClass}>
              {c}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}

function newOrderLineItemId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `li-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  }
}

function formatCatalogPriceForOrderLine(n: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(n)} ₽`
}

function matchesProductCatalogSearch(row: ProductCatalogRow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false
  const hit = (s: string) => s.toLowerCase().includes(q)
  if (hit(row.sku)) return true
  if (hit(row.name)) return true
  if (hit(row.description)) return true
  return false
}

function OrderStageTimeline({
  currentStageId,
  onSelectStage,
}: {
  currentStageId: OrderStageId
  onSelectStage: (id: OrderStageId) => void
}) {
  const currentIndex = ORDER_STAGES.findIndex((s) => s.id === currentStageId)
  const safeIndex = currentIndex >= 0 ? currentIndex : 0

  return (
    <div className="mb-4 border-b border-white/10 pb-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Этапы заказа</p>
      <nav aria-label="Этапы заказа">
        <ol className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-2">
          {ORDER_STAGES.map((stage, index) => {
            const done = index < safeIndex
            const current = index === safeIndex
            const isLast = index === ORDER_STAGES.length - 1
            return (
              <li key={stage.id} className="relative flex items-stretch lg:min-w-0 lg:flex-1">
                <button
                  type="button"
                  onClick={() => onSelectStage(stage.id)}
                  aria-current={current ? 'step' : undefined}
                  aria-label={`Этап «${stage.label}». ${current ? 'Выбран.' : 'Нажмите, чтобы выбрать этот этап.'}`}
                  className={`group relative flex w-full min-h-[2.5rem] cursor-pointer items-center justify-center rounded-md border text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1b2a] lg:min-h-[2.75rem] ${
                    !isLast
                      ? 'lg:rounded-r-none lg:rounded-l-md lg:[clip-path:polygon(0_0,calc(100%-1.25rem)_0,100%_50%,calc(100%-1.25rem)_100%,0_100%)]'
                      : 'lg:rounded-md'
                  } ${
                    current
                      ? 'border-indigo-500/55 bg-indigo-500/15 text-white shadow-[inset_0_0_0_1px_rgba(129,140,248,0.25)]'
                      : done
                        ? 'border-white/10 bg-white/[0.03] text-indigo-200/95 hover:border-indigo-500/35 hover:bg-indigo-500/10 active:bg-indigo-500/15'
                        : 'border-white/10 bg-white/[0.02] text-gray-500 hover:border-white/25 hover:bg-white/10 hover:text-gray-200 active:bg-white/[0.08]'
                  }`}
                >
                  {!isLast ? (
                    <svg
                      aria-hidden
                      className="pointer-events-none absolute right-0 top-0 hidden h-full w-5 lg:block"
                      viewBox="0 0 20 100"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M 0 0 L 20 50 L 0 100"
                        fill="none"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        strokeWidth={1}
                        className={
                          current
                            ? 'stroke-indigo-400/70'
                            : done
                              ? 'stroke-white/10 transition-colors group-hover:stroke-indigo-500/40'
                              : 'stroke-white/10 transition-colors group-hover:stroke-white/25'
                        }
                      />
                    </svg>
                  ) : null}
                  <span className="relative z-[1] flex w-full flex-col items-center justify-center gap-1.5 px-2 py-1.5 lg:flex-row lg:gap-2 lg:pr-3 lg:text-left">
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition group-hover:border-indigo-400/50 ${
                        current
                          ? 'border-indigo-400 bg-indigo-500/35 text-white shadow-[0_0_0_1px_rgba(129,140,248,0.4)]'
                          : done
                            ? 'border-indigo-500/65 bg-indigo-500/15 text-indigo-100'
                            : 'border-white/20 bg-white/5 text-gray-500 group-hover:text-gray-300'
                      }`}
                    >
                      {done ? (
                        <CheckIcon className="size-4 text-indigo-200" aria-hidden />
                      ) : (
                        <span className="tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                      )}
                    </span>
                    <span
                      className={`max-w-[11rem] text-xs leading-snug ${
                        current ? 'font-medium text-indigo-100' : 'text-gray-400 group-hover:text-gray-300'
                      }`}
                    >
                      {stage.label}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}

export type AdminOrderPreviewDialogProps = {
  open: boolean
  onClose: () => void
  orderId: string | null
  orders: AdminOrderRow[]
  onOrdersChange: Dispatch<SetStateAction<AdminOrderRow[]>>
  clients: AdminClientRow[]
  onClientsChange: Dispatch<SetStateAction<AdminClientRow[]>>
  productsInventoryDraft: ProductsInventoryDraft
  /** Текст под таймлайном: как сохранить черновик заказов */
  persistHint: string
  /** Если задано — вызывается после каждого изменения строк заказа (синхронизация с хранилищем) */
  onPersistOrdersDraft?: (next: AdminOrderRow[]) => void
  /** После сохранения черновика клиентов в localStorage (например запись в БД) */
  onPersistClientsDraft?: (next: AdminClientRow[]) => void
}

export function AdminOrderPreviewDialog({
  open,
  onClose,
  orderId,
  orders,
  onOrdersChange,
  clients,
  onClientsChange,
  productsInventoryDraft,
  persistHint,
  onPersistOrdersDraft,
  onPersistClientsDraft,
}: AdminOrderPreviewDialogProps) {
  const [orderLineCatalogQuery, setOrderLineCatalogQuery] = useState('')

  useEffect(() => {
    if (!open || !orderId) setOrderLineCatalogQuery('')
  }, [open, orderId])

  const previewOrder = orderId ? orders.find((o) => o.id === orderId) : undefined

  const previewMatchedClient = useMemo(() => {
    if (!previewOrder) return undefined
    return findClientForOrder(previewOrder, clients)
  }, [previewOrder, clients])

  const previewAddressProfile = useMemo(() => {
    if (!previewMatchedClient) return null
    return clientRowToProfileExtras(previewMatchedClient)
  }, [previewMatchedClient])

  const orderLineCatalogMatches = useMemo(() => {
    const q = orderLineCatalogQuery.trim()
    if (!q || !previewOrder) return []
    const inOrder = new Set(
      (previewOrder.items ?? []).map((l) => l.productId).filter((id): id is string => Boolean(id)),
    )
    return productsInventoryDraft.catalog
      .filter((item) => !inOrder.has(item.id))
      .filter((item) => matchesProductCatalogSearch(item, q))
      .slice(0, 12)
  }, [previewOrder, productsInventoryDraft.catalog, orderLineCatalogQuery])

  const updateClientProfile = useCallback(
    (clientId: string, patch: Partial<ProfileExtras>) => {
      onClientsChange((prev) => {
        const next = prev.map((c) => (c.id === clientId ? patchClientProfile(c, patch) : c))
        saveClientsDraft(next)
        onPersistClientsDraft?.(next)
        return next
      })
    },
    [onClientsChange, onPersistClientsDraft],
  )

  const updateRow = useCallback(
    (id: string, patch: Partial<AdminOrderRow>) => {
      onOrdersChange((prev) => {
        const next = prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
        onPersistOrdersDraft?.(next)
        return next
      })
    },
    [onOrdersChange, onPersistOrdersDraft],
  )

  const title = previewOrder?.orderNumber?.trim() ? `Заказ ${previewOrder.orderNumber}` : 'Заказ'

  return (
    <ProfileSettingsDialog open={open} onClose={onClose} title={title}>
      {previewOrder ? (
        <div className="space-y-4 pr-1">
          <OrderStageTimeline
            currentStageId={previewOrder.stageId}
            onSelectStage={(stageId) =>
              updateRow(previewOrder.id, {
                stageId,
                status: orderStageLabel(stageId),
              })
            }
          />
          <p className="text-xs text-gray-400">{persistHint}</p>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 sm:items-start sm:gap-6">
              <div className="min-w-0 space-y-4">
                <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Информация о заказе
                  </p>
                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-sm font-medium text-gray-300">Номер заказа</span>
                      <input
                        type="text"
                        value={previewOrder.orderNumber}
                        onChange={(e) => updateRow(previewOrder.id, { orderNumber: e.target.value })}
                        className={`${inputClass} mt-1`}
                      />
                    </label>
                    <label className="block min-w-0">
                      <span className="text-sm font-medium text-gray-300">Дата создания</span>
                      <input
                        type="date"
                        value={previewOrder.createdAt}
                        onChange={(e) => updateRow(previewOrder.id, { createdAt: e.target.value })}
                        className={`${inputClass} mt-1 [color-scheme:dark]`}
                      />
                    </label>
                    <div className="block">
                      <span className="text-sm font-medium text-gray-300">Статус оплаты</span>
                      <div className={`${inputClass} mt-1 cursor-default text-gray-200`}>
                        {paymentStatusLabel(previewOrder.paymentStatus)}
                      </div>
                    </div>
                    <label className="block">
                      <span className="text-sm font-medium text-gray-300">Способ оплаты</span>
                      <PaymentMethodSelect
                        value={previewOrder.paymentMethod}
                        onChange={(id) => updateRow(previewOrder.id, { paymentMethod: id })}
                        ariaLabel="Способ оплаты"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-gray-300">Сумма</span>
                      <input
                        type="text"
                        value={previewOrder.total}
                        onChange={(e) => updateRow(previewOrder.id, { total: e.target.value })}
                        className={`${inputClass} mt-1`}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div className="min-w-0">
                {previewMatchedClient ? (
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Информация о клиенте
                    </p>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block min-w-0">
                          <span className="text-sm font-medium text-gray-300">Имя</span>
                          <input
                            type="text"
                            value={previewMatchedClient.firstName}
                            onChange={(e) => {
                              const firstName = e.target.value
                              updateClientProfile(previewMatchedClient.id, { firstName })
                              updateRow(previewOrder.id, {
                                ...orderClientLinkPatch({
                                  ...previewMatchedClient,
                                  firstName,
                                }),
                              })
                            }}
                            className={`${inputClass} mt-1`}
                            autoComplete="given-name"
                          />
                        </label>
                        <label className="block min-w-0">
                          <span className="text-sm font-medium text-gray-300">Фамилия</span>
                          <input
                            type="text"
                            value={previewMatchedClient.lastName}
                            onChange={(e) => {
                              const lastName = e.target.value
                              updateClientProfile(previewMatchedClient.id, { lastName })
                              updateRow(previewOrder.id, {
                                ...orderClientLinkPatch({
                                  ...previewMatchedClient,
                                  lastName,
                                }),
                              })
                            }}
                            className={`${inputClass} mt-1`}
                            autoComplete="family-name"
                          />
                        </label>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block min-w-0">
                          <span className="text-sm font-medium text-gray-300">Телефон</span>
                          <input
                            type="text"
                            value={previewMatchedClient.phone}
                            onChange={(e) =>
                              updateClientProfile(previewMatchedClient.id, { phone: e.target.value })
                            }
                            className={`${inputClass} mt-1`}
                            autoComplete="tel"
                          />
                        </label>
                        <label className="block min-w-0">
                          <span className="text-sm font-medium text-gray-300">Электронная почта</span>
                          <input
                            type="email"
                            value={previewMatchedClient.email}
                            onChange={(e) =>
                              updateClientProfile(previewMatchedClient.id, { email: e.target.value })
                            }
                            className={`${inputClass} mt-1`}
                            autoComplete="email"
                          />
                        </label>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block min-w-0">
                          <span className="text-sm font-medium text-gray-300">День рождения</span>
                          <input
                            type="text"
                            value={clientRowToProfileExtras(previewMatchedClient).birthday}
                            onChange={(e) =>
                              updateClientProfile(previewMatchedClient.id, { birthday: e.target.value })
                            }
                            className={`${inputClass} mt-1`}
                            placeholder="ДД.ММ.ГГГГ"
                            autoComplete="bday"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            {previewMatchedClient && previewAddressProfile ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Адрес доставки
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="block min-w-0">
                    <span className="text-sm font-medium text-gray-300">Страна</span>
                    <CountryListbox
                      value={previewAddressProfile.country}
                      onChange={(country) => updateClientProfile(previewMatchedClient.id, { country })}
                      ariaLabel="Страна"
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className="text-sm font-medium text-gray-300">Регион / область</span>
                    <input
                      type="text"
                      value={previewAddressProfile.region}
                      onChange={(e) =>
                        updateClientProfile(previewMatchedClient.id, { region: e.target.value })
                      }
                      className={`${inputClass} mt-1`}
                      autoComplete="address-level1"
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className="text-sm font-medium text-gray-300">Город</span>
                    <input
                      type="text"
                      value={previewAddressProfile.city}
                      onChange={(e) =>
                        updateClientProfile(previewMatchedClient.id, { city: e.target.value })
                      }
                      className={`${inputClass} mt-1`}
                      autoComplete="address-level2"
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className="text-sm font-medium text-gray-300">Индекс</span>
                    <input
                      type="text"
                      value={previewAddressProfile.postalCode}
                      onChange={(e) =>
                        updateClientProfile(previewMatchedClient.id, { postalCode: e.target.value })
                      }
                      className={`${inputClass} mt-1`}
                      autoComplete="postal-code"
                    />
                  </label>
                  <label className="block min-w-0 sm:col-span-2 lg:col-span-2">
                    <span className="text-sm font-medium text-gray-300">Адрес (улица, дом)</span>
                    <input
                      type="text"
                      value={previewAddressProfile.streetAddress}
                      onChange={(e) =>
                        updateClientProfile(previewMatchedClient.id, { streetAddress: e.target.value })
                      }
                      className={`${inputClass} mt-1`}
                      autoComplete="street-address"
                    />
                  </label>
                </div>
              </div>
            ) : null}
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Доставка</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className="text-sm font-medium text-gray-300">Дата доставки</span>
                <input
                  type="date"
                  value={previewOrder.deliveryDate ?? ''}
                  onChange={(e) =>
                    updateRow(previewOrder.id, {
                      deliveryDate: e.target.value || undefined,
                    })
                  }
                  className={`${inputClass} mt-1 [color-scheme:dark]`}
                />
              </label>
              <label className="block min-w-0">
                <span className="text-sm font-medium text-gray-300">Дата отправки</span>
                <input
                  type="date"
                  value={previewOrder.shippingDate ?? ''}
                  onChange={(e) =>
                    updateRow(previewOrder.id, {
                      shippingDate: e.target.value || undefined,
                    })
                  }
                  className={`${inputClass} mt-1 [color-scheme:dark]`}
                />
              </label>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block min-w-0">
                <span className="text-sm font-medium text-gray-300">Номер отправления</span>
                <input
                  type="text"
                  value={previewOrder.trackingNumber ?? ''}
                  onChange={(e) =>
                    updateRow(previewOrder.id, {
                      trackingNumber: e.target.value || undefined,
                    })
                  }
                  className={`${inputClass} mt-1 min-w-0`}
                  placeholder="Трек-номер"
                  autoComplete="off"
                />
              </label>
              <label className="block min-w-0">
                <span className="text-sm font-medium text-gray-300">Ссылка для отслеживания</span>
                <input
                  type="text"
                  value={previewOrder.trackingUrl ?? ''}
                  onChange={(e) =>
                    updateRow(previewOrder.id, {
                      trackingUrl: e.target.value || undefined,
                    })
                  }
                  className={`${inputClass} mt-1 min-w-0`}
                  placeholder="https://…"
                  autoComplete="off"
                />
              </label>
            </div>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-gray-300">Комментарий</span>
            <textarea
              value={previewOrder.comment ?? ''}
              onChange={(e) => updateRow(previewOrder.id, { comment: e.target.value || undefined })}
              rows={4}
              className={`${inputClass} mt-1 min-h-[5rem] resize-y`}
            />
          </label>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Товары в заказе</p>
              <button
                type="button"
                onClick={() =>
                  updateRow(previewOrder.id, {
                    items: [...(previewOrder.items ?? []), { id: newOrderLineItemId(), name: '', quantity: 1 }],
                  })
                }
                className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs font-medium text-gray-200 transition hover:border-indigo-500/40 hover:bg-indigo-950/40 hover:text-white"
              >
                <PlusIcon className="size-3.5 shrink-0" aria-hidden />
                Добавить позицию
              </button>
            </div>
            <div className="mb-4 rounded-md border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-gray-400">Добавить из каталога</p>
              <p className="mt-1 text-xs text-gray-500">
                Поиск по SKU, названию, описанию — как в блоке «Рекомендуемые товары» в карточке товара.
              </p>
              {productsInventoryDraft.catalog.length > 0 ? (
                <>
                  <div className="relative mt-2">
                    <MagnifyingGlassIcon
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
                      aria-hidden
                    />
                    <input
                      type="search"
                      value={orderLineCatalogQuery}
                      onChange={(e) => setOrderLineCatalogQuery(e.target.value)}
                      placeholder="Поиск по SKU, названию, описанию…"
                      className={`${inputClass} pl-9`}
                      aria-label="Поиск товара в каталоге для заказа"
                    />
                  </div>
                  {orderLineCatalogQuery.trim().length > 0 ? (
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                      {orderLineCatalogMatches.map((item) => (
                        <li
                          key={`order-line-cat-${item.id}`}
                          className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="size-9 shrink-0 overflow-hidden rounded border border-white/10 bg-white/[0.04]">
                              {item.imageUrls[0] ? (
                                <img
                                  src={item.imageUrls[0]}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-[9px] text-gray-500">
                                  Нет фото
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm text-gray-200">{item.name || 'Без названия'}</p>
                              <p className="truncate text-[11px] text-gray-500">{item.sku}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              updateRow(previewOrder.id, {
                                items: [
                                  ...(previewOrder.items ?? []),
                                  {
                                    id: newOrderLineItemId(),
                                    productId: item.id,
                                    name: item.name.trim() || item.sku,
                                    sku: item.sku.trim() || undefined,
                                    size: item.size.trim() || undefined,
                                    color: item.color.trim() || undefined,
                                    quantity: 1,
                                    price: formatCatalogPriceForOrderLine(item.price),
                                  },
                                ],
                              })
                            }
                            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-gray-200 transition hover:border-indigo-400/50 hover:bg-indigo-950/40 hover:text-white"
                          >
                            <PlusIcon className="size-3.5" aria-hidden />
                            Добавить
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {orderLineCatalogQuery.trim().length > 0 && orderLineCatalogMatches.length === 0 ? (
                    <p className="mt-2 text-xs text-gray-500">
                      {productsInventoryDraft.catalog.some((item) =>
                        matchesProductCatalogSearch(item, orderLineCatalogQuery),
                      )
                        ? 'Подходящие товары уже в заказе или измените запрос.'
                        : 'Ничего не найдено. Измените поиск.'}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-2 text-xs text-gray-500">В каталоге пока нет товаров для подбора.</p>
              )}
            </div>
            {(previewOrder.items?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-500">Позиций пока нет.</p>
            ) : (
              <div className="space-y-3">
                <div className="hidden gap-2 text-[11px] font-medium uppercase tracking-wide text-gray-500 lg:grid lg:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_5rem_3.5rem_5rem_2.25rem] lg:items-center">
                  <span>Наименование</span>
                  <span>SKU</span>
                  <span>Размер</span>
                  <span>Цвет</span>
                  <span className="text-center">Кол-во</span>
                  <span>Цена</span>
                  <span className="sr-only">Удалить</span>
                </div>
                {(previewOrder.items ?? []).map((line) => (
                  <div
                    key={line.id}
                    className="grid grid-cols-1 gap-2 rounded-md border border-white/10 bg-white/[0.03] p-3 lg:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_5rem_3.5rem_5rem_2.25rem] lg:items-center lg:border-0 lg:bg-transparent lg:p-0"
                  >
                    <div className="min-w-0">
                      <span className="mb-1 block text-sm font-medium text-gray-300 lg:hidden">Наименование</span>
                      <input
                        type="text"
                        value={line.name}
                        onChange={(e) => {
                          const name = e.target.value
                          updateRow(previewOrder.id, {
                            items: (previewOrder.items ?? []).map((l) =>
                              l.id === line.id
                                ? {
                                    ...l,
                                    name,
                                    productId: undefined,
                                    sku: l.productId ? undefined : l.sku,
                                  }
                                : l,
                            ),
                          })
                        }}
                        className={inputClass}
                        placeholder="Название товара"
                        aria-label="Наименование товара"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="mb-1 block text-sm font-medium text-gray-300 lg:hidden">SKU</span>
                      <input
                        type="text"
                        value={line.sku ?? ''}
                        onChange={(e) => {
                          const sku = e.target.value.trim() || undefined
                          updateRow(previewOrder.id, {
                            items: (previewOrder.items ?? []).map((l) =>
                              l.id === line.id ? { ...l, sku, productId: undefined } : l,
                            ),
                          })
                        }}
                        className={`${inputClass} tabular-nums`}
                        placeholder="—"
                        aria-label="SKU товара"
                        autoComplete="off"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="mb-1 block text-sm font-medium text-gray-300 lg:hidden">Размер</span>
                      <input
                        type="text"
                        value={line.size ?? ''}
                        onChange={(e) => {
                          const size = e.target.value || undefined
                          updateRow(previewOrder.id, {
                            items: (previewOrder.items ?? []).map((l) =>
                              l.id === line.id
                                ? {
                                    ...l,
                                    size,
                                    productId: undefined,
                                    sku: l.productId ? undefined : l.sku,
                                  }
                                : l,
                            ),
                          })
                        }}
                        className={inputClass}
                        placeholder="—"
                        aria-label="Размер"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="mb-1 block text-sm font-medium text-gray-300 lg:hidden">Цвет</span>
                      <input
                        type="text"
                        value={line.color ?? ''}
                        onChange={(e) => {
                          const color = e.target.value || undefined
                          updateRow(previewOrder.id, {
                            items: (previewOrder.items ?? []).map((l) =>
                              l.id === line.id
                                ? {
                                    ...l,
                                    color,
                                    productId: undefined,
                                    sku: l.productId ? undefined : l.sku,
                                  }
                                : l,
                            ),
                          })
                        }}
                        className={inputClass}
                        placeholder="—"
                        aria-label="Цвет"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="mb-1 block text-sm font-medium text-gray-300 lg:hidden">Кол-во</span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={line.quantity}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10)
                          const quantity = Number.isFinite(n) && n >= 1 ? n : 1
                          updateRow(previewOrder.id, {
                            items: (previewOrder.items ?? []).map((l) =>
                              l.id === line.id ? { ...l, quantity } : l,
                            ),
                          })
                        }}
                        className={`${inputClass} tabular-nums`}
                        aria-label="Количество"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="mb-1 block text-sm font-medium text-gray-300 lg:hidden">Цена</span>
                      <input
                        type="text"
                        value={line.price ?? ''}
                        onChange={(e) => {
                          const price = e.target.value || undefined
                          updateRow(previewOrder.id, {
                            items: (previewOrder.items ?? []).map((l) =>
                              l.id === line.id ? { ...l, price } : l,
                            ),
                          })
                        }}
                        className={inputClass}
                        placeholder="0 ₽"
                        aria-label="Цена строки"
                      />
                    </div>
                    <div className="flex justify-end lg:justify-center">
                      <button
                        type="button"
                        onClick={() =>
                          updateRow(previewOrder.id, {
                            items: (previewOrder.items ?? []).filter((l) => l.id !== line.id),
                          })
                        }
                        className="inline-flex size-9 items-center justify-center rounded-md border border-white/10 text-gray-400 transition hover:border-rose-500/40 hover:bg-rose-950/30 hover:text-rose-200"
                        aria-label="Удалить позицию"
                      >
                        <TrashIcon className="size-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Готово
            </button>
          </div>
        </div>
      ) : null}
    </ProfileSettingsDialog>
  )
}
