import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/20/solid'
import { MinusIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BulaiLogo } from '../components/BulaiLogo'
import { ContactPhoneField } from '../components/ContactPhoneField'
import { useAuth } from '../context/AuthContext'
import { formatCartAmount, useCart, type CartLine } from '../context/CartContext'
import { MoneyWithGlyph } from '../components/MoneyWithGlyph'
import { checkoutEmailFieldError, contactEmailError } from '../lib/contactEmail'
import { formatPhoneForSummaryLine, isCompleteStoredPhoneDigits } from '../lib/contactPhoneInputDisplay'
import { submitCheckoutOrder } from '../lib/checkoutSubmit'
import { resolveStorefrontBuyerEmail } from '../utils/sessionEmail'

function lineSaleTotalRub(line: CartLine): number {
  const unit = parseInt(line.priceDisplay.replace(/\D/g, ''), 10) || 0
  return unit * line.quantity
}

const inputClass =
  'mt-1 block w-full rounded-md border-0 bg-white/5 px-3 py-2.5 text-sm text-gray-100 ring-1 ring-inset ring-white/10 transition placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500'

const inputInvalidRingClass = ' ring-red-500/50 focus:ring-red-500/50'

type CheckoutStep = 1 | 2 | 3

type DeliveryMethodId = 'cdek' | 'europost' | 'yandex_courier'

const DELIVERY_LOGO: Record<DeliveryMethodId, string> = {
  cdek: '/delivery/cdek.svg',
  europost: '/delivery/europost-2.svg',
  yandex_courier: '/delivery/yandex-delivery-2.svg',
}

const DELIVERY_OPTIONS: { id: DeliveryMethodId; title: string; hint?: string }[] = [
  { id: 'cdek', title: 'СДЭК', hint: 'Почтой СДЕК' },
  { id: 'europost', title: 'Европочта', hint: 'Почтой ЕВРОПОЧТА' },
  { id: 'yandex_courier', title: 'Яндекс Доставка', hint: 'Курьером' },
]

function deliveryMethodLabel(id: DeliveryMethodId): string {
  const o = DELIVERY_OPTIONS.find((x) => x.id === id)
  if (!o) return ''
  return o.hint ? `${o.title} — ${o.hint}` : o.title
}

function StepAccordionHeader({
  step,
  title,
  summary,
  unlocked,
  done,
  openStep,
  onGoStep,
}: {
  step: CheckoutStep
  title: string
  summary?: string
  unlocked: boolean
  done: boolean
  openStep: CheckoutStep
  onGoStep: (s: CheckoutStep) => void
}) {
  const isOpen = openStep === step
  return (
    <button
      type="button"
      disabled={!unlocked}
      onClick={() => onGoStep(step)}
      className={`flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-medium transition ${
        unlocked ? 'text-white hover:text-indigo-300' : 'cursor-not-allowed text-gray-600'
      }`}
      aria-expanded={isOpen}
    >
      <span className="min-w-0 flex-1">
        <span className="block">{title}</span>
        {done && summary && !isOpen ? (
          <span className="mt-1 block text-xs font-normal text-gray-500">{summary}</span>
        ) : null}
      </span>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center text-gray-400">
        {!unlocked ? null : isOpen ? (
          <MinusIcon className="h-5 w-5" aria-hidden />
        ) : (
          <PlusIcon className="h-5 w-5" aria-hidden />
        )}
      </span>
    </button>
  )
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const { isAuthenticated, openAuthDialog, user, sessionJwt } = useAuth()
  const {
    lines,
    removeLine,
    applyPromo,
    clearPromo,
    subtotalFormatted,
    grandTotalFormatted,
    listPriceTotalFormatted,
    totalSavingsFormatted,
    promoDiscountFormatted,
    appliedPromoCode,
    appliedPromoPercent,
    clearCart,
  } = useCart()

  const promoInputId = useId()
  const [thankYouOpen, setThankYouOpen] = useState(false)
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null)
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [promoCode, setPromoCode] = useState('')
  const [promoHint, setPromoHint] = useState<'error' | null>(null)

  const [openStep, setOpenStep] = useState<CheckoutStep>(1)
  const [step1Done, setStep1Done] = useState(false)
  const [step2Done, setStep2Done] = useState(false)

  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneTel, setPhoneTel] = useState('')
  const [terms, setTerms] = useState(false)
  const [step1SubmitAttempted, setStep1SubmitAttempted] = useState(false)

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethodId | null>(null)
  const [step2SubmitAttempted, setStep2SubmitAttempted] = useState(false)

  const [paymentMethod, setPaymentMethod] = useState<'apple_pay' | 'card' | 'cash' | null>(null)

  useEffect(() => {
    setPromoHint(null)
    if (appliedPromoCode) setPromoCode(appliedPromoCode)
    else setPromoCode('')
  }, [appliedPromoCode])

  useEffect(() => {
    if (user?.email) setEmail(user.email)
  }, [user?.email])

  const emailOk = useMemo(
    () => email.trim().length > 0 && contactEmailError(email) === null,
    [email],
  )
  const emailFieldError = useMemo(
    () => checkoutEmailFieldError(email, step1SubmitAttempted),
    [email, step1SubmitAttempted],
  )
  const lastNameFieldError = useMemo(
    () => (step1SubmitAttempted && !lastName.trim() ? 'Введите фамилию.' : null),
    [step1SubmitAttempted, lastName],
  )
  const firstNameFieldError = useMemo(
    () => (step1SubmitAttempted && !firstName.trim() ? 'Введите имя.' : null),
    [step1SubmitAttempted, firstName],
  )
  const termsFieldError = useMemo(
    () => (step1SubmitAttempted && !terms ? 'Подтвердите согласие с условиями.' : null),
    [step1SubmitAttempted, terms],
  )
  const phoneOk = useMemo(() => isCompleteStoredPhoneDigits(phoneTel), [phoneTel])
  const step1Valid =
    lastName.trim().length > 0 &&
    firstName.trim().length > 0 &&
    emailOk &&
    phoneOk &&
    terms

  const step2Valid = deliveryMethod !== null
  const step2FieldError = useMemo(
    () => (step2SubmitAttempted && !deliveryMethod ? 'Выберите способ доставки.' : null),
    [step2SubmitAttempted, deliveryMethod],
  )

  const goStep = (s: CheckoutStep) => {
    if (s === 1) setOpenStep(1)
    if (s === 2 && step1Done) setOpenStep(2)
    if (s === 3 && step2Done) setOpenStep(3)
  }

  const continueStep1 = (e: FormEvent) => {
    e.preventDefault()
    setStep1SubmitAttempted(true)
    if (!step1Valid) return
    setStep1Done(true)
    setOpenStep(2)
  }

  const continueStep2 = (e: FormEvent) => {
    e.preventDefault()
    setStep2SubmitAttempted(true)
    if (!step2Valid) return
    setStep2Done(true)
    setOpenStep(3)
  }

  const handlePay = async () => {
    if (!paymentMethod || checkoutSubmitting) return
    if (!isAuthenticated || !user) {
      openAuthDialog()
      return
    }
    if (!step1Valid || !step2Valid) return
    setCheckoutError(null)
    setCheckoutSubmitting(true)
    try {
      const buyerEmail = resolveStorefrontBuyerEmail(sessionJwt, user.email) ?? user.email
      const result = await submitCheckoutOrder({
        sessionJwt,
        userEmail: buyerEmail,
        firstName,
        lastName,
        phone: formatPhoneForSummaryLine(phoneTel) || phoneTel,
        termsAccepted: terms,
        deliveryMethodLabel: deliveryMethod ? deliveryMethodLabel(deliveryMethod) : '',
        paymentMethod,
        lines,
        appliedPromoCode,
        appliedPromoPercent,
      })
      setCreatedOrderNumber(result.orderNumber)
      setThankYouOpen(true)
    } catch {
      setCheckoutError('Не удалось оформить заказ. Проверьте подключение и попробуйте снова.')
    } finally {
      setCheckoutSubmitting(false)
    }
  }

  const finishThankYou = () => {
    clearCart()
    setThankYouOpen(false)
    setCreatedOrderNumber(null)
    navigate('/catalog', { replace: true })
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg pt-6 text-center sm:pt-10">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-white">
          Оформление заказа
        </h1>
        <p className="mt-3 text-gray-400">В корзине пока ничего нет.</p>
        <Link
          to="/catalog"
          className="mt-6 inline-flex rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          Перейти в каталог
        </Link>
      </div>
    )
  }

  const contactSummary = `${lastName.trim()} ${firstName.trim()}, ${email.trim()}, ${formatPhoneForSummaryLine(phoneTel)}`
  const deliverySummary = deliveryMethod ? deliveryMethodLabel(deliveryMethod) : undefined

  return (
    <div className="mx-auto max-w-6xl pt-6 sm:pt-10">
      <h1 className="text-center text-2xl font-semibold tracking-tight text-white sm:text-left sm:text-3xl">
        Оформление заказа
      </h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16">
        <section aria-labelledby="order-summary-heading" className="min-w-0">
          <h2 id="order-summary-heading" className="text-lg font-semibold text-white">
            Ваш заказ
          </h2>

          <ul role="list" className="mt-6 divide-y divide-white/10">
            {lines.map((line) => (
              <li key={line.lineId} className="flex gap-4 py-6 first:pt-0">
                <img
                  src={line.imageSrc}
                  alt={line.imageAlt}
                  className="size-20 shrink-0 rounded-md border border-white/10 object-cover sm:size-24"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <h3 className="text-sm font-medium text-white">
                          <Link to={line.href} className="hover:text-indigo-300">
                            {line.name}
                          </Link>
                        </h3>
                        <p className="shrink-0 text-sm font-medium text-gray-200">
                          <MoneyWithGlyph amount={formatCartAmount(lineSaleTotalRub(line))} />
                        </p>
                      </div>
                      {line.colorLabel ? (
                        <p className="flex items-center gap-1.5 text-xs text-gray-400 sm:text-sm">
                          {line.colorSwatchClassName ? (
                            <span
                              className={`size-3.5 shrink-0 rounded-full ring-1 ring-inset ring-white/25 ${line.colorSwatchClassName}`}
                              aria-hidden
                            />
                          ) : null}
                          {line.colorLabel}
                        </p>
                      ) : null}
                      {line.sizeLabel ? (
                        <p className="text-xs text-gray-400 sm:text-sm">Размер: {line.sizeLabel}</p>
                      ) : null}
                      {line.quantity > 1 ? (
                        <p className="text-xs text-gray-500">Количество: {line.quantity}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                      <Link
                        to={line.href}
                        className="text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
                      >
                        Изменить
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeLine(line.lineId)}
                        className="text-sm font-medium text-gray-400 transition hover:text-white"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="mb-5">
              {appliedPromoCode ? (
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 text-sm text-emerald-400/95">
                    Промокод {appliedPromoCode} применён — скидка {appliedPromoPercent}%
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      clearPromo()
                      setPromoCode('')
                      setPromoHint(null)
                    }}
                    className="relative -m-1 shrink-0 rounded-md p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
                    aria-label="Снять промокод"
                  >
                    <XMarkIcon aria-hidden className="size-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-stretch gap-2">
                    <input
                      id={promoInputId}
                      type="text"
                      aria-label="Промокод"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value)
                        setPromoHint(null)
                      }}
                      placeholder="Промокод"
                      autoComplete="off"
                      className={`min-w-0 flex-1 rounded-md bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 ring-1 ring-inset transition focus:outline-none focus:ring-2 ${
                        promoHint === 'error'
                          ? 'ring-rose-500/60 focus:ring-rose-500'
                          : 'ring-white/10 focus:ring-indigo-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const r = applyPromo(promoCode)
                        if (r === 'invalid') setPromoHint('error')
                        else setPromoHint(null)
                      }}
                      className="shrink-0 rounded-md border border-white/10 px-3 py-2 text-sm font-medium text-gray-200 transition hover:bg-white/10"
                    >
                      Применить
                    </button>
                  </div>
                  {promoHint === 'error' ? (
                    <p className="mt-1.5 text-xs text-rose-400">Промокод не найден</p>
                  ) : null}
                </>
              )}
            </div>

            {((listPriceTotalFormatted && totalSavingsFormatted) ||
              (promoDiscountFormatted && appliedPromoCode)) ? (
              <div className="mb-3 space-y-2 border-b border-white/10 pb-4 text-sm">
                {listPriceTotalFormatted && totalSavingsFormatted ? (
                  <>
                    <div className="flex justify-between text-gray-400">
                      <p>Без скидок</p>
                      <p className="line-through decoration-gray-500">
                        <MoneyWithGlyph amount={listPriceTotalFormatted} />
                      </p>
                    </div>
                    <div className="flex justify-between text-emerald-400/95">
                      <p>Скидка на товары</p>
                      <p>
                        <MoneyWithGlyph amount={totalSavingsFormatted} prefix="−" />
                      </p>
                    </div>
                  </>
                ) : null}
                {promoDiscountFormatted && appliedPromoCode ? (
                  <div className="flex justify-between text-emerald-400/95">
                    <p>
                      Промокод {appliedPromoCode} (−{appliedPromoPercent}%)
                    </p>
                    <p>
                      <MoneyWithGlyph amount={promoDiscountFormatted} prefix="−" />
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mb-3 flex justify-between gap-4 border-b border-white/10 pb-4 text-sm">
                <p className="text-gray-400">Товары</p>
                <p className="font-medium text-gray-200">
                  <MoneyWithGlyph amount={subtotalFormatted} />
                </p>
              </div>
            )}

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-400">Доставка</dt>
                <dd className="tabular-nums text-gray-300">Уточним при подтверждении</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-white/10 pt-3 text-base font-semibold text-white">
                <dt>Итого</dt>
                <dd>
                  <MoneyWithGlyph amount={grandTotalFormatted} />
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="min-w-0 lg:pt-0">
          {!isAuthenticated ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center ring-1 ring-white/5">
              <h2 className="text-center text-lg font-semibold text-white">Оплата и контакты</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">
                Чтобы перейти к оформлению, войдите или зарегистрируйтесь.
              </p>
              <button
                type="button"
                onClick={() => openAuthDialog()}
                className="mt-8 w-full rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 sm:w-auto sm:min-w-[220px]"
              >
                Войти или зарегистрироваться
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] ring-1 ring-white/5">
              <div className="divide-y divide-white/10 px-4 sm:px-6">
                <div>
                  <StepAccordionHeader
                    step={1}
                    title="Подтвердите контактные данные"
                    summary={contactSummary}
                    unlocked
                    done={step1Done}
                    openStep={openStep}
                    onGoStep={goStep}
                  />
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${openStep === 1 ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                  >
                    <div className="overflow-hidden">
                      <form onSubmit={continueStep1} className="space-y-4 pb-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="checkout-lastname" className="block text-sm font-medium text-gray-300">
                              Фамилия
                            </label>
                            <input
                              id="checkout-lastname"
                              name="family-name"
                              autoComplete="family-name"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              aria-invalid={lastNameFieldError ? true : undefined}
                              aria-describedby={lastNameFieldError ? 'checkout-lastname-error' : undefined}
                              className={`${inputClass}${lastNameFieldError ? inputInvalidRingClass : ''}`}
                            />
                            {lastNameFieldError ? (
                              <p id="checkout-lastname-error" className="mt-1 text-xs text-red-400" role="alert">
                                {lastNameFieldError}
                              </p>
                            ) : null}
                          </div>
                          <div>
                            <label htmlFor="checkout-firstname" className="block text-sm font-medium text-gray-300">
                              Имя
                            </label>
                            <input
                              id="checkout-firstname"
                              name="given-name"
                              autoComplete="given-name"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              aria-invalid={firstNameFieldError ? true : undefined}
                              aria-describedby={firstNameFieldError ? 'checkout-firstname-error' : undefined}
                              className={`${inputClass}${firstNameFieldError ? inputInvalidRingClass : ''}`}
                            />
                            {firstNameFieldError ? (
                              <p id="checkout-firstname-error" className="mt-1 text-xs text-red-400" role="alert">
                                {firstNameFieldError}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="checkout-email" className="block text-sm font-medium text-gray-300">
                              Email
                            </label>
                            <input
                              id="checkout-email"
                              type="email"
                              name="email"
                              autoComplete="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              aria-invalid={emailFieldError ? true : undefined}
                              aria-describedby={emailFieldError ? 'checkout-email-error' : undefined}
                              className={`${inputClass}${emailFieldError ? inputInvalidRingClass : ''}`}
                              placeholder="Введите почту"
                            />
                            {emailFieldError ? (
                              <p id="checkout-email-error" className="mt-1 text-xs text-red-400" role="alert">
                                {emailFieldError}
                              </p>
                            ) : null}
                          </div>
                          <div>
                            <label htmlFor="checkout-phone" className="block text-sm font-medium text-gray-300">
                              Телефон
                            </label>
                            <ContactPhoneField
                              id="checkout-phone"
                              name="phone"
                              variant="storefront"
                              valueTel={phoneTel}
                              onDigitsChange={setPhoneTel}
                              checkoutSubmitAttempted={step1SubmitAttempted}
                            />
                          </div>
                        </div>
                        <div>
                          <div
                            className={`rounded-lg p-3 ring-1 ring-inset transition ${
                              termsFieldError
                                ? 'bg-red-500/[0.07] ring-red-500/50'
                                : 'ring-transparent bg-transparent'
                            }`}
                          >
                            <label htmlFor="checkout-terms" className="flex cursor-pointer gap-3">
                              <span className="relative mt-0.5 inline-flex h-5 w-5 shrink-0">
                                <input
                                  id="checkout-terms"
                                  type="checkbox"
                                  checked={terms}
                                  onChange={(e) => setTerms(e.target.checked)}
                                  aria-invalid={termsFieldError ? true : undefined}
                                  aria-describedby={termsFieldError ? 'checkout-terms-error' : undefined}
                                  className="peer sr-only"
                                />
                                <span
                                  aria-hidden
                                  className={`pointer-events-none absolute inset-0 rounded-md border transition ${
                                    termsFieldError
                                      ? 'border-red-500/70 bg-white/[0.04]'
                                      : 'border-white/25 bg-white/[0.06]'
                                  } peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#0d1320] peer-checked:border-indigo-500 peer-checked:bg-indigo-600 peer-checked:shadow-[0_0_0_1px_rgba(99,102,241,0.35)]`}
                                />
                                <CheckIcon
                                  aria-hidden
                                  className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition duration-150 peer-checked:opacity-100"
                                />
                              </span>
                              <span className="min-w-0 text-sm leading-snug text-gray-300">
                                Я ознакомился с условиями оферты и согласен на обработку персональных данных.
                              </span>
                            </label>
                          </div>
                          {termsFieldError ? (
                            <p id="checkout-terms-error" className="mt-2 text-xs text-red-400" role="alert">
                              {termsFieldError}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="submit"
                          className="w-full rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                        >
                          Продолжить
                        </button>
                      </form>
                    </div>
                  </div>
                </div>

                <div>
                  <StepAccordionHeader
                    step={2}
                    title="Выберите способ доставки"
                    summary={deliverySummary}
                    unlocked={step1Done}
                    done={step2Done}
                    openStep={openStep}
                    onGoStep={goStep}
                  />
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${openStep === 2 ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                  >
                    <div className="overflow-hidden">
                      <form onSubmit={continueStep2} className="space-y-4 pb-6">
                        <fieldset>
                          <legend className="sr-only">Способ доставки</legend>
                          <div
                            className={`grid grid-cols-1 gap-3 sm:grid-cols-3 ${
                              step2FieldError ? 'rounded-lg p-1 ring-2 ring-red-500/50 ring-inset' : ''
                            }`}
                            role="radiogroup"
                            aria-invalid={step2FieldError ? true : undefined}
                            aria-describedby={step2FieldError ? 'checkout-delivery-error' : undefined}
                          >
                            {DELIVERY_OPTIONS.map((opt) => {
                              const selected = deliveryMethod === opt.id
                              return (
                                <label
                                  key={opt.id}
                                  className={`flex cursor-pointer flex-col rounded-lg px-4 py-4 text-left ring-2 ring-inset transition ${
                                    selected
                                      ? 'bg-indigo-600/25 text-white ring-indigo-500'
                                      : 'bg-white/5 text-gray-200 ring-white/15 hover:bg-white/10'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="checkout-delivery"
                                    value={opt.id}
                                    checked={selected}
                                    onChange={() => setDeliveryMethod(opt.id)}
                                    className="sr-only"
                                  />
                                  <img
                                    src={DELIVERY_LOGO[opt.id]}
                                    alt={opt.hint ? `${opt.title}, ${opt.hint}` : opt.title}
                                    width={240}
                                    height={30}
                                    decoding="async"
                                    className="mb-2 h-8 w-full max-w-full object-contain object-left sm:h-9"
                                  />
                                  {opt.hint ? (
                                    <span className="text-xs font-normal text-gray-400">{opt.hint}</span>
                                  ) : null}
                                </label>
                              )
                            })}
                          </div>
                        </fieldset>
                        {step2FieldError ? (
                          <p id="checkout-delivery-error" className="text-xs text-red-400" role="alert">
                            {step2FieldError}
                          </p>
                        ) : null}
                        <button
                          type="submit"
                          className="w-full rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                        >
                          Продолжить
                        </button>
                      </form>
                    </div>
                  </div>
                </div>

                <div>
                  <StepAccordionHeader
                    step={3}
                    title="Выберите способ оплаты"
                    summary={
                      paymentMethod === 'apple_pay'
                        ? 'Apple Pay'
                        : paymentMethod === 'card'
                          ? 'Банковская карта'
                          : paymentMethod === 'cash'
                            ? 'Наличными при получении'
                            : undefined
                    }
                    unlocked={step2Done}
                    done={!!paymentMethod}
                    openStep={openStep}
                    onGoStep={goStep}
                  />
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${openStep === 3 ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                  >
                    <div className="overflow-hidden px-0.5">
                      <div className="space-y-4 pb-6 pt-0.5">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('apple_pay')}
                            className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-sm font-semibold ring-2 ring-inset transition ${
                              paymentMethod === 'apple_pay'
                                ? 'bg-black text-white ring-indigo-500'
                                : 'bg-black/80 text-white ring-white/15 hover:bg-zinc-900'
                            }`}
                          >
                            <span>Apple Pay</span>
                            <svg viewBox="0 0 50 20" fill="currentColor" className="h-5 w-auto" aria-hidden>
                              <path d="M9.536 2.579c-.571.675-1.485 1.208-2.4 1.132-.113-.914.334-1.884.858-2.484C8.565.533 9.564.038 10.374 0c.095.951-.276 1.884-.838 2.579zm.829 1.313c-1.324-.077-2.457.751-3.085.751-.638 0-1.6-.713-2.647-.694-1.362.019-2.628.79-3.323 2.017-1.429 2.455-.372 6.09 1.009 8.087.676.99 1.485 2.075 2.552 2.036 1.009-.038 1.409-.656 2.628-.656 1.228 0 1.58.656 2.647.637 1.104-.019 1.8-.99 2.475-1.979.771-1.122 1.086-2.217 1.105-2.274-.02-.019-2.133-.828-2.152-3.263-.02-2.036 1.666-3.007 1.742-3.064-.952-1.408-2.437-1.56-2.951-1.598zm7.645-2.76v14.834h2.305v-5.072h3.19c2.913 0 4.96-1.998 4.96-4.89 0-2.893-2.01-4.872-4.885-4.872h-5.57zm2.305 1.941h2.656c2 0 3.142 1.066 3.142 2.94 0 1.875-1.142 2.95-3.151 2.95h-2.647v-5.89zM32.673 16.08c1.448 0 2.79-.733 3.4-1.893h.047v1.779h2.133V8.582c0-2.14-1.714-3.52-4.351-3.52-2.447 0-4.256 1.399-4.323 3.32h2.076c.171-.913 1.018-1.512 2.18-1.512 1.41 0 2.2.656 2.2 1.865v.818l-2.876.171c-2.675.162-4.123 1.256-4.123 3.159 0 1.922 1.495 3.197 3.637 3.197zm.62-1.76c-1.229 0-2.01-.59-2.01-1.494 0-.933.752-1.475 2.19-1.56l2.562-.162v.837c0 1.39-1.181 2.379-2.743 2.379zM41.1 20c2.247 0 3.304-.856 4.227-3.454l4.047-11.341h-2.342l-2.714 8.763h-.047l-2.714-8.763h-2.409l3.904 10.799-.21.656c-.352 1.114-.923 1.542-1.942 1.542-.18 0-.533-.02-.676-.038v1.779c.133.038.705.057.876.057z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('card')}
                            className={`rounded-lg px-4 py-3.5 text-sm font-semibold ring-2 ring-inset transition ${
                              paymentMethod === 'card'
                                ? 'bg-indigo-600/30 text-white ring-indigo-500'
                                : 'bg-white/5 text-gray-200 ring-white/15 hover:bg-white/10'
                            }`}
                          >
                            Банковская карта
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('cash')}
                            className={`col-span-full rounded-lg px-4 py-3.5 text-sm font-semibold ring-2 ring-inset transition sm:col-span-2 ${
                              paymentMethod === 'cash'
                                ? 'bg-emerald-600/25 text-emerald-100 ring-emerald-500'
                                : 'bg-white/5 text-gray-200 ring-white/15 hover:bg-white/10'
                            }`}
                          >
                            Наличными при получении
                          </button>
                        </div>
                        {checkoutError ? (
                          <p className="text-xs text-red-400" role="alert">
                            {checkoutError}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void handlePay()}
                          disabled={!paymentMethod || checkoutSubmitting}
                          className="w-full rounded-md bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {checkoutSubmitting ? 'Оформляем…' : 'Оплатить'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <Dialog open={thankYouOpen} onClose={finishThankYou} className="relative z-[130]">
        <DialogBackdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
          <DialogPanel className="relative w-full max-w-sm rounded-xl bg-[#0d1b2a] px-6 py-8 shadow-2xl shadow-black/50 ring-1 ring-white/10">
            <button
              type="button"
              onClick={finishThankYou}
              className="absolute right-3 top-3 rounded-md p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Закрыть"
            >
              <XMarkIcon className="size-5" aria-hidden />
            </button>
            <div className="flex flex-col items-center text-center">
              <BulaiLogo className="h-8 w-auto text-violet-400" />
              <DialogTitle className="mt-6 text-center text-xl font-bold tracking-tight text-white">
                Спасибо за покупку!
              </DialogTitle>
              <p className="mt-3 text-sm leading-6 text-gray-300">
                Искренне рады, что выбрали нас!
                {createdOrderNumber ? (
                  <>
                    {' '}
                    Номер заказа:{' '}
                    <span className="font-medium text-white tabular-nums">{createdOrderNumber}</span>.
                  </>
                ) : null}
              </p>
              <button
                type="button"
                onClick={finishThankYou}
                className="mt-8 w-full rounded-md bg-indigo-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                В каталог
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  )
}
