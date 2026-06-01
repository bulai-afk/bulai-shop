import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from '@headlessui/react'
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline'
import { CatalogProductCard } from '../components/CatalogProductCard'
import { ProductGalleryReviews } from '../components/ProductGalleryReviews'
import { useCatalogInventory } from '../context/CatalogInventoryContext'
import { useCart } from '../context/CartContext'
import { usePublicDocuments } from '../context/PublicDocumentsContext'
import {
  FIT_LABELS,
  resolveProductAccordionCare,
  resolveProductAccordionFeatures,
  type Product,
} from '../data/catalogProducts'

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function ProductRatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <div className="flex items-center gap-0.5" aria-label={`Рейтинг ${rating} из 5`}>
        {[1, 2, 3, 4, 5].map((star) => {
          const roundedRating = Math.round(rating * 2) / 2
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
      </div>
      <span className="text-sm font-medium text-gray-200">
        {rating.toFixed(1)} из 5
      </span>
    </div>
  )
}

type GalleryItem = { label: string; image: string; alt: string }

function buildGallery(product: Product): GalleryItem[] {
  if (product.colors.length > 0) {
    return product.colors.map((c) => ({
      label: c.name,
      image: c.image,
      alt: `${product.name}, ${c.name}`,
    }))
  }
  return [{ label: 'Фото', image: product.image, alt: product.name }]
}

export function ProductPage() {
  const { productId } = useParams<{ productId: string }>()
  const { metaById, getProductById, getRelatedProducts } = useCatalogInventory()
  const product = productId ? getProductById(productId) : undefined
  const meta = productId ? metaById[productId] : undefined
  const { addItem } = useCart()
  const { productPageDocumentLinks, openDocumentInViewer } = usePublicDocuments()

  const [selectedColorName, setSelectedColorName] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const detailsAccordionUid = useId().replace(/:/g, '')
  const [detailsOpenIdx, setDetailsOpenIdx] = useState<number | null>(0)
  const [relatedColorByProduct, setRelatedColorByProduct] = useState<Record<string, string>>({})

  const gallery = useMemo(() => (product ? buildGallery(product) : []), [product])

  const accordionFeatures = useMemo(() => {
    if (!product || !meta) {
      return {
        category: '',
        fit: '',
        material: '',
        season: '',
        any: [] as string[],
      }
    }
    return resolveProductAccordionFeatures(meta, product.accordionSections?.features)
  }, [product, meta])

  const accordionCare = useMemo(
    () => (product ? resolveProductAccordionCare(product.accordionSections?.care) : []),
    [product],
  )

  const productDetailSections = useMemo((): { title: string; body: ReactNode }[] => {
    const sections: { title: string; body: ReactNode }[] = [
      {
        title: 'Особенности',
        body: (
          <ul role="list" className="list-disc space-y-2 pl-5 text-sm text-gray-300">
            <li>Категория: {accordionFeatures.category}</li>
            <li>Посадка: {accordionFeatures.fit}</li>
            <li>Материал: {accordionFeatures.material}</li>
            <li>Сезон: {accordionFeatures.season}</li>
            {accordionFeatures.any.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ),
      },
      {
        title: 'Уход',
        body: (
          <ul role="list" className="list-disc space-y-2 pl-5 text-sm text-gray-300">
            {accordionCare.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ),
      },
    ]
    if (productPageDocumentLinks.length > 0) {
      sections.push({
        title: 'Документы',
        body: (
          <ul role="list" className="list-none space-y-2 pl-0 text-sm text-gray-300">
            {productPageDocumentLinks.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  className="text-left text-indigo-300/90 underline decoration-indigo-500/35 underline-offset-2 transition hover:text-indigo-200"
                  onClick={() => openDocumentInViewer(l)}
                >
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        ),
      })
    }
    return sections
  }, [accordionFeatures, accordionCare, productPageDocumentLinks, openDocumentInViewer])

  useEffect(() => {
    if (!product) return
    setSelectedColorName(product.colors[0]?.name ?? '')
    setSelectedSize(product.sizes[0] ?? '')
  }, [product])

  useEffect(() => {
    if (!productId) return
    const prod = getProductById(productId)
    if (!prod) return
    const rel = getRelatedProducts(prod.id, 4)
    setRelatedColorByProduct(
      Object.fromEntries(rel.map((p) => [p.id, p.colors[0]?.name ?? ''])),
    )
  }, [productId, getProductById, getRelatedProducts])

  const colorIndex = useMemo(() => {
    if (!product?.colors.length) return 0
    const i = product.colors.findIndex((c) => c.name === selectedColorName)
    return i >= 0 ? i : 0
  }, [product, selectedColorName])

  if (!product || !meta) {
    return <Navigate to="/catalog" replace />
  }

  const related = getRelatedProducts(product.id, 4)

  const activeSwatchForReview =
    product.colors.find((c) => c.name === selectedColorName) ?? product.colors[0]
  const reviewPreviewImage = activeSwatchForReview?.image ?? product.image

  return (
    <div>
      <div className="mx-auto mt-3 max-w-2xl sm:mt-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <nav className="mb-3 text-sm text-gray-400 sm:mb-4" aria-label="Хлебные крошки">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link to="/" className="transition hover:text-indigo-400">
                Главная
              </Link>
            </li>
            <li aria-hidden className="text-gray-600">
              /
            </li>
            <li>
              <Link to="/catalog" className="transition hover:text-indigo-400">
                Каталог
              </Link>
            </li>
            <li aria-hidden className="text-gray-600">
              /
            </li>
            <li className="font-medium text-gray-300">{product.name}</li>
          </ol>
        </nav>

        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-12 xl:gap-x-16">
          {/* Image gallery — как в Tailwind Plus: сначала миниатюры в DOM, flex-col-reverse крупное фото сверху */}
          <TabGroup
            selectedIndex={colorIndex}
            onChange={(index) => {
              const c = product.colors[index]
              if (c) setSelectedColorName(c.name)
            }}
            className="flex flex-col-reverse gap-4"
          >
            <div className="mx-auto w-full max-w-2xl lg:max-w-none">
              <TabList className="flex gap-4">
                {gallery.map((item) => (
                  <Tab
                    key={item.label + item.image}
                    className="relative flex min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                    {({ selected }) => (
                      <>
                        <span className="sr-only">{item.label}</span>
                        <span
                          className={classNames(
                            'pointer-events-none inline-block h-24 w-full overflow-hidden rounded-md border-2 border-transparent sm:h-32',
                            selected ? 'border-indigo-500' : 'border-white/10',
                          )}
                        >
                          <img src={item.image} alt="" className="h-full w-full object-cover object-center" />
                        </span>
                      </>
                    )}
                  </Tab>
                ))}
              </TabList>
            </div>

            <div className="relative">
              <p
                className={classNames(
                  'pointer-events-none absolute top-3 right-3 z-10 rounded-md px-2.5 py-1 text-xs font-semibold shadow-lg sm:top-4 sm:right-4',
                  meta.inStock ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white',
                )}
              >
                {meta.inStock ? 'В наличии' : 'Нет в наличии'}
              </p>
              <TabPanels>
                {gallery.map((item) => (
                  <TabPanel key={item.label + item.image} unmount={false}>
                    <img
                      src={item.image}
                      alt={item.alt}
                      className="aspect-square w-full rounded-lg border border-white/10 bg-gray-800/30 object-cover sm:rounded-2xl"
                    />
                  </TabPanel>
                ))}
              </TabPanels>
            </div>
          </TabGroup>

          {/* Product info */}
          <div className="mt-10 px-4 sm:mt-16 sm:px-0 lg:mt-0">
            <h1 className="text-center text-3xl font-bold tracking-tight text-white sm:text-left">
              {product.name}
            </h1>

            <div className="mt-8 sm:mt-10">
              <h2 className="sr-only">Информация о товаре</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:gap-x-10">
                <div>
                  <h3 className="text-sm font-medium text-white">Цена</h3>
                  <div className="mt-4">
                    <div className="relative inline-block">
                      <p className="text-3xl tracking-tight text-indigo-400">{product.price}</p>
                      {product.discount ? (
                        <div className="absolute right-0 top-0 z-10 flex translate-x-4 -translate-y-[66%] items-center gap-2 whitespace-nowrap sm:translate-x-6">
                          {product.oldPrice ? (
                            <span
                              className="text-sm text-gray-400 line-through sm:text-base"
                              aria-label={`Раньше ${product.oldPrice}`}
                            >
                              {product.oldPrice}
                            </span>
                          ) : null}
                          <span className="rounded-md bg-rose-500/90 px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-white shadow-md sm:px-2 sm:text-xs">
                            {product.discount}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">Рейтинг</h3>
                  <div className="mt-4">
                    <ProductRatingStars rating={product.rating} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-white">Описание</h3>
              <div className="mt-2 space-y-3 text-sm text-gray-300">
                <p>
                  Модель из коллекции Bulai: {FIT_LABELS[meta.fit].toLowerCase()} посадка, материал —{' '}
                  {meta.material}. Подходит для сезона «{meta.season}». Уточните размер по таблице на
                  странице доставки или в поддержке.
                </p>
              </div>
            </div>

            <form
              className="mt-8"
              onSubmit={(e) => {
                e.preventDefault()
                const color = selectedColorName || product.colors[0]?.name || ''
                const size = selectedSize || product.sizes[0] || ''
                addItem(product, color, size)
              }}
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:gap-x-10">
                {product.colors.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-medium text-white">Цвет</h3>
                    <fieldset aria-label="Выберите цвет" className="mt-4">
                      <div className="flex flex-wrap items-center gap-3">
                        {product.colors.map((color) => {
                          const checked = selectedColorName === color.name
                          return (
                            <label
                              key={color.name}
                              className="relative -m-0.5 flex cursor-pointer items-center justify-center rounded-full p-0.5 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-900"
                            >
                              <input
                                type="radio"
                                name="color"
                                value={color.name}
                                checked={checked}
                                onChange={() => setSelectedColorName(color.name)}
                                className="sr-only"
                                aria-label={color.name}
                              />
                              <span
                                aria-hidden
                                className={classNames(
                                  'h-8 w-8 rounded-full border border-black/10 shadow-[0_4px_14px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06)]',
                                  color.className,
                                  checked ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-900' : '',
                                )}
                              />
                            </label>
                          )
                        })}
                      </div>
                    </fieldset>
                  </div>
                ) : null}

                {product.sizes.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-medium text-white">Размер</h3>
                    <fieldset aria-label="Выберите размер" className="mt-4">
                      <div className="flex flex-wrap items-center gap-2 overflow-visible py-0.5">
                        {product.sizes.map((size) => {
                          const checked = selectedSize === size
                          return (
                            <label
                              key={size}
                              className={classNames(
                                'group relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border bg-gray-800/50 text-xs font-semibold uppercase leading-none tracking-wide text-gray-200 transition focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-900',
                                checked
                                  ? 'z-[1] border-indigo-400/60 shadow-[0_0_0_2px_rgba(129,140,248,0.95),0_0_14px_rgba(129,140,248,0.72)]'
                                  : 'border-white/10 shadow-none',
                              )}
                            >
                              <input
                                type="radio"
                                name="size"
                                value={size}
                                checked={checked}
                                onChange={() => setSelectedSize(size)}
                                className="sr-only"
                              />
                              <span
                                className={classNames(
                                  checked
                                    ? 'text-indigo-400'
                                    : 'text-gray-200 group-hover:text-white',
                                )}
                              >
                                {size}
                              </span>
                              <span
                                className={classNames(
                                  'pointer-events-none absolute inset-0 rounded-md border-2',
                                  checked
                                    ? 'border-transparent'
                                    : 'border-transparent group-hover:border-white/25',
                                )}
                                aria-hidden
                              />
                            </label>
                          )
                        })}
                      </div>
                    </fieldset>
                  </div>
                ) : null}
              </div>

              <div className="mt-10">
                <button
                  type="submit"
                  disabled={!meta.inStock}
                  className="flex w-full max-w-xs items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-40 lg:max-w-none"
                >
                  В корзину
                </button>
              </div>
            </form>

            <section
              aria-labelledby="product-extra-heading"
              className="mt-12 border-t border-white/10 pt-10"
            >
              <h2
                id="product-extra-heading"
                className="text-center text-lg font-semibold tracking-tight text-white sm:text-left sm:text-xl"
              >
                Дополнительная информация
              </h2>

              <dl className="mt-8 divide-y divide-white/10 border-t border-b border-white/10">
                {productDetailSections.map((item, idx) => {
                  const isOpen = detailsOpenIdx === idx
                  const panelId = `product-details-${detailsAccordionUid}-${idx}`
                  return (
                    <div key={item.title}>
                      <dt>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-white hover:text-indigo-300"
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          onClick={() => setDetailsOpenIdx((prev) => (prev === idx ? null : idx))}
                        >
                          <span>{item.title}</span>
                          <span className="ml-6 flex h-7 w-7 shrink-0 items-center justify-center text-gray-400">
                            {isOpen ? (
                              <MinusIcon className="h-5 w-5" aria-hidden />
                            ) : (
                              <PlusIcon className="h-5 w-5" aria-hidden />
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
                            className={`pb-4 text-sm text-gray-300 transition-all duration-300 ease-out ${isOpen ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'}`}
                          >
                            {item.body}
                          </dd>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </dl>
              <p className="mt-6 max-w-prose text-sm text-gray-500">
                Актуальные условия доставки и возврата — на шаге оформления заказа и в разделе ваших заказов.
              </p>
            </section>
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section
          className="mx-auto mt-20 max-w-7xl border-t border-white/10 px-4 pt-12 sm:px-6 lg:px-8"
          aria-labelledby="recommended-with-product-heading"
        >
          <h2
            id="recommended-with-product-heading"
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Рекомендуем с этим товаром
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {related.map((p) => (
              <li key={p.id} className="group min-w-0">
                <CatalogProductCard
                  product={p}
                  meta={metaById[p.id]}
                  activeColorName={relatedColorByProduct[p.id] ?? p.colors[0]?.name ?? ''}
                  onPickColor={(colorName) =>
                    setRelatedColorByProduct((prev) => ({ ...prev, [p.id]: colorName }))
                  }
                  productTitleLevel="h3"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ProductGalleryReviews
        productId={product.id}
        productRating={product.rating}
        reviewCount={product.reviews}
        productPreview={{
          name: product.name,
          image: reviewPreviewImage,
          size: selectedSize || product.sizes[0] || '—',
          color: selectedColorName || product.colors[0]?.name || '—',
          colorSwatchClassName: activeSwatchForReview?.className,
        }}
      />
    </div>
  )
}
