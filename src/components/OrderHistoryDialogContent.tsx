import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Product } from '../data/catalogProducts'
import { useMyStorefrontOrders } from '../hooks/useMyStorefrontOrders'
import type { StorefrontOrder, StorefrontOrderLine } from '../types/storefrontOrder'
import { formatDateRuFromIso } from '../utils/formatDateRu'
import { tailwindSwatchClassToHex } from '../utils/orderStorefrontMapping'

function enrichOrderLines(order: StorefrontOrder, catalogProducts: Product[]): StorefrontOrder {
  const byId = Object.fromEntries(catalogProducts.map((p) => [p.id, p]))
  const lines: StorefrontOrderLine[] = order.lines.map((line) => {
    const m = /\/product\/([^/]+)/.exec(line.productHref)
    const productId = m?.[1]
    const product = productId ? byId[productId] : undefined
    if (!product) return line
    const swatch = product.colors.find((c) => c.name === line.color) ?? product.colors[0]
    return {
      ...line,
      imageSrc: swatch?.image ?? product.image,
      imageAlt: `${product.name}, цвет ${swatch?.name ?? line.color}`,
      colorSwatch: tailwindSwatchClassToHex(swatch?.className),
    }
  })
  return { ...order, lines }
}

function formatRub(amount: number) {
  return `${amount.toLocaleString('ru-RU')} ₽`
}

function formatQty(n: number) {
  return `${n} шт.`
}

function formatDiscountRub(amount: number) {
  if (amount <= 0) return '—'
  return `−${amount.toLocaleString('ru-RU')} ₽`
}

/** «Доставлено 23.04.2026» → префикс + дата (галочку показываем сразу после даты). */
function splitStatusPrefixAndTrailingDate(text: string): { prefix: string; date: string } | null {
  const m = /^(.+?)\s+(\d{2}\.\d{2}\.\d{4})$/.exec(text.trim())
  if (!m) return null
  return { prefix: m[1].trimEnd(), date: m[2] }
}

function DeliveredStatusPill({ statusText }: { statusText: string }) {
  const parts = splitStatusPrefixAndTrailingDate(statusText)
  return (
    <span className="inline-flex max-w-full flex-nowrap items-center gap-x-1.5 text-emerald-400 whitespace-nowrap">
      {parts ? (
        <>
          <span className="font-medium leading-snug">{parts.prefix}</span>
          <span className="inline-flex items-center gap-1 font-medium leading-none tabular-nums">
            <span>{parts.date}</span>
            <CheckCircleIcon className="size-[1.125rem] shrink-0 text-emerald-300" aria-hidden />
          </span>
        </>
      ) : (
        <>
          <span className="min-w-0 break-words font-medium leading-snug">{statusText}</span>
          <CheckCircleIcon className="size-[1.125rem] shrink-0 text-emerald-300" aria-hidden />
        </>
      )}
    </span>
  )
}

type OrderHistoryDialogContentProps = {
  /** Опционально: картинки товаров из каталога; без каталога — плейсхолдеры из API. */
  catalogProducts?: Product[]
}

export function OrderHistoryDialogContent({ catalogProducts = [] }: OrderHistoryDialogContentProps) {
  const { user, openAuthDialog, sessionJwt } = useAuth()
  const { orders: rawOrders, loading, authError, syncError, reload } = useMyStorefrontOrders(
    sessionJwt,
    user?.email,
  )

  const orders = useMemo(() => {
    const safe = rawOrders.map((o) => ({
      ...o,
      lines: Array.isArray(o.lines) ? o.lines : [],
    }))
    return safe.map((o) => enrichOrderLines(o, catalogProducts))
  }, [rawOrders, catalogProducts])

  if (!user) {
    return (
      <div className="max-w-lg">
        <p className="text-gray-400">
          Войдите, чтобы видеть историю заказов и статусы доставки — так же удобно, как в личном кабинете.
        </p>
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

  return (
    <div className="w-full">
      <div className="border-b border-white/10 pb-8">
        <p className="text-pretty text-sm leading-relaxed text-gray-400 sm:text-base sm:leading-relaxed">
          Здесь — ваши недавние заказы в одном окне: статус доставки, номера и суммы видно сразу и по датам
          оформления. Удобно следить за отправлениями и деталями — без лишних переходов по разделам и суеты.
        </p>
      </div>

      {loading ? (
        <p className="mt-10 text-sm text-gray-400">Загрузка заказов…</p>
      ) : authError ? (
        <div className="mt-10 max-w-lg space-y-4">
          <p className="text-sm text-amber-300/90">Сессия истекла или недействительна. Войдите снова.</p>
          <button
            type="button"
            onClick={() => openAuthDialog()}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Войти
          </button>
        </div>
      ) : syncError ? (
        <div className="mt-10 max-w-lg space-y-4">
          <p className="text-sm text-amber-300/90">
            Не удалось загрузить заказы с сервера.
            {import.meta.env.DEV
              ? ' Запустите API: npm run dev:stack (или npm run dev:api в отдельном терминале).'
              : ' Попробуйте обновить страницу чуть позже.'}
          </p>
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/5"
          >
            Повторить
          </button>
        </div>
      ) : orders.length === 0 ? (
        <p className="mt-10 text-sm text-gray-400">
          Пока нет оформленных заказов.
        </p>
      ) : (
      <div className="mt-10 space-y-16">
        {orders.map((order) => (
          <div key={order.id ?? order.orderNumber}>
            <h4 className="text-base font-medium text-white">
              Заказ от{' '}
              <time dateTime={order.placedIso}>{formatDateRuFromIso(order.placedIso)}</time>
            </h4>

            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
              {/* Узкая ширина: 70/30, слева реквизиты заказа, справа суммы */}
              <div className="grid grid-cols-[7fr_3fr] gap-4 text-sm sm:gap-8 lg:hidden">
                <div className="min-w-0 space-y-4">
                  <div className="min-w-0">
                    <div className="font-medium text-white">Номер заказа</div>
                    <div className="mt-2 w-full break-words text-gray-400 max-sm:break-all">{order.orderNumber}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-white">Дата оформления</div>
                    <div className="mt-2 w-full text-gray-400">
                      <time
                        dateTime={order.placedIso}
                        className="inline-block max-w-full whitespace-nowrap"
                      >
                        {formatDateRuFromIso(order.placedIso)}
                      </time>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-white">Статус заказа</div>
                    <div className="mt-2 min-w-0 overflow-x-auto">
                      {order.orderDelivered ? (
                        <DeliveredStatusPill statusText={order.orderStatusText} />
                      ) : (
                        <span className="text-gray-200">{order.orderStatusText}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="min-w-0 space-y-4">
                  <div className="min-w-0">
                    <div className="font-medium text-white">Сумма</div>
                    <div className="mt-2 w-full font-medium text-white tabular-nums">{formatRub(order.subtotalRub)}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-white">Скидка</div>
                    <div className="mt-2 w-full font-medium text-emerald-400/95 tabular-nums">
                      {formatDiscountRub(order.orderDiscountRub)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-white">Итого</div>
                    <div className="mt-2 w-full font-semibold text-white tabular-nums">{formatRub(order.totalRub)}</div>
                  </div>
                </div>
              </div>

              {/* Десктоп: 1-й ряд — номер, дата, статус; 2-й — сумма, скидка, итого */}
              <div className="hidden text-sm lg:grid lg:grid-cols-3 lg:gap-x-10 lg:gap-y-8">
                <div className="min-w-0">
                  <div className="font-medium text-white">Номер заказа</div>
                  <div className="mt-2 w-full break-words text-gray-400">{order.orderNumber}</div>
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-white">Дата оформления</div>
                  <div className="mt-2 w-full text-gray-400">
                    <time
                      dateTime={order.placedIso}
                      className="inline-block max-w-full whitespace-nowrap"
                    >
                      {formatDateRuFromIso(order.placedIso)}
                    </time>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-white">Статус заказа</div>
                  <div className="mt-2 min-w-0">
                    {order.orderDelivered ? (
                      <DeliveredStatusPill statusText={order.orderStatusText} />
                    ) : (
                      <span className="text-gray-200">{order.orderStatusText}</span>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-white">Сумма</div>
                  <div className="mt-2 w-full font-medium text-white tabular-nums">{formatRub(order.subtotalRub)}</div>
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-white">Скидка</div>
                  <div className="mt-2 w-full font-medium text-emerald-400/95 tabular-nums">
                    {formatDiscountRub(order.orderDiscountRub)}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-white">Итого</div>
                  <div className="mt-2 w-full font-semibold text-white tabular-nums">{formatRub(order.totalRub)}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-sm text-gray-400">
                <caption className="sr-only">Товары в заказе {order.orderNumber}</caption>
                <thead className="text-left text-xs text-gray-500">
                  <tr>
                    <th scope="col" className="py-3 pr-4 font-medium sm:pr-8">
                      Товар
                    </th>
                    <th scope="col" className="hidden py-3 pr-4 font-medium sm:table-cell sm:pr-8">
                      Цена
                    </th>
                    <th scope="col" className="hidden py-3 pr-4 font-medium md:table-cell sm:pr-8">
                      Скидка
                    </th>
                    <th scope="col" className="hidden py-3 pr-4 font-medium md:table-cell sm:pr-8">
                      Итоговая цена
                    </th>
                    <th scope="col" className="hidden py-3 pr-4 font-medium sm:table-cell sm:pr-8">
                      Количество
                    </th>
                    <th
                      scope="col"
                      className="w-[1%] whitespace-nowrap py-3 pl-2 pr-1 text-right font-medium sm:pl-2 sm:pr-2 sm:text-left"
                    >
                      Детали
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {order.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="align-middle py-6 pr-4 sm:pr-8">
                        <div className="flex flex-col gap-3 sm:hidden">
                          <div className="flex items-center gap-3">
                            <img
                              src={line.imageSrc}
                              alt={line.imageAlt}
                              className="size-20 shrink-0 rounded-md border border-white/10 object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <div>
                                <div className="text-xs font-medium text-gray-500">Название</div>
                                <div className="mt-0.5 font-medium text-white">{line.name}</div>
                              </div>
                              <dl className="mt-2 grid gap-y-0.5 text-xs text-gray-400">
                                <div className="flex flex-wrap gap-x-2">
                                  <dt className="text-gray-500">Цена</dt>
                                  <dd className="m-0 tabular-nums text-gray-300">{formatRub(line.priceRub)}</dd>
                                </div>
                                <div className="flex flex-wrap gap-x-2">
                                  <dt className="text-gray-500">Скидка</dt>
                                  <dd className="m-0 tabular-nums text-emerald-400/90">
                                    {formatDiscountRub(line.lineDiscountRub)}
                                  </dd>
                                </div>
                                <div className="flex flex-wrap gap-x-2">
                                  <dt className="text-gray-500">Итоговая цена</dt>
                                  <dd className="m-0 font-medium tabular-nums text-white">
                                    {formatRub(line.lineTotalRub)}
                                  </dd>
                                </div>
                                <div className="flex flex-wrap gap-x-2">
                                  <dt className="text-gray-500">Количество</dt>
                                  <dd className="m-0 tabular-nums text-gray-300">{formatQty(line.quantity)}</dd>
                                </div>
                              </dl>
                            </div>
                          </div>
                          <p className="flex min-w-0 flex-nowrap items-center gap-x-3 overflow-x-auto text-sm text-gray-400">
                            <span className="inline-flex shrink-0 items-baseline gap-1">
                              <span className="text-gray-500">Размер:</span>
                              <span className="tabular-nums text-gray-300">{line.size}</span>
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-2">
                              <span className="text-gray-500">Цвет:</span>
                              <span
                                className="size-4 shrink-0 rounded-full border border-white/20 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]"
                                style={{ backgroundColor: line.colorSwatch }}
                                title={line.color}
                                aria-hidden
                              />
                              <span className="text-gray-300">{line.color}</span>
                            </span>
                          </p>
                        </div>
                        <div className="hidden items-center gap-4 sm:flex">
                          <img
                            src={line.imageSrc}
                            alt={line.imageAlt}
                            className="size-20 shrink-0 rounded-md border border-white/10 object-cover"
                          />
                          <div>
                            <div className="font-medium text-white">{line.name}</div>
                            <p className="mt-1 flex flex-nowrap items-center gap-x-3 text-sm text-gray-400">
                              <span className="inline-flex shrink-0 items-baseline gap-1">
                                <span className="text-gray-500">Размер:</span>
                                <span className="tabular-nums text-gray-300">{line.size}</span>
                              </span>
                              <span className="inline-flex shrink-0 items-center gap-2">
                                <span className="text-gray-500">Цвет:</span>
                                <span
                                  className="size-4 shrink-0 rounded-full border border-white/20 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]"
                                  style={{ backgroundColor: line.colorSwatch }}
                                  title={line.color}
                                  aria-hidden
                                />
                                <span>{line.color}</span>
                              </span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden align-middle py-6 pr-8 sm:table-cell tabular-nums">
                        {formatRub(line.priceRub)}
                      </td>
                      <td className="hidden align-middle py-6 pr-8 md:table-cell tabular-nums text-emerald-400/90">
                        {formatDiscountRub(line.lineDiscountRub)}
                      </td>
                      <td className="hidden align-middle py-6 pr-8 md:table-cell font-medium tabular-nums text-white">
                        {formatRub(line.lineTotalRub)}
                      </td>
                      <td className="hidden align-middle py-6 pr-8 sm:table-cell tabular-nums">
                        {formatQty(line.quantity)}
                      </td>
                      <td className="w-[1%] whitespace-nowrap align-middle py-6 pl-2 pr-1 text-right sm:pl-2 sm:pr-2 sm:text-left">
                        <Link
                          to={line.productHref}
                          className="inline-block min-w-0 font-medium text-indigo-400 hover:text-indigo-300"
                        >
                          Товар
                          <span className="sr-only">
                            , {line.name}, цвет {line.color}, размер {line.size}
                          </span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}
