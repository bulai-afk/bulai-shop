import { forwardRef, type ComponentType, type SVGProps } from 'react'
import {
  ArrowPathIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

const features: {
  name: string
  description: string
  icon: IconComponent
}[] = [
  {
    name: 'Доставка без суеты',
    description:
      'Отправляем по России удобными службами. Сроки и стоимость подскажем при оформлении — без лишних звонков. Помощь с размером — в контактах или при заказе.',
    icon: TruckIcon,
  },
  {
    name: 'Качество материалов',
    description:
      'Подбираем ткани и фурнитуру у проверенных поставщиков: износостойкость, аккуратные швы и комфорт на коже — чтобы вещь служила долго и выглядела достойно.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Обмен и возврат',
    description:
      'Если вещь не подошла, обсудим замену или возврат по правилам магазина — без давления и лишней бюрократии.',
    icon: ArrowPathIcon,
  },
  {
    name: 'Безопасная оплата',
    description:
      'Готовим оплату онлайн картой и другими способами. Данные защищены — о сроках запуска сообщим отдельно.',
    icon: LockClosedIcon,
  },
]

type FeaturesGridProps = {
  /** 0–1: на главной привязка к прокрутке hero; по умолчанию 1 (без анимации). */
  revealProgress?: number
}

/** Секция «почему мы»: заголовок по центру и сетка 2×2 (Tailwind Plus–стиль). */
export const FeaturesGrid = forwardRef<HTMLElement, FeaturesGridProps>(function FeaturesGrid(
  { revealProgress = 1 },
  ref,
) {
  const p = Math.min(1, Math.max(0, revealProgress))
  const lift = (1 - p) * 2.25
  const opacity = 0.35 + 0.65 * p

  return (
    <section
      ref={ref}
      className="scroll-mt-[6.5rem] bg-gray-900 py-14 sm:py-16 lg:py-20"
      style={{
        transform: `translate3d(0, ${lift}rem, 0)`,
        opacity,
        willChange: p < 1 ? 'transform, opacity' : 'auto',
      }}
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-base/7 font-semibold text-indigo-400">Почему мы</p>
          <h2
            id="features-heading"
            className="mt-2 text-4xl font-semibold tracking-tight text-pretty text-white sm:text-5xl lg:text-balance"
          >
            Покупать удобно — от выбора до получения
          </h2>
          <p className="mt-4 text-lg/8 text-gray-300">
            Актуальные модели и аккуратный сервис: держим в фокусе ваш комфорт, а не только витрину.
          </p>
        </div>
        <div className="mx-auto mt-10 w-full max-w-2xl sm:mt-12 lg:mt-14 lg:max-w-4xl">
          <dl className="mx-auto grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.name} className="relative pl-16">
                  <dt className="text-base/7 font-semibold text-white">
                    <div className="absolute top-0 left-0 flex size-10 items-center justify-center rounded-lg bg-indigo-500">
                      <Icon aria-hidden className="size-6 text-white" />
                    </div>
                    {feature.name}
                  </dt>
                  <dd className="mt-2 text-base/7 text-gray-400">{feature.description}</dd>
                </div>
              )
            })}
          </dl>
        </div>
      </div>
    </section>
  )
})
