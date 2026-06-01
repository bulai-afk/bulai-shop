import { forwardRef, useId, useState } from 'react'

type FaqItem = {
  question: string
  answer: string
}

const FAQ: FaqItem[] = [
  {
    question: 'Как работает доставка?',
    answer:
      'Отправляем по России. После подтверждения заказа пришлём трек‑номер и ориентировочные сроки доставки.',
  },
  {
    question: 'Бесплатная доставка — какие условия?',
    answer:
      'Почтой России по России — бесплатно при заказе от 5 000 ₽. Если сумма меньше — стоимость доставки рассчитывается при оформлении.',
  },
  {
    question: 'Как сделать возврат или обмен?',
    answer:
      'Если вещь не подошла, оформим обмен или возврат по правилам магазина в течение 14 дней. Напишите в поддержку — подскажем шаги.',
  },
  {
    question: 'Какие способы оплаты доступны?',
    answer:
      'Оплата банковской картой на сайте при оформлении заказа. Другие способы оплаты добавим позже — сообщим отдельно.',
  },
  {
    question: 'Как подобрать размер?',
    answer:
      'Ориентируйтесь по таблице размеров и параметрам модели. Если сомневаетесь — напишите нам, поможем подобрать посадку.',
  },
]

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path d="M10 4.75a.75.75 0 0 1 .75.75v3.75h3.75a.75.75 0 0 1 0 1.5h-3.75v3.75a.75.75 0 0 1-1.5 0v-3.75H5.5a.75.75 0 0 1 0-1.5h3.75V5.5a.75.75 0 0 1 .75-.75Z" />
    </svg>
  )
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path d="M5.5 10a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 5.5 10Z" />
    </svg>
  )
}

/** FAQ: centered accordion (details/summary). */
export const FaqAccordion = forwardRef<HTMLElement>(function FaqAccordion(_, ref) {
  const uid = useId().replace(/:/g, '')
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <section
      ref={ref}
      className="scroll-mt-[6.5rem] bg-gray-900 pb-12 pt-3 sm:pb-16 sm:pt-5 lg:pb-20 lg:pt-6"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-base/7 font-semibold text-indigo-400">FAQ</p>
          <h2
            id="faq-heading"
            className="mt-2 text-center text-4xl font-semibold tracking-tight text-white sm:text-5xl"
          >
            Отвечаем на частые вопросы
          </h2>
          <p className="mt-4 text-lg/8 text-gray-300">
            Доставка, возврат, оплата и размеры — всё самое важное в одном месте.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl">
          <dl className="space-y-4">
            {FAQ.map((item, idx) => {
              const isOpen = openIdx === idx
              const panelId = `faq-${uid}-${idx}`
              return (
                <div
                  key={item.question}
                  className={`group rounded-2xl bg-gray-950/40 p-5 ring-1 ring-white/10 sm:p-6 ${isOpen ? 'bg-gray-950/55' : ''}`}
                >
                  <dt>
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-4 text-left"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenIdx((prev) => (prev === idx ? null : idx))}
                    >
                      <span className="text-base/7 font-semibold text-white">{item.question}</span>
                      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                        {isOpen ? (
                          <MinusIcon className="h-5 w-5 text-gray-200" />
                        ) : (
                          <PlusIcon className="h-5 w-5 text-gray-200" />
                        )}
                      </span>
                    </button>
                  </dt>
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                  >
                    <div className="overflow-hidden">
                      <dd
                        id={panelId}
                        className={`mt-3 text-sm/6 text-gray-300 transition-all duration-300 ease-out sm:text-base/7 ${isOpen ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'}`}
                      >
                        {item.answer}
                      </dd>
                    </div>
                  </div>
                </div>
              )
            })}
          </dl>
        </div>
      </div>
    </section>
  )
})

