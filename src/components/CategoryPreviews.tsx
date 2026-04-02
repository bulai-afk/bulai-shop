import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

type Category = {
  name: string
  description: string
  image: string
  href: string
  /** Как у крупной карточки «Новинки»: жирный крупный заголовок и полное описание */
  featuredTitle?: boolean
}

const CATEGORIES: Category[] = [
  {
    name: 'Новинки',
    description: 'Тренды сезона и базовые вещи — уже в продаже, собирайте комплименты с первого дня',
    image:
      'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-01.jpg',
    href: '/catalog',
  },
  {
    name: 'Худи',
    description:
      'Худи и толстовки на каждый день — уже в продаже, мягкие и тёплые, садятся по фигуре и собирают комплименты с первого дня',
    image:
      'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-02.jpg',
    href: '/catalog',
    featuredTitle: true,
  },
  {
    name: 'Майки',
    description:
      'Майки и базовые футболки на каждый день — уже в продаже, садятся по фигуре и собирают комплименты с первого дня',
    image:
      'https://tailwindcss.com/plus-assets/img/ecommerce-images/category-page-02-image-card-06.jpg',
    href: '/catalog',
    featuredTitle: true,
  },
]

const cardShell =
  'group relative flex flex-col overflow-hidden rounded-2xl bg-gray-800 shadow-md ring-1 ring-white/10 transition hover:shadow-xl hover:shadow-black/40 hover:ring-white/20'

function CategoryCard({
  cat,
  variant,
}: {
  cat: Category
  variant: 'large' | 'horizontal'
}) {
  /** До `lg` крупная «Новинки» совпадает с горизонтальными карточками; сетка 2 колонки только на больших экранах. */
  const sizeClass =
    variant === 'large'
      ? 'aspect-[2/1] min-h-[140px] w-full sm:min-h-[180px] lg:aspect-[3/4] lg:min-h-[min(72vh,560px)] lg:max-h-[640px]'
      : 'aspect-[2/1] min-h-[140px] w-full sm:min-h-[180px] lg:aspect-auto lg:h-full lg:min-h-0'

  const paddingClass =
    variant === 'large' ? 'p-4 sm:p-5 lg:p-6 lg:p-8' : 'p-4 sm:p-5 lg:p-6'
  const heroTitle =
    'text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl'
  const heroDesc = 'mt-2 text-base/7 text-pretty text-white'
  const compactTitle = 'text-sm/7 font-semibold text-white sm:text-base/7'
  const compactDesc =
    'mt-1 line-clamp-3 text-sm/6 text-pretty text-white sm:mt-2 sm:text-base/7'
  const titleClass =
    variant === 'large' || cat.featuredTitle
      ? heroTitle
      : compactTitle
  const descClass =
    variant === 'large' || cat.featuredTitle
      ? heroDesc
      : compactDesc

  return (
    <Link to={cat.href} className={`${cardShell} ${sizeClass}`}>
      <img
        src={cat.image}
        alt=""
        className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-105"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
      />
      <div className={`relative z-10 mt-auto flex w-full flex-col ${paddingClass}`}>
        <h3 className={titleClass}>{cat.name}</h3>
        <p className={descClass}>{cat.description}</p>
        <span className="mt-2 inline-flex text-base/7 font-semibold text-white sm:mt-3">
          Смотреть
          <span aria-hidden className="ml-1 transition group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </Link>
  )
}

/** Блок категорий: крупная карточка + 2 горизонтальные рядом. */
export const CategoryPreviews = forwardRef<HTMLElement>(function CategoryPreviews(_, ref) {
  const [main, ...side] = CATEGORIES

  return (
    <section
      ref={ref}
      className="scroll-mt-[6.5rem] bg-gray-900 pb-10 pt-8 sm:pb-12 sm:pt-10 lg:pb-14 lg:pt-12"
      aria-labelledby="category-previews-heading"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-row items-end justify-between gap-3 sm:gap-4">
          <h2
            id="category-previews-heading"
            className="min-w-0 text-4xl font-semibold tracking-tight text-white sm:text-5xl"
          >
            Категории
          </h2>
          <Link
            to="/catalog"
            className="inline-flex shrink-0 items-center text-base/6 font-semibold text-indigo-400 transition hover:text-indigo-300"
          >
            Посетить каталог <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="mx-auto mt-3 w-full max-w-2xl sm:mt-4 lg:mt-5 lg:max-w-none">
          <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,52%)_minmax(0,48%)] lg:items-stretch lg:gap-5">
            <div className="min-h-0 min-w-0">
              <CategoryCard cat={main} variant="large" />
            </div>
            <div className="grid min-h-0 gap-3 lg:h-full lg:min-h-0 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:self-stretch">
              {side.map((cat) => (
                <CategoryCard key={cat.name} cat={cat} variant="horizontal" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
})
