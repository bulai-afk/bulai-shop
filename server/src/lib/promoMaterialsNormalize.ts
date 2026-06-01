/**
 * Нормализация JSON промо-материалов (согласовано с mergePromoMaterialsForm на клиенте).
 */

export type CatalogCategoryPromoSlug = 'novinki' | 'mayki' | 'rubashki' | 'bryuki'

export type PromoFeatureIconId =
  | 'truck'
  | 'shield'
  | 'refresh'
  | 'lock'
  | 'sparkles'
  | 'gift'
  | 'clock'
  | 'chat'
  | 'mapPin'
  | 'star'
  | 'heart'
  | 'bolt'
export type PromoValueIconId =
  | 'sparkles'
  | 'share'
  | 'academic'
  | 'lifebuoy'
  | 'shield'
  | 'moon'

export type HomeHeroTemplateJson = 'gradient' | 'splitLogo' | 'angledRight' | 'angledLeft'

export type HomeHeroSlideJson = {
  template: HomeHeroTemplateJson
  logoUrl: string
  imageUrl: string
  badgeText: string
  badgeLinkLabel: string
  badgeLinkHref: string
  title: string
  subtitle: string
  primaryCtaLabel: string
  primaryCtaHref: string
  secondaryCtaLabel: string
  secondaryCtaHref: string
}

export type PromoMaterialsJson = {
  tickerMessages: string[]
  homeHeroes: HomeHeroSlideJson[]
  aboutHero: {
    title: string
    description: string
    imageA: string
    imageB: string
    imageC: string
    imageD: string
    imageE: string
  }
  homeFeatures: {
    eyebrow: string
    title: string
    subtitle: string
    items: { name: string; description: string; iconId: PromoFeatureIconId }[]
  }
  homeAdvantages: {
    eyebrow: string
    title: string
    subtitle: string
    items: { name: string; description: string; imageUrl: string }[]
  }
  categoryVisuals: {
    slug: CatalogCategoryPromoSlug
    displayName: string
    descriptionHome: string
    imageHome: string
    imageMegaMenu: string
    imageKeyDetails: string
    keyDetailsTitle: string
    keyDetailsBody: string
    featuredTitle: boolean
  }[]
  aboutMission: {
    heading: string
    paragraph1: string
    paragraph2: string
    bannerImage: string
  }
  aboutValues: {
    heading: string
    subtitle: string
    items: { title: string; text: string; iconId: PromoValueIconId }[]
  }
  catalogKeyDetailsSection: {
    heading: string
    lead: string
  }
}

const CATEGORY_SLUGS: CatalogCategoryPromoSlug[] = ['novinki', 'rubashki', 'mayki', 'bryuki']
const FEATURE_ICONS: PromoFeatureIconId[] = [
  'truck',
  'shield',
  'refresh',
  'lock',
  'sparkles',
  'gift',
  'clock',
  'chat',
  'mapPin',
  'star',
  'heart',
  'bolt',
]
const VALUE_ICONS: PromoValueIconId[] = [
  'sparkles',
  'share',
  'academic',
  'lifebuoy',
  'shield',
  'moon',
]

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback
}

function iconFeature(v: unknown, fallback: PromoFeatureIconId): PromoFeatureIconId {
  return FEATURE_ICONS.includes(v as PromoFeatureIconId) ? (v as PromoFeatureIconId) : fallback
}

function iconValue(v: unknown, fallback: PromoValueIconId): PromoValueIconId {
  return VALUE_ICONS.includes(v as PromoValueIconId) ? (v as PromoValueIconId) : fallback
}

function defaultCategoryVisuals(): PromoMaterialsJson['categoryVisuals'] {
  return [
    {
      slug: 'novinki',
      displayName: 'Новинки',
      descriptionHome:
        'Тренды сезона и базовые вещи — уже в продаже, собирайте комплименты с первого дня',
      imageHome:
        'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-04-detail-product-shot-01.jpg',
      imageMegaMenu:
        'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-04-detail-product-shot-01.jpg',
      imageKeyDetails: '',
      keyDetailsTitle: '',
      keyDetailsBody: '',
      featuredTitle: false,
    },
    {
      slug: 'rubashki',
      displayName: 'Рубашки',
      descriptionHome:
        'Классика и современные крои — хлопок, лён и смесовые ткани для офиса и на каждый день',
      imageHome: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-01.jpg',
      imageMegaMenu: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-01.jpg',
      imageKeyDetails:
        'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-feature-06-detail-01.jpg',
      keyDetailsTitle: 'Рубашки: натуральные ткани и чистая посадка',
      keyDetailsBody:
        'Для рубашек выбираем комфортные составы: 100% лён, хлопок, вискоза. Ткань «дышит», держит форму и выглядит аккуратно в течение дня. Пошив заводской — ровная строчка, аккуратные швы и чистая обработка деталей.',
      featuredTitle: true,
    },
    {
      slug: 'mayki',
      displayName: 'Майки',
      descriptionHome:
        'Майки и базовые футболки на каждый день — уже в продаже, садятся по фигуре и собирают комплименты с первого дня',
      imageHome:
        'https://tailwindcss.com/plus-assets/img/ecommerce-images/category-page-02-image-card-06.jpg',
      imageMegaMenu:
        'https://tailwindcss.com/plus-assets/img/ecommerce-images/category-page-02-image-card-06.jpg',
      imageKeyDetails:
        'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-feature-06-detail-02.jpg',
      keyDetailsTitle: 'Майки: лёгкость и универсальность',
      keyDetailsBody:
        'База на каждый день: мягкие, приятные к телу материалы (лён/хлопок/вискоза), которые комфортно носятся и хорошо сочетаются с любыми низами. Универсальный размерный ряд и свободная посадка помогают собрать оверсайз-образ без лишних усилий.',
      featuredTitle: true,
    },
    {
      slug: 'bryuki',
      displayName: 'Брюки',
      descriptionHome:
        'Джинсы, чиносы и зауженные модели — подберём посадку под ваш силуэт и сезон',
      imageHome: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-02.jpg',
      imageMegaMenu: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-02.jpg',
      imageKeyDetails:
        'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-feature-06-detail-03.jpg',
      keyDetailsTitle: 'Брюки: посадка, которая работает',
      keyDetailsBody:
        'Удобный крой и продуманные посадки для повседневной носки. Материалы подбираем практичные и комфортные (хлопок/деним/смесовые), пошив заводской — рассчитан на активный ритм. Универсальный размерный ряд и оверсайз-силуэт (где уместно) дают свободу движений и современный вид.',
      featuredTitle: true,
    },
  ]
}

function defaultPromo(): PromoMaterialsJson {
  return {
    tickerMessages: [
      'Бесплатная доставка при заказе от 5 000 ₽',
      'Скидка 15% — промокод HELLO15',
      'Распродажа сезона: до −40% в каталоге',
      'Помощь с размером — в разделе «Контакты»',
    ],
    homeHeroes: [
      {
        template: 'gradient',
        logoUrl: '',
        imageUrl: '',
        badgeText: 'Новая коллекция уже в каталоге.',
        badgeLinkLabel: 'Смотреть',
        badgeLinkHref: '/catalog',
        title: 'Одежда для тех, кто идёт в ногу со временем',
        subtitle:
          'Актуальные модели, аккуратный сервис и доставка без лишней суеты. Поможем подобрать размер и собрать образ.',
        primaryCtaLabel: 'Посмотреть товары',
        primaryCtaHref: '/catalog',
        secondaryCtaLabel: 'О компании',
        secondaryCtaHref: '/about',
      },
    ],
    aboutHero: {
      title: 'Мы делаем ваш образ удобным',
      description:
        'BULAI — это удобная и стильная одежда из качественных материалов: лён, хлопок, вискоза и другие ткани, подобранные с заботой об экологии и комфорте к телу.',
      imageA:
        'https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&h=528&q=80',
      imageB:
        'https://images.unsplash.com/photo-1485217988980-11786ced9454?ixlib=rb-4.0.3&auto=format&fit=crop&h=528&q=80',
      imageC:
        'https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&auto=format&fit=crop&crop=focalpoint&fp-x=.4&w=396&h=528&q=80',
      imageD:
        'https://images.unsplash.com/photo-1670272504528-790c24957dda?ixlib=rb-4.0.3&auto=format&fit=crop&crop=left&w=400&h=528&q=80',
      imageE:
        'https://images.unsplash.com/photo-1670272505284-8faba1c31f7d?ixlib=rb-4.0.3&auto=format&fit=crop&h=528&q=80',
    },
    homeFeatures: {
      eyebrow: 'Почему мы',
      title: 'Покупать удобно — от выбора до получения',
      subtitle:
        'Актуальные модели и аккуратный сервис: держим в фокусе ваш комфорт, а не только витрину.',
      items: [
        {
          name: 'Доставка без суеты',
          description:
            'Отправляем по России удобными службами. Сроки и стоимость подскажем при оформлении — без лишних звонков. Помощь с размером — в контактах или при заказе.',
          iconId: 'truck',
        },
        {
          name: 'Качество материалов',
          description:
            'Подбираем ткани и фурнитуру у проверенных поставщиков: износостойкость, аккуратные швы и комфорт на коже — чтобы вещь служила долго и выглядела достойно.',
          iconId: 'shield',
        },
        {
          name: 'Обмен и возврат',
          description:
            'Если вещь не подошла, обсудим замену или возврат по правилам магазина — без давления и лишней бюрократии.',
          iconId: 'refresh',
        },
        {
          name: 'Безопасная оплата',
          description:
            'Готовим оплату онлайн картой и другими способами. Данные защищены — о сроках запуска сообщим отдельно.',
          iconId: 'lock',
        },
      ],
    },
    homeAdvantages: {
      eyebrow: '',
      title: 'Наши преимущества',
      subtitle: '',
      items: [
        {
          name: 'Бесплатная доставка',
          description:
            'Почтой России по России — бесплатно при заказе от 5 000 ₽. Трек-номер и ориентир по срокам отправим после подтверждения.',
          imageUrl:
            'https://tailwindcss.com/plus-assets/img/ecommerce/icons/icon-delivery-light.svg',
        },
        {
          name: 'Возврат',
          description:
            'Если размер или модель не подошли — обмен или возврат по правилам магазина в течение 14 дней. Подскажем шаги в поддержке.',
          imageUrl:
            'https://tailwindcss.com/plus-assets/img/ecommerce/icons/icon-returns-light.svg',
        },
        {
          name: 'Гарантии',
          description:
            'На товары действует гарантия на скрытые дефекты: при заводском браке поможем с заменой или возвратом по регламенту.',
          imageUrl:
            'https://tailwindcss.com/plus-assets/img/ecommerce/icons/icon-warranty-light.svg',
        },
        {
          name: 'Экологически чистые товары',
          description:
            'Выбираем материалы и партнёров с меньшим воздействием на среду — осознанное производство и честный состав.',
          imageUrl:
            'https://tailwindcss.com/plus-assets/img/ecommerce/icons/icon-planet-light.svg',
        },
      ],
    },
    categoryVisuals: defaultCategoryVisuals(),
    aboutMission: {
      heading: 'Наша миссия',
      paragraph1:
        'Наша миссия проста: давать вам качественный, экологически чистый товар по доступной цене. Мы считаем, что натуральные ткани, аккуратный пошив и честный состав не должны быть роскошью — их можно носить каждый день без переплаты за лишний шум вокруг бренда.',
      paragraph2:
        'Отбираем поставщиков и модели с упором на лён, хлопок и безопасные для кожи материалы, проверяем соотношение цены и качества и держим ассортимент понятным: вы видите, за что платите, и получаете вещь, которой не стыдно пользоваться долго.',
      bannerImage:
        'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?ixlib=rb-4.0.3&auto=format&fit=crop&w=2832&q=80',
    },
    aboutValues: {
      heading: 'Наши ценности',
      subtitle: 'Принципы, на которых держится команда и сервис — от склада до поддержки.',
      items: [
        {
          title: 'Быть лучшими в своём деле',
          text: 'Качество пошива, честные материалы и внимание к деталям — то, за что нас выбирают. Мы не идём на компромиссы там, где это заметно в носке.',
          iconId: 'sparkles',
        },
        {
          title: 'Делиться опытом',
          text: 'Рассказываем о составах, посадке и уходе за вещами — чтобы вы покупали осознанно и носили дольше.',
          iconId: 'share',
        },
        {
          title: 'Постоянно учиться',
          text: 'Следим за трендами и обратной связью клиентов, обновляем каталог и улучшаем сервис.',
          iconId: 'academic',
        },
        {
          title: 'Поддерживать',
          text: 'Помогаем с размером, доставкой и возвратом. Команда поддержки на связи, если что-то пошло не так.',
          iconId: 'lifebuoy',
        },
        {
          title: 'Брать ответственность',
          text: 'Признаём ошибки и исправляем их. Прозрачные условия заказа и оплаты — без сюрпризов.',
          iconId: 'shield',
        },
        {
          title: 'Ценить отдых',
          text: 'Сбалансированный ритм команды — залог вдумчивых решений и тёплого общения с вами.',
          iconId: 'moon',
        },
      ],
    },
    catalogKeyDetailsSection: {
      heading: 'Ключевые детали',
      lead: 'Коротко и по делу: материалы, пошив и посадка — то, что важно при выборе одежды.',
    },
  }
}

function mergeCategoryVisuals(raw: unknown): PromoMaterialsJson['categoryVisuals'] {
  const base = defaultCategoryVisuals()
  const bySlug = new Map<CatalogCategoryPromoSlug, (typeof base)[number]>()
  for (const row of base) bySlug.set(row.slug, { ...row })

  if (!Array.isArray(raw)) return base

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Partial<(typeof base)[number]>
    const slug = o.slug
    if (!CATEGORY_SLUGS.includes(slug as CatalogCategoryPromoSlug)) continue
    const s = slug as CatalogCategoryPromoSlug
    const prev = bySlug.get(s) ?? base.find((r) => r.slug === s)!
    bySlug.set(s, {
      slug: s,
      displayName: str(o.displayName, prev.displayName),
      descriptionHome: str(o.descriptionHome, prev.descriptionHome),
      imageHome: str(o.imageHome, prev.imageHome),
      imageMegaMenu: str(o.imageMegaMenu, prev.imageMegaMenu),
      imageKeyDetails: str(o.imageKeyDetails, prev.imageKeyDetails),
      keyDetailsTitle: str(o.keyDetailsTitle, prev.keyDetailsTitle),
      keyDetailsBody: str(o.keyDetailsBody, prev.keyDetailsBody),
      featuredTitle: typeof o.featuredTitle === 'boolean' ? o.featuredTitle : prev.featuredTitle,
    })
  }

  const ordered: PromoMaterialsJson['categoryVisuals'] = []
  const seen = new Set<CatalogCategoryPromoSlug>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const slug = (item as { slug?: unknown }).slug
    if (!CATEGORY_SLUGS.includes(slug as CatalogCategoryPromoSlug)) continue
    const s = slug as CatalogCategoryPromoSlug
    if (seen.has(s)) continue
    seen.add(s)
    ordered.push(bySlug.get(s)!)
  }
  for (const row of base) {
    if (!seen.has(row.slug)) ordered.push(bySlug.get(row.slug)!)
  }
  return ordered
}

function itemHasPhotoCard(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false
  const u = (item as { imageUrl?: unknown }).imageUrl
  return typeof u === 'string' && u.trim().length > 0
}

function itemLooksLikeIconOnlyCard(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false
  const o = item as { iconId?: unknown; imageUrl?: unknown }
  if (typeof o.iconId !== 'string' || !FEATURE_ICONS.includes(o.iconId as PromoFeatureIconId)) {
    return false
  }
  if (typeof o.imageUrl === 'string' && o.imageUrl.trim().length > 0) return false
  return true
}

function getPromoItemsArray(block: unknown): unknown[] {
  if (!block || typeof block !== 'object') return []
  const items = (block as { items?: unknown }).items
  return Array.isArray(items) ? items : []
}

/** См. mergePromoMaterialsForm на клиенте — те же правила миграции сырого JSON. */
function migrateHomePromoBlocksRaw(raw: Record<string, unknown>): void {
  const hf = raw.homeFeatures
  const ha = raw.homeAdvantages
  const hfItems = getPromoItemsArray(hf)
  const haItems = getPromoItemsArray(ha)

  if (
    itemHasPhotoCard(hfItems[0]) &&
    itemLooksLikeIconOnlyCard(haItems[0]) &&
    !itemHasPhotoCard(haItems[0])
  ) {
    raw.homeFeatures = ha
    raw.homeAdvantages = hf
    return
  }

  if (itemHasPhotoCard(hfItems[0]) && haItems.length === 0) {
    raw.homeAdvantages = hf
    delete raw.homeFeatures
  }
}

function mergeHomeFeaturesSection(
  raw: unknown,
  base: PromoMaterialsJson['homeFeatures'],
): PromoMaterialsJson['homeFeatures'] {
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<PromoMaterialsJson['homeFeatures']>
  const rawItems = Array.isArray(r.items) ? r.items : []
  const items = base.items.map((def, i) => {
    const it = rawItems[i]
    if (!it || typeof it !== 'object') return def
    const o = it as { name?: unknown; description?: unknown; iconId?: unknown }
    return {
      name: str(o.name, def.name),
      description: str(o.description, def.description),
      iconId: iconFeature(o.iconId, def.iconId),
    }
  })
  return {
    eyebrow: str(r.eyebrow, base.eyebrow),
    title: str(r.title, base.title),
    subtitle: str(r.subtitle, base.subtitle),
    items: items.length > 0 ? items : base.items,
  }
}

function mergeHomeAdvantagesSection(
  raw: unknown,
  base: PromoMaterialsJson['homeAdvantages'],
): PromoMaterialsJson['homeAdvantages'] {
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<PromoMaterialsJson['homeAdvantages']>
  const rawItems = Array.isArray(r.items) ? r.items : []
  const items = base.items.map((def, i) => {
    const it = rawItems[i]
    if (!it || typeof it !== 'object') return def
    const o = it as { name?: unknown; description?: unknown; imageUrl?: unknown }
    return {
      name: str(o.name, def.name),
      description: str(o.description, def.description),
      imageUrl: str(o.imageUrl, def.imageUrl),
    }
  })
  return {
    eyebrow: str(r.eyebrow, base.eyebrow),
    title: str(r.title, base.title),
    subtitle: str(r.subtitle, base.subtitle),
    items: items.length > 0 ? items : base.items,
  }
}

const HOME_HERO_TEMPLATE_JSON: readonly HomeHeroTemplateJson[] = [
  'gradient',
  'splitLogo',
  'angledRight',
  'angledLeft',
]

function mergeHomeHeroTemplateJson(v: unknown, fallback: HomeHeroTemplateJson): HomeHeroTemplateJson {
  return typeof v === 'string' && HOME_HERO_TEMPLATE_JSON.includes(v as HomeHeroTemplateJson)
    ? (v as HomeHeroTemplateJson)
    : fallback
}

function mergeHomeHeroSlideJson(
  raw: unknown,
  base: HomeHeroSlideJson,
): HomeHeroSlideJson {
  if (!raw || typeof raw !== 'object') return base
  const ho = raw as Partial<HomeHeroSlideJson> & { titleLine1?: string; titleLine2?: string }
  const mergedTitle =
    (typeof ho.title === 'string' && ho.title.trim()) ||
    [ho.titleLine1, ho.titleLine2].filter((x): x is string => typeof x === 'string').join(' ').trim() ||
    base.title
  return {
    template: mergeHomeHeroTemplateJson(ho.template, base.template),
    logoUrl: str(ho.logoUrl, base.logoUrl),
    imageUrl: str(ho.imageUrl, base.imageUrl),
    badgeText: str(ho.badgeText, base.badgeText),
    badgeLinkLabel: str(ho.badgeLinkLabel, base.badgeLinkLabel),
    badgeLinkHref: str(ho.badgeLinkHref, base.badgeLinkHref),
    title: mergedTitle,
    subtitle: str(ho.subtitle, base.subtitle),
    primaryCtaLabel: str(ho.primaryCtaLabel, base.primaryCtaLabel),
    primaryCtaHref: str(ho.primaryCtaHref, base.primaryCtaHref),
    secondaryCtaLabel: str(ho.secondaryCtaLabel, base.secondaryCtaLabel),
    secondaryCtaHref: str(ho.secondaryCtaHref, base.secondaryCtaHref),
  }
}

function mergeHomeHeroesNormalized(
  rawInput: unknown,
  base: PromoMaterialsJson,
): HomeHeroSlideJson[] {
  const baseSlides = base.homeHeroes
  const firstBase = baseSlides[0]
  if (!firstBase) return defaultPromo().homeHeroes
  if (!rawInput || typeof rawInput !== 'object') return baseSlides
  const raw = rawInput as Record<string, unknown>

  const arr = raw.homeHeroes
  if (Array.isArray(arr)) {
    if (arr.length === 0) {
      const legacy = raw.homeHero
      if (legacy && typeof legacy === 'object') {
        return [mergeHomeHeroSlideJson(legacy, firstBase)]
      }
      return baseSlides
    }
    return arr.map((item, i) => mergeHomeHeroSlideJson(item, baseSlides[i] ?? firstBase))
  }

  const legacy = raw.homeHero
  if (legacy && typeof legacy === 'object') {
    return [mergeHomeHeroSlideJson(legacy, firstBase)]
  }

  return baseSlides
}

export function normalizePromoMaterials(input: unknown): PromoMaterialsJson {
  if (input && typeof input === 'object') {
    migrateHomePromoBlocksRaw(input as Record<string, unknown>)
  }
  if (!input || typeof input !== 'object') return defaultPromo()
  const raw = input as Partial<PromoMaterialsJson> & {
    homeHero?: unknown
    homeHeroes?: unknown
  }
  const base = defaultPromo()

  const ao = (raw.aboutHero ?? {}) as Partial<PromoMaterialsJson['aboutHero']>

  const homeFeatures = mergeHomeFeaturesSection(raw.homeFeatures, base.homeFeatures)
  const homeAdvantages = mergeHomeAdvantagesSection(raw.homeAdvantages, base.homeAdvantages)

  const avBase = base.aboutValues
  let aboutValues = avBase
  const rawAv = raw.aboutValues
  if (rawAv && typeof rawAv === 'object') {
    const r = rawAv as Partial<PromoMaterialsJson['aboutValues']>
    const rawItems = Array.isArray(r.items) ? r.items : []
    const items = avBase.items.map((def, i) => {
      const it = rawItems[i]
      if (!it || typeof it !== 'object') return def
      const o = it as { title?: unknown; text?: unknown; iconId?: unknown }
      return {
        title: str(o.title, def.title),
        text: str(o.text, def.text),
        iconId: iconValue(o.iconId, def.iconId),
      }
    })
    aboutValues = {
      heading: str(r.heading, avBase.heading),
      subtitle: str(r.subtitle, avBase.subtitle),
      items: items.length > 0 ? items : avBase.items,
    }
  }

  const amBase = base.aboutMission
  let aboutMission = amBase
  const rawAm = raw.aboutMission
  if (rawAm && typeof rawAm === 'object') {
    const r = rawAm as Partial<PromoMaterialsJson['aboutMission']>
    aboutMission = {
      heading: str(r.heading, amBase.heading),
      paragraph1: str(r.paragraph1, amBase.paragraph1),
      paragraph2: str(r.paragraph2, amBase.paragraph2),
      bannerImage: str(r.bannerImage, amBase.bannerImage),
    }
  }

  const ckBase = base.catalogKeyDetailsSection
  let catalogKeyDetailsSection = ckBase
  const rawCk = raw.catalogKeyDetailsSection
  if (rawCk && typeof rawCk === 'object') {
    const r = rawCk as Partial<PromoMaterialsJson['catalogKeyDetailsSection']>
    catalogKeyDetailsSection = {
      heading: str(r.heading, ckBase.heading),
      lead: str(r.lead, ckBase.lead),
    }
  }

  return {
    tickerMessages: Array.isArray(raw.tickerMessages)
      ? raw.tickerMessages.filter((t): t is string => typeof t === 'string')
      : base.tickerMessages,
    homeHeroes: mergeHomeHeroesNormalized(raw, base),
    aboutHero: {
      title: str(ao.title, base.aboutHero.title),
      description: str(ao.description, base.aboutHero.description),
      imageA: str(ao.imageA, base.aboutHero.imageA),
      imageB: str(ao.imageB, base.aboutHero.imageB),
      imageC: str(ao.imageC, base.aboutHero.imageC),
      imageD: str(ao.imageD, base.aboutHero.imageD),
      imageE: str(ao.imageE, base.aboutHero.imageE),
    },
    homeFeatures,
    homeAdvantages,
    categoryVisuals: mergeCategoryVisuals(raw.categoryVisuals),
    aboutMission,
    aboutValues,
    catalogKeyDetailsSection,
  }
}
