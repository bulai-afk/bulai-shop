import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type OrderLine = {
  id: string
  name: string
  /** Цена за единицу до скидки. */
  priceRub: number
  quantity: number
  /** Скидка на позицию (на все количество). */
  lineDiscountRub: number
  /** Итоговая цена позиции после скидки. */
  lineTotalRub: number
  color: string
  /** Заливка кружка-образца (например #hex). */
  colorSwatch: string
  size: string
  imageSrc: string
  imageAlt: string
  productHref: string
}

type Order = {
  orderNumber: string
  placedIso: string
  placedLabel: string
  /** Сумма по каталогу до скидок. */
  subtotalRub: number
  /** Скидка по заказу. */
  orderDiscountRub: number
  /** Итого к оплате. */
  totalRub: number
  /** Например «Доставлено 24.03.2026» или «Доставка 23.03.2026». */
  orderStatusText: string
  /** Зелёная галочка только при доставленном заказе. */
  orderDelivered: boolean
  lines: OrderLine[]
}

const MOCK_ORDERS: Order[] = [
  {
    orderNumber: 'WU88191111',
    placedIso: '2021-01-22',
    placedLabel: '22 января 2021',
    subtotalRub: 26_600,
    orderDiscountRub: 2800,
    totalRub: 23_800,
    orderStatusText: 'Доставлено 23.04.2026',
    orderDelivered: true,
    lines: [
      {
        id: 'l1',
        name: 'Набор ручки и карандаша',
        priceRub: 7000,
        quantity: 1,
        lineDiscountRub: 700,
        lineTotalRub: 6300,
        color: 'Графит и хром',
        colorSwatch: '#52525b',
        size: 'XL',
        imageSrc:
          'https://tailwindcss.com/plus-assets/img/ecommerce-images/order-history-page-02-product-01.jpg',
        imageAlt: 'Деталь наконечника механического карандаша.',
        productHref: '/catalog',
      },
      {
        id: 'l2',
        name: 'Керамическая кружка',
        priceRub: 2800,
        quantity: 2,
        lineDiscountRub: 1400,
        lineTotalRub: 4200,
        color: 'Туманно-серый',
        colorSwatch: '#94a3b8',
        size: 'L',
        imageSrc:
          'https://tailwindcss.com/plus-assets/img/ecommerce-images/order-history-page-02-product-02.jpg',
        imageAlt: 'Керамическая кружка с ручкой.',
        productHref: '/catalog',
      },
      {
        id: 'l3',
        name: 'Набор ежедневников в коже',
        priceRub: 14_000,
        quantity: 1,
        lineDiscountRub: 700,
        lineTotalRub: 13_300,
        color: 'Коньяк',
        colorSwatch: '#78350f',
        size: 'XXL',
        imageSrc:
          'https://tailwindcss.com/plus-assets/img/ecommerce-images/order-history-page-02-product-03.jpg',
        imageAlt: 'Ежедневник в кожаной обложке.',
        productHref: '/catalog',
      },
    ],
  },
  {
    orderNumber: 'WU88191009',
    placedIso: '2021-01-05',
    placedLabel: '5 января 2021',
    subtotalRub: 18_500,
    orderDiscountRub: 7000,
    totalRub: 11_500,
    orderStatusText: 'Доставка 23.03.2026',
    orderDelivered: false,
    lines: [
      {
        id: 'l4',
        name: 'Сумка-клатч',
        priceRub: 8000,
        quantity: 1,
        lineDiscountRub: 500,
        lineTotalRub: 7500,
        color: 'Натуральный лён',
        colorSwatch: '#c4b5a0',
        size: 'L',
        imageSrc:
          'https://tailwindcss.com/plus-assets/img/ecommerce-images/order-history-page-02-product-04.jpg',
        imageAlt: 'Текстильный клатч на молнии.',
        productHref: '/catalog',
      },
      {
        id: 'l5',
        name: 'Термокружка Nomad',
        priceRub: 3500,
        quantity: 3,
        lineDiscountRub: 6500,
        lineTotalRub: 4000,
        color: 'Чёрный матовый',
        colorSwatch: '#262626',
        size: 'XL',
        imageSrc:
          'https://tailwindcss.com/plus-assets/img/ecommerce-images/order-history-page-02-product-05.jpg',
        imageAlt: 'Чёрная термокружка.',
        productHref: '/catalog',
      },
    ],
  },
]

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

export function OrderHistoryDialogContent() {
  const { user, openAuthDialog } = useAuth()

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

      <div className="mt-10 space-y-16">
        {MOCK_ORDERS.map((order) => (
          <div key={order.orderNumber}>
            <h4 className="text-base font-medium text-white">
              Заказ от <time dateTime={order.placedIso}>{order.placedLabel}</time>
            </h4>

            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-[minmax(11rem,2.2fr)_minmax(9rem,1.9fr)_minmax(12.5rem,2.7fr)_minmax(5.25rem,0.68fr)_minmax(5rem,0.62fr)_minmax(5.5rem,0.72fr)]">
                <div className="min-w-0">
                  <div className="font-medium text-white">Дата оформления</div>
                  <div className="mt-2 w-full text-gray-400">
                    <time
                      dateTime={order.placedIso}
                      className="inline-block max-w-full lg:whitespace-nowrap"
                    >
                      {order.placedLabel}
                    </time>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-white">Номер заказа</div>
                  <div className="mt-2 w-full break-words text-gray-400 max-sm:break-all">{order.orderNumber}</div>
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-white">Статус заказа</div>
                  <div className="mt-2 min-w-0">
                    {order.orderDelivered ? (
                      <div className="inline-flex max-w-full flex-nowrap items-start gap-x-1">
                        <span className="min-w-0 break-words font-medium leading-snug text-emerald-400">
                          {order.orderStatusText}
                        </span>
                        <CheckCircleIcon className="size-5 shrink-0 text-emerald-400" aria-hidden />
                      </div>
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
                    <th scope="col" className="py-3 pl-0 pr-0 text-right font-medium sm:text-left">
                      Подробнее
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {order.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="py-6 pr-4 sm:pr-8">
                        <div className="flex items-center gap-4">
                          <img
                            src={line.imageSrc}
                            alt={line.imageAlt}
                            className="size-16 shrink-0 rounded-md border border-white/10 object-cover sm:size-20"
                          />
                          <div>
                            <div className="font-medium text-white">{line.name}</div>
                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400">
                              <span className="inline-flex items-center gap-2">
                                <span className="text-gray-500">Цвет:</span>
                                <span
                                  className="size-4 shrink-0 rounded-full border border-white/20 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]"
                                  style={{ backgroundColor: line.colorSwatch }}
                                  title={line.color}
                                  aria-hidden
                                />
                                <span>{line.color}</span>
                              </span>
                              <span className="text-white/25" aria-hidden>
                                ·
                              </span>
                              <span>
                                <span className="text-gray-500">Размер:</span>{' '}
                                <span className="tabular-nums text-gray-300">{line.size}</span>
                              </span>
                            </p>
                            <div className="mt-2 space-y-0.5 text-xs sm:hidden">
                              <div>
                                <span className="text-gray-500">Цена:</span>{' '}
                                <span className="tabular-nums text-gray-300">{formatRub(line.priceRub)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Скидка:</span>{' '}
                                <span className="tabular-nums text-emerald-400/90">
                                  {formatDiscountRub(line.lineDiscountRub)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Итоговая цена:</span>{' '}
                                <span className="tabular-nums font-medium text-white">
                                  {formatRub(line.lineTotalRub)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Количество:</span>{' '}
                                <span className="tabular-nums text-gray-300">{formatQty(line.quantity)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden py-6 pr-8 sm:table-cell tabular-nums">{formatRub(line.priceRub)}</td>
                      <td className="hidden py-6 pr-8 md:table-cell tabular-nums text-emerald-400/90">
                        {formatDiscountRub(line.lineDiscountRub)}
                      </td>
                      <td className="hidden py-6 pr-8 md:table-cell font-medium tabular-nums text-white">
                        {formatRub(line.lineTotalRub)}
                      </td>
                      <td className="hidden py-6 pr-8 sm:table-cell tabular-nums">
                        {formatQty(line.quantity)}
                      </td>
                      <td className="py-6 text-right sm:text-left">
                        <Link
                          to={line.productHref}
                          className="font-medium text-indigo-400 hover:text-indigo-300"
                        >
                          <span className="hidden sm:inline">К товару</span>
                          <span className="sm:hidden">Товар</span>
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
    </div>
  )
}
