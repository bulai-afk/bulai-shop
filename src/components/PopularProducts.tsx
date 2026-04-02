import { forwardRef, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { CatalogPriceLabel } from './CatalogPriceLabel'

const DELIVERY_ILLUSTRATION =
  'https://tailwindcss.com/plus-assets/img/ecommerce/icons/icon-delivery-light.svg'

const WARRANTY_ILLUSTRATION =
  'https://tailwindcss.com/plus-assets/img/ecommerce/icons/icon-warranty-light.svg'

const RETURNS_ILLUSTRATION =
  'https://tailwindcss.com/plus-assets/img/ecommerce/icons/icon-returns-light.svg'

const PLANET_ILLUSTRATION =
  'https://tailwindcss.com/plus-assets/img/ecommerce/icons/icon-planet-light.svg'

const SERVICE_POINTS: {
  name: string
  description: string
  illustrationImage: string
}[] = [
  {
    name: 'Бесплатная доставка',
    description:
      'Почтой России по России — бесплатно при заказе от 5 000 ₽. Трек-номер и ориентир по срокам отправим после подтверждения.',
    illustrationImage: DELIVERY_ILLUSTRATION,
  },
  {
    name: 'Возврат',
    description:
      'Если размер или модель не подошли — обмен или возврат по правилам магазина в течение 14 дней. Подскажем шаги в поддержке.',
    illustrationImage: RETURNS_ILLUSTRATION,
  },
  {
    name: 'Гарантии',
    description:
      'На товары действует гарантия на скрытые дефекты: при заводском браке поможем с заменой или возвратом по регламенту.',
    illustrationImage: WARRANTY_ILLUSTRATION,
  },
  {
    name: 'Экологически чистые товары',
    description:
      'Выбираем материалы и партнёров с меньшим воздействием на среду — осознанное производство и честный состав.',
    illustrationImage: PLANET_ILLUSTRATION,
  },
]

type Product = {
  id: string
  name: string
  price: string
  oldPrice?: string
  discount?: string
  image: string
}

const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Худи оверсайз',
    price: '4 990 ₽',
    oldPrice: '5 870 ₽',
    discount: '-15%',
    image:
      'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-01.jpg',
  },
  {
    id: '2',
    name: 'Футболка базовая',
    price: '2 290 ₽',
    image:
      'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-02.jpg',
  },
  {
    id: '3',
    name: 'Майка с принтом',
    price: '1 890 ₽',
    oldPrice: '2 360 ₽',
    discount: '-20%',
    image:
      'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-01-related-product-01.jpg',
  },
  {
    id: '4',
    name: 'Лонгслив',
    price: '2 590 ₽',
    image:
      'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-04-detail-product-shot-01.jpg',
  },
]

/** Популярные товары: высокие фото (3:4), заголовок и ссылка в каталог. */
type PopularProductsProps = {
  serviceDividerRef?: RefObject<HTMLDivElement | null>
}

export const PopularProducts = forwardRef<HTMLElement, PopularProductsProps>(function PopularProducts(
  { serviceDividerRef },
  ref,
) {
  return (
    <section
      ref={ref}
      className="scroll-mt-[6.5rem] bg-gray-900 pb-10 pt-5 sm:pb-12 sm:pt-6 lg:pb-14 lg:pt-8"
      aria-labelledby="popular-products-heading"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-row items-end justify-between gap-3 sm:gap-4">
          <h2
            id="popular-products-heading"
            className="min-w-0 text-4xl font-semibold tracking-tight text-white sm:text-5xl"
          >
            Популярные товары
          </h2>
          <Link
            to="/catalog"
            className="inline-flex shrink-0 items-center text-base/6 font-semibold text-indigo-400 transition hover:text-indigo-300"
          >
            Смотреть все <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:mt-10 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-12">
          {PRODUCTS.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="group min-w-0"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-gray-800 shadow-md ring-1 ring-white/10 transition hover:shadow-xl hover:ring-white/20">
                <img
                  src={product.image}
                  alt=""
                  className="size-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-90" />
                <div className="absolute bottom-3 right-3 max-w-[calc(100%-1.5rem)]">
                  <CatalogPriceLabel
                    price={product.price}
                    oldPrice={product.oldPrice}
                    discount={product.discount}
                  />
                </div>
              </div>
              <h3 className="mt-4 text-sm/6 font-medium text-white sm:text-base/7">
                {product.name}
              </h3>
            </Link>
          ))}
        </div>

        <div
          ref={serviceDividerRef}
          className="scroll-mt-[6.5rem] mt-14 pt-2 sm:mt-16 sm:pt-3 lg:mt-20 lg:pt-4"
          aria-labelledby="popular-service-heading"
        >
          <h3
            id="popular-service-heading"
            className="min-w-0 text-4xl font-semibold tracking-tight text-white sm:text-5xl"
          >
            Ключевые преимущества
          </h3>
          <div
            data-popular-service-scroll
            className="stable-scroll mt-6 max-h-[22rem] overflow-y-auto pr-2 sm:mt-7 sm:pr-3"
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-6 lg:gap-x-12">
              {SERVICE_POINTS.map((item) => (
                <div key={item.name} className="flex min-w-0 items-stretch gap-4 sm:gap-5">
                  <div className="flex w-24 shrink-0 self-stretch sm:w-32">
                    <img
                      src={item.illustrationImage}
                      alt=""
                      className="h-full w-full object-contain object-left"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold leading-snug text-white sm:text-base/7">
                      {item.name}
                    </h4>
                    <p className="mt-1.5 text-xs/5 text-pretty text-gray-300 sm:mt-2 sm:text-sm/6">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
})
