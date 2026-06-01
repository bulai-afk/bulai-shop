import type { ReactNode } from 'react'

type CatalogPriceLabelProps = {
  /** Актуальная цена (строка из каталога или форматированная сумма). */
  price: ReactNode
  oldPrice?: string
  discount?: string
  className?: string
}

/**
 * Ценник как на карточке каталога: pill `bg-black/70` + при скидке старая цена и бейдж сверху справа.
 */
export function CatalogPriceLabel({ price, oldPrice, discount, className = '' }: CatalogPriceLabelProps) {
  return (
    <div className={`relative inline-block max-w-full ${className}`.trim()}>
      <p className="rounded-md bg-black/70 px-2.5 py-1 text-sm font-semibold text-indigo-400">{price}</p>
      {discount ? (
        <div className="absolute right-0 top-0 z-[1] flex translate-x-3 -translate-y-[66%] items-center gap-1 whitespace-nowrap sm:translate-x-5 sm:gap-1.5">
          {oldPrice ? (
            <span className="text-[9px] text-gray-300 line-through sm:text-[10px]">{oldPrice}</span>
          ) : null}
          <p className="rounded-md bg-rose-500/90 px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-white shadow-md">
            {discount}
          </p>
        </div>
      ) : null}
    </div>
  )
}
