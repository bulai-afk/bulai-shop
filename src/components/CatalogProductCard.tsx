import { Link } from 'react-router-dom'
import { CatalogPriceLabel } from './CatalogPriceLabel'
import type { Product, ProductMeta } from '../data/catalogProducts'

export type CatalogProductCardProps = {
  product: Product
  meta?: ProductMeta
  activeColorName: string
  onPickColor: (colorName: string) => void
  /** На главной под секционным `h2` — `h3`. */
  productTitleLevel?: 'h2' | 'h3'
}

function StarRow({ rating }: { rating: number }) {
  const roundedRating = Math.round(rating * 2) / 2
  return (
    <>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = roundedRating >= star
        const isHalf = !isFull && roundedRating + 0.5 === star

        if (isFull) {
          return (
            <span key={star} aria-hidden className="text-amber-300">
              ★
            </span>
          )
        }

        if (isHalf) {
          return (
            <span key={star} aria-hidden className="relative inline-block text-gray-600">
              ★
              <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden text-amber-300">★</span>
            </span>
          )
        }

        return (
          <span key={star} aria-hidden className="text-gray-600">
            ★
          </span>
        )
      })}
    </>
  )
}

/** Карточка товара как в каталоге: фото 4:5, бейджи, цвета, рейтинг, кнопка. */
export function CatalogProductCard({
  product,
  meta,
  activeColorName,
  onPickColor,
  productTitleLevel = 'h2',
}: CatalogProductCardProps) {
  const activeSwatch =
    product.colors.find((c) => c.name === activeColorName) ?? product.colors[0]
  const TitleTag = productTitleLevel

  return (
    <article className="rounded-2xl">
      <div className="relative">
        <div className="relative rounded-2xl">
          <div className="relative z-0 aspect-[4/5] w-full overflow-hidden rounded-2xl">
            <img
              src={activeSwatch?.image ?? product.image}
              alt={`${product.name}, цвет ${activeSwatch?.name ?? ''}`}
              className="h-full w-full object-cover transition duration-300 ease-out group-hover:scale-105"
            />
          </div>
          <div className="pointer-events-none absolute inset-0 z-10 overflow-visible [transform:translateZ(1px)]">
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-90" />
            </div>
            {meta ? (
              <p
                className={`absolute top-1 right-1 rounded-md px-2.5 py-1 text-xs font-semibold ${
                  meta.inStock ? 'bg-emerald-500/85 text-white' : 'bg-rose-500/85 text-white'
                }`}
              >
                {meta.inStock ? 'В наличии' : 'Нет в наличии'}
              </p>
            ) : null}
            <div className="absolute top-1 left-1 flex flex-col gap-1">
              {product.sizes.map((size) => (
                <span
                  key={size}
                  className="inline-flex min-w-8 items-center justify-center rounded-md bg-black/70 px-2 py-1 text-center text-[11px] font-semibold tracking-wide text-white"
                >
                  {size}
                </span>
              ))}
            </div>
            {meta?.isNew ? (
              <p className="absolute bottom-3 left-1 rounded-md bg-indigo-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow-md">
                Новинка
              </p>
            ) : null}
            <div
              className={`absolute bottom-3 right-1 ${
                meta?.isNew ? 'max-w-[calc(100%-5.75rem)]' : 'max-w-[calc(100%-0.5rem)]'
              }`}
            >
              <CatalogPriceLabel
                price={product.price}
                oldPrice={product.oldPrice}
                discount={product.discount}
              />
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-1/2 z-30 flex -translate-x-1/2 translate-y-1/2 items-center gap-2">
          {product.colors.map((color) => (
            <button
              key={color.name}
              type="button"
              aria-label={color.name}
              aria-pressed={activeColorName === color.name}
              onClick={() => onPickColor(color.name)}
              className={`h-5 w-5 rounded-full border border-white/90 ${color.className} transition ${
                activeColorName === color.name
                  ? 'shadow-[0_0_0_2px_rgba(129,140,248,0.95),0_0_14px_rgba(129,140,248,0.75)]'
                  : 'shadow-none'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 text-center">
        <TitleTag className="text-base font-semibold text-gray-100">{product.name}</TitleTag>

        <div className="mt-2">
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center gap-0.5" aria-label={`Рейтинг ${product.rating} из 5`}>
              <StarRow rating={product.rating} />
            </div>
            <span className="text-sm font-medium text-gray-200">{product.rating.toFixed(1)}</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">Оценок: {product.reviews}</p>
        </div>

        <Link
          to={`/product/${product.id}`}
          className="mt-4 flex w-full items-center justify-center rounded-lg bg-slate-700/65 px-4 py-2.5 text-sm font-semibold text-gray-100 transition hover:bg-slate-600/75"
        >
          Перейти к товару
        </Link>
      </div>
    </article>
  )
}
