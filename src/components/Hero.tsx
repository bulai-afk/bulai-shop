import { Link } from 'react-router-dom'

/** Hero-блок главной: градиенты, бейдж, заголовок и CTA. */
export function Hero() {
  return (
    <section
      className="flex min-h-[calc(100dvh-12rem)] flex-1 flex-col bg-gray-900 sm:min-h-[calc(100dvh-10rem)]"
      aria-labelledby="hero-title"
    >
      <div className="relative isolate flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-16 pt-12 sm:pb-20 sm:pt-16 lg:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        >
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          />
        </div>

        <div className="mx-auto w-full max-w-2xl py-8 sm:py-10">
          <div className="mb-8 hidden justify-center sm:flex">
            <div className="relative rounded-full px-3 py-1 text-sm/6 text-gray-400 ring-1 ring-white/10 transition hover:ring-white/20">
              Новая коллекция уже в каталоге.{' '}
              <Link
                to="/catalog"
                className="font-semibold text-indigo-400"
              >
                <span aria-hidden className="absolute inset-0" />
                Смотреть <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <div className="text-center">
            <h1
              id="hero-title"
              className="text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl md:text-6xl lg:text-7xl"
            >
              <span className="block">Одежда для тех,</span>
              <span className="block">кто идёт в ногу со временем</span>
            </h1>
            <p className="mt-8 text-lg font-medium text-pretty text-gray-400 sm:text-xl/8">
              Актуальные модели, аккуратный сервис и доставка без лишней суеты.
              Поможем подобрать размер и собрать образ. Скоро — личный кабинет и
              оплата онлайн.
            </p>
            <div className="mt-10 flex items-center justify-center">
              <Link
                to="/catalog"
                className="rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Посмотреть товары
              </Link>
            </div>
          </div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 top-1/2 -z-10 transform-gpu overflow-hidden blur-3xl"
        >
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          />
        </div>
      </div>
    </section>
  )
}
