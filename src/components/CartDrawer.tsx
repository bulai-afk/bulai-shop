import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { MinusIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { CatalogPriceLabel } from './CatalogPriceLabel'
import { PanelScrollArea } from './PanelScrollArea'
import { drawerPanelScrollbarRailClass } from './scrollbarShared'
import { formatCartAmount, useCart, type CartLine } from '../context/CartContext'
import { MoneyWithGlyph } from './MoneyWithGlyph'

function lineSaleTotalRub(line: CartLine): number {
  const unit = parseInt(line.priceDisplay.replace(/\D/g, ''), 10) || 0
  return unit * line.quantity
}

function lineCatalogTotalRub(line: CartLine): number {
  const raw = line.oldPriceDisplay ?? line.priceDisplay
  const unit = parseInt(raw.replace(/\D/g, ''), 10) || 0
  return unit * line.quantity
}

export function CartDrawer() {
  const {
    lines,
    isOpen,
    setOpen,
    listPriceTotalFormatted,
    totalSavingsFormatted,
    appliedPromoCode,
    appliedPromoPercent,
    promoDiscountFormatted,
    grandTotalFormatted,
    applyPromo,
    clearPromo,
    removeLine,
    incrementQuantity,
    decrementQuantity,
  } = useCart()
  const promoInputId = useId()
  const [promoCode, setPromoCode] = useState('')
  const [promoHint, setPromoHint] = useState<'error' | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setPromoHint(null)
    if (appliedPromoCode) setPromoCode(appliedPromoCode)
    else setPromoCode('')
  }, [isOpen, appliedPromoCode])

  return (
    <Dialog open={isOpen} onClose={setOpen} className="relative z-[110]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-500 ease-in-out data-closed:opacity-0"
      />

      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
            <DialogPanel
              transition
              className="pointer-events-auto flex h-full max-h-[100dvh] w-screen max-w-md transform flex-col bg-[#0d1b2a] shadow-2xl shadow-black/50 ring-1 ring-white/10 transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700"
            >
              <div className="flex h-full min-h-0 flex-col">
                <div className="shrink-0 px-4 pb-4 pt-6 sm:px-6">
                  <div className="flex items-start justify-between">
                    <DialogTitle className="text-lg font-medium text-white">Корзина</DialogTitle>
                    <div className="ml-3 flex h-7 items-center">
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="relative -m-2 rounded-md p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
                      >
                        <span className="absolute -inset-0.5" />
                        <span className="sr-only">Закрыть панель</span>
                        <XMarkIcon aria-hidden className="size-6" />
                      </button>
                    </div>
                  </div>
                </div>

                {lines.length === 0 ? (
                  <div className="min-h-0 flex-1 px-4 pb-6 pt-2 sm:px-6">
                    <p className="text-sm text-gray-400">Корзина пуста.</p>
                  </div>
                ) : (
                  <>
                    <PanelScrollArea
                      className="min-h-0 flex-1"
                      panelRailClassName={drawerPanelScrollbarRailClass}
                      viewportClassName="min-w-0 pl-4 pr-12 pb-4 pt-2 sm:pl-6 sm:pr-14"
                      propagateWheelToPage={false}
                      scrollbarVisibleOnHoverOnly
                    >
                      <div className="flow-root">
                        <ul role="list" className="divide-y divide-white/10">
                          {lines.map((product) => (
                            <li key={product.lineId} className="flex py-4">
                              <div className="size-20 shrink-0 overflow-hidden rounded-md border border-white/10">
                                <img
                                  alt={product.imageAlt}
                                  src={product.imageSrc}
                                  className="size-full object-cover"
                                />
                              </div>

                              <div className="ml-3 flex flex-1 flex-col">
                                <div>
                                  <div className="flex justify-between gap-2 text-sm font-medium leading-snug text-white">
                                    <h3 className="min-w-0">
                                      <Link
                                        to={product.href}
                                        onClick={() => setOpen(false)}
                                        className="hover:text-indigo-300"
                                      >
                                        {product.name}
                                      </Link>
                                    </h3>
                                    <div className="shrink-0 text-right">
                                      <CatalogPriceLabel
                                        price={
                                          <MoneyWithGlyph
                                            amount={formatCartAmount(lineSaleTotalRub(product))}
                                          />
                                        }
                                        oldPrice={
                                          product.discountLabel &&
                                          product.oldPriceDisplay &&
                                          lineCatalogTotalRub(product) > lineSaleTotalRub(product) ? (
                                            <MoneyWithGlyph
                                              amount={formatCartAmount(lineCatalogTotalRub(product))}
                                            />
                                          ) : undefined
                                        }
                                        discount={product.discountLabel}
                                      />
                                    </div>
                                  </div>
                                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-gray-400 sm:text-sm">
                                    {product.colorSwatchClassName ? (
                                      <span
                                        className={`size-3.5 shrink-0 rounded-full ring-1 ring-inset ring-white/25 ${product.colorSwatchClassName}`}
                                        aria-hidden
                                      />
                                    ) : null}
                                    <span>
                                      {product.colorLabel}
                                      {product.sizeLabel ? ` · ${product.sizeLabel}` : ''}
                                    {product.quantity > 1 ? (
                                      <span className="text-gray-500">
                                        {' '}
                                        ·{' '}
                                        <MoneyWithGlyph amount={product.priceDisplay} /> за шт.
                                        {product.oldPriceDisplay ? (
                                          <>
                                            {' '}
                                            <span className="line-through opacity-80">
                                              (было{' '}
                                              <MoneyWithGlyph amount={product.oldPriceDisplay} />)
                                            </span>
                                          </>
                                        ) : null}
                                      </span>
                                    ) : null}
                                    </span>
                                  </p>
                                </div>
                                <div className="mt-1 flex flex-1 flex-wrap items-center justify-between gap-2 text-sm">
                                  <div className="flex items-center gap-px rounded-md border border-white/15 bg-white/5 p-px">
                                    <button
                                      type="button"
                                      aria-label="Уменьшить количество"
                                      onClick={() => decrementQuantity(product.lineId)}
                                      className="flex size-6 items-center justify-center rounded-sm text-gray-300 transition hover:bg-white/10 hover:text-white"
                                    >
                                      <MinusIcon className="size-3.5" aria-hidden />
                                    </button>
                                    <span className="min-w-7 px-0.5 text-center text-xs tabular-nums text-gray-200">
                                      {product.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      aria-label="Увеличить количество"
                                      onClick={() => incrementQuantity(product.lineId)}
                                      className="flex size-6 items-center justify-center rounded-sm text-gray-300 transition hover:bg-white/10 hover:text-white"
                                    >
                                      <PlusIcon className="size-3.5" aria-hidden />
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    aria-label="Удалить из корзины"
                                    onClick={() => removeLine(product.lineId)}
                                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-indigo-400 transition hover:bg-white/10 hover:text-indigo-300"
                                  >
                                    <TrashIcon className="size-4" aria-hidden />
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </PanelScrollArea>

                    <div className="shrink-0 border-t border-white/10 px-4 py-6 sm:px-6">
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
                        <div className="mb-3 space-y-2 border-b border-white/10 pb-4">
                          {listPriceTotalFormatted && totalSavingsFormatted ? (
                            <>
                              <div className="flex justify-between text-sm text-gray-400">
                                <p>Без скидок</p>
                                <p className="line-through decoration-gray-500">
                                  <MoneyWithGlyph amount={listPriceTotalFormatted} />
                                </p>
                              </div>
                              <div className="flex justify-between text-sm text-emerald-400/95">
                                <p>Скидка на товары</p>
                                <p>
                                  <MoneyWithGlyph amount={totalSavingsFormatted} prefix="−" />
                                </p>
                              </div>
                            </>
                          ) : null}
                          {promoDiscountFormatted && appliedPromoCode ? (
                            <div className="flex justify-between text-sm text-emerald-400/95">
                              <p>
                                Промокод {appliedPromoCode} (−{appliedPromoPercent}%)
                              </p>
                              <p>
                                <MoneyWithGlyph amount={promoDiscountFormatted} prefix="−" />
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="flex justify-between text-base font-semibold text-white">
                        <p>К оплате</p>
                        <p>
                          <MoneyWithGlyph amount={grandTotalFormatted} />
                        </p>
                      </div>
                      <p className="mt-0.5 text-sm text-gray-500">
                        Доставка и налог — при оформлении заказа.
                      </p>
                      <div className="mt-6">
                        <Link
                          to="/checkout"
                          onClick={() => setOpen(false)}
                          className="flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-500"
                        >
                          Оформить заказ
                        </Link>
                      </div>
                      <div className="mt-6 flex justify-center text-center text-sm text-gray-500">
                        <p>
                          или{' '}
                          <Link
                            to="/catalog"
                            onClick={() => setOpen(false)}
                            className="font-medium text-indigo-400 hover:text-indigo-300"
                          >
                            Продолжить покупки
                            <span aria-hidden="true"> →</span>
                          </Link>
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </DialogPanel>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
