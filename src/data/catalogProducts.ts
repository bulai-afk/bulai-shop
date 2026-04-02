/** Мок-данные каталога: карточки и META для фильтров и страницы товара. */

export type ColorSwatch = {
  name: string
  className: string
  image: string
}

export type Product = {
  id: string
  name: string
  price: string
  /** Зачёркнутая цена до скидки (показывается слева от бейджа). */
  oldPrice?: string
  discount?: string
  image: string
  rating: number
  reviews: number
  sizes: string[]
  colors: ColorSwatch[]
}

const BASE_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Худи оверсайз',
    price: '4 990 ₽',
    oldPrice: '5 870 ₽',
    discount: '-15%',
    image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-01.jpg',
    rating: 4.8,
    reviews: 126,
    sizes: ['L', 'XL', 'XXL'],
    colors: [
      {
        name: 'Черный',
        className: 'bg-gray-950',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-01.jpg',
      },
      {
        name: 'Графит',
        className: 'bg-gray-700',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-04-detail-product-shot-01.jpg',
      },
      {
        name: 'Молочный',
        className: 'bg-zinc-200',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-02.jpg',
      },
    ],
  },
  {
    id: '2',
    name: 'Футболка базовая',
    price: '2 290 ₽',
    image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-02.jpg',
    rating: 4.6,
    reviews: 89,
    sizes: ['L', 'XL', 'XXL'],
    colors: [
      {
        name: 'Белый',
        className: 'bg-white',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-02.jpg',
      },
      {
        name: 'Серый',
        className: 'bg-gray-400',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-04-detail-product-shot-01.jpg',
      },
      {
        name: 'Синий',
        className: 'bg-blue-500',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/category-page-02-image-card-06.jpg',
      },
    ],
  },
  {
    id: '3',
    name: 'Майка с принтом',
    price: '1 890 ₽',
    oldPrice: '2 360 ₽',
    discount: '-20%',
    image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-01-related-product-01.jpg',
    rating: 4.9,
    reviews: 212,
    sizes: ['L', 'XL', 'XXL'],
    colors: [
      {
        name: 'Песочный',
        className: 'bg-amber-200',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-01-related-product-01.jpg',
      },
      {
        name: 'Олива',
        className: 'bg-lime-700',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-01.jpg',
      },
      {
        name: 'Черный',
        className: 'bg-black',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-04-detail-product-shot-01.jpg',
      },
    ],
  },
  {
    id: '4',
    name: 'Лонгслив',
    price: '2 590 ₽',
    image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-04-detail-product-shot-01.jpg',
    rating: 4.7,
    reviews: 64,
    sizes: ['L', 'XL', 'XXL'],
    colors: [
      {
        name: 'Сливовый',
        className: 'bg-fuchsia-900',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-04-detail-product-shot-01.jpg',
      },
      {
        name: 'Индиго',
        className: 'bg-indigo-600',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/category-page-02-image-card-06.jpg',
      },
      {
        name: 'Кремовый',
        className: 'bg-stone-200',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-02.jpg',
      },
    ],
  },
  {
    id: '5',
    name: 'Свитшот basic',
    price: '3 490 ₽',
    oldPrice: '4 260 ₽',
    discount: '-18%',
    image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-01.jpg',
    rating: 4.5,
    reviews: 73,
    sizes: ['L', 'XL', 'XXL'],
    colors: [
      {
        name: 'Графит',
        className: 'bg-gray-700',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-01.jpg',
      },
      {
        name: 'Хаки',
        className: 'bg-lime-700',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/category-page-02-image-card-06.jpg',
      },
      {
        name: 'Песочный',
        className: 'bg-amber-200',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-02.jpg',
      },
    ],
  },
  {
    id: '6',
    name: 'Джинсы straight',
    price: '5 290 ₽',
    image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/category-page-02-image-card-06.jpg',
    rating: 4.4,
    reviews: 58,
    sizes: ['L', 'XL', 'XXL'],
    colors: [
      {
        name: 'Синий',
        className: 'bg-blue-500',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/category-page-02-image-card-06.jpg',
      },
      {
        name: 'Индиго',
        className: 'bg-indigo-600',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-04-detail-product-shot-01.jpg',
      },
      {
        name: 'Черный',
        className: 'bg-black',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-01.jpg',
      },
    ],
  },
  {
    id: '7',
    name: 'Куртка демисезон',
    price: '8 990 ₽',
    oldPrice: '12 840 ₽',
    discount: '-30%',
    image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-04-detail-product-shot-01.jpg',
    rating: 4.9,
    reviews: 41,
    sizes: ['L', 'XL', 'XXL'],
    colors: [
      {
        name: 'Черный',
        className: 'bg-black',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-04-detail-product-shot-01.jpg',
      },
      {
        name: 'Сливовый',
        className: 'bg-fuchsia-900',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-02.jpg',
      },
      {
        name: 'Серый',
        className: 'bg-gray-400',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/category-page-02-image-card-06.jpg',
      },
    ],
  },
  {
    id: '8',
    name: 'Рубашка relaxed',
    price: '3 890 ₽',
    image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-02.jpg',
    rating: 4.3,
    reviews: 97,
    sizes: ['L', 'XL', 'XXL'],
    colors: [
      {
        name: 'Белый',
        className: 'bg-white',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-02.jpg',
      },
      {
        name: 'Кремовый',
        className: 'bg-stone-200',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-01-related-product-01.jpg',
      },
      {
        name: 'Олива',
        className: 'bg-lime-700',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-01.jpg',
      },
    ],
  },
  {
    id: '9',
    name: 'Шорты casual',
    price: '2 190 ₽',
    oldPrice: '2 460 ₽',
    discount: '-11%',
    image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-01-related-product-01.jpg',
    rating: 4.2,
    reviews: 38,
    sizes: ['L', 'XL', 'XXL'],
    colors: [
      {
        name: 'Песочный',
        className: 'bg-amber-200',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-01-related-product-01.jpg',
      },
      {
        name: 'Черный',
        className: 'bg-black',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-04-detail-product-shot-01.jpg',
      },
      {
        name: 'Синий',
        className: 'bg-blue-500',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/category-page-02-image-card-06.jpg',
      },
    ],
  },
  {
    id: '10',
    name: 'Поло premium',
    price: '3 190 ₽',
    image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-01.jpg',
    rating: 4.7,
    reviews: 54,
    sizes: ['L', 'XL', 'XXL'],
    colors: [
      {
        name: 'Индиго',
        className: 'bg-indigo-600',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-01.jpg',
      },
      {
        name: 'Белый',
        className: 'bg-white',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-02.jpg',
      },
      {
        name: 'Графит',
        className: 'bg-gray-700',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-04-detail-product-shot-01.jpg',
      },
    ],
  },
  {
    id: '11',
    name: 'Брюки wide-leg',
    price: '4 390 ₽',
    oldPrice: '5 420 ₽',
    discount: '-19%',
    image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/category-page-02-image-card-06.jpg',
    rating: 4.6,
    reviews: 67,
    sizes: ['L', 'XL', 'XXL'],
    colors: [
      {
        name: 'Черный',
        className: 'bg-black',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/category-page-02-image-card-06.jpg',
      },
      {
        name: 'Серый',
        className: 'bg-gray-400',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-02.jpg',
      },
      {
        name: 'Кремовый',
        className: 'bg-stone-200',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-01.jpg',
      },
    ],
  },
  {
    id: '12',
    name: 'Ветровка light',
    price: '6 490 ₽',
    image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-04-detail-product-shot-01.jpg',
    rating: 4.8,
    reviews: 83,
    sizes: ['L', 'XL', 'XXL'],
    colors: [
      {
        name: 'Олива',
        className: 'bg-lime-700',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-04-detail-product-shot-01.jpg',
      },
      {
        name: 'Синий',
        className: 'bg-blue-500',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/category-page-02-image-card-06.jpg',
      },
      {
        name: 'Черный',
        className: 'bg-black',
        image: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-01.jpg',
      },
    ],
  },
]

export const products: Product[] = Array.from({ length: 30 }, (_, idx) => {
  const base = BASE_PRODUCTS[idx % BASE_PRODUCTS.length]
  const id = String(idx + 1)
  const copyIndex = Math.floor(idx / BASE_PRODUCTS.length) + 1
  const name = idx < BASE_PRODUCTS.length ? base.name : `${base.name} ${copyIndex}`

  return {
    ...base,
    id,
    name,
    rating: Math.max(3.8, Math.min(5, base.rating - (idx % 4) * 0.1)),
    reviews: base.reviews + idx * 3,
  }
})

export type ProductCategory = 'брюки' | 'рубашки' | 'майки'

/** Категории в фильтре каталога (включая «новинки» по флагу isNew). */
export type CategoryOption = ProductCategory | 'новинки'

export type ProductMeta = {
  category: ProductCategory
  /** Показывать в фильтре «новинки». */
  isNew: boolean
  fit: 'slim' | 'regular' | 'relaxed' | 'wide'
  material: 'хлопок' | 'деним' | 'смесовая' | 'лен'
  season: 'лето' | 'деми' | 'зима'
  inStock: boolean
}

/** Slug в `?category=` для ссылок из мегаменю и шаринга фильтра. */
export const CATEGORY_QUERY_SLUG: Record<CategoryOption, string> = {
  новинки: 'novinki',
  майки: 'mayki',
  рубашки: 'rubashki',
  брюки: 'bryuki',
}

const SLUG_TO_CATEGORY = Object.fromEntries(
  Object.entries(CATEGORY_QUERY_SLUG).map(([k, v]) => [v, k as CategoryOption]),
) as Record<string, CategoryOption>

export function parseCategoriesFromQueryParam(raw: string | null): CategoryOption[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((s) => SLUG_TO_CATEGORY[s.trim().toLowerCase()])
    .filter(Boolean)
}

export function categoriesToQueryParam(categories: CategoryOption[]): string | null {
  if (categories.length === 0) return null
  const slugs = categories.map((c) => CATEGORY_QUERY_SLUG[c]).join(',')
  return slugs || null
}

const BASE_META_BY_ID: Record<string, ProductMeta> = {
  '1': { category: 'майки', isNew: true, fit: 'relaxed', material: 'хлопок', season: 'деми', inStock: true },
  '2': { category: 'майки', isNew: true, fit: 'regular', material: 'хлопок', season: 'лето', inStock: true },
  '3': { category: 'майки', isNew: true, fit: 'slim', material: 'смесовая', season: 'лето', inStock: true },
  '4': { category: 'майки', isNew: false, fit: 'regular', material: 'смесовая', season: 'деми', inStock: false },
  '5': { category: 'рубашки', isNew: true, fit: 'regular', material: 'хлопок', season: 'деми', inStock: true },
  '6': { category: 'брюки', isNew: false, fit: 'slim', material: 'деним', season: 'деми', inStock: true },
  '7': { category: 'рубашки', isNew: false, fit: 'relaxed', material: 'смесовая', season: 'зима', inStock: true },
  '8': { category: 'рубашки', isNew: false, fit: 'regular', material: 'лен', season: 'лето', inStock: true },
  '9': { category: 'брюки', isNew: false, fit: 'regular', material: 'хлопок', season: 'лето', inStock: true },
  '10': { category: 'рубашки', isNew: false, fit: 'slim', material: 'хлопок', season: 'лето', inStock: false },
  '11': { category: 'брюки', isNew: false, fit: 'wide', material: 'смесовая', season: 'деми', inStock: true },
  '12': { category: 'брюки', isNew: false, fit: 'relaxed', material: 'смесовая', season: 'зима', inStock: true },
}

export const META_BY_ID: Record<string, ProductMeta> = Object.fromEntries(
  products.map((product) => {
    const base = BASE_PRODUCTS[(Number(product.id) - 1) % BASE_PRODUCTS.length]
    const row = { ...BASE_META_BY_ID[base.id] } as ProductMeta
    /** Последние позиции в каталоге считаем новинками (доп. к флагу в базовых 12). */
    if (Number(product.id) >= 22) row.isNew = true
    return [product.id, row]
  }),
)

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}

export function getRelatedProducts(currentId: string, limit = 4): Product[] {
  const meta = META_BY_ID[currentId]
  if (!meta) return []
  return products
    .filter((p) => p.id !== currentId && META_BY_ID[p.id]?.category === meta.category)
    .slice(0, limit)
}
