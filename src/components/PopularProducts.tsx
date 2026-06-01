import { forwardRef, useEffect, useMemo, useState } from 'react'
import { CatalogProductCard } from './CatalogProductCard'
import { useCatalogInventory } from '../context/CatalogInventoryContext'

/** Популярные товары: те же карточки, что в каталоге. */
export const PopularProducts = forwardRef<HTMLElement>(function PopularProducts(_props, ref) {
  const { products, metaById } = useCatalogInventory()
  const popularProducts = useMemo(() => products.slice(0, 4), [products])

  const [activeColorByProduct, setActiveColorByProduct] = useState<Record<string, string>>({})

  useEffect(() => {
    setActiveColorByProduct(
      Object.fromEntries(popularProducts.map((p) => [p.id, p.colors[0]?.name ?? ''])),
    )
  }, [popularProducts])

  return (
    <section
      ref={ref}
      className="scroll-mt-[6.5rem] bg-gray-900 pb-10 pt-5 sm:pb-12 sm:pt-6 lg:pb-14 lg:pt-8"
      aria-labelledby="popular-products-heading"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <h2
          id="popular-products-heading"
          className="min-w-0 text-center text-4xl font-semibold tracking-tight text-white sm:text-left sm:text-5xl"
        >
          Популярные товары
        </h2>

        <ul className="mt-8 grid grid-cols-2 gap-5 lg:mt-10 lg:grid-cols-4">
          {popularProducts.map((product) => (
            <li key={product.id} className="group min-w-0">
              <CatalogProductCard
                product={product}
                meta={metaById[product.id]}
                activeColorName={activeColorByProduct[product.id]}
                onPickColor={(colorName) =>
                  setActiveColorByProduct((prev) => ({ ...prev, [product.id]: colorName }))
                }
                productTitleLevel="h3"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
})
