import { STORE_EMAIL, STORE_SOCIAL_LINKS } from '../../constants/storeContact'
import type {
  CategoryVisualPromoForm,
  HomeHeroSlideForm,
  ProductsDictionariesDraft,
  ProductsInventoryDraft,
  PromoMaterialsForm,
  SiteConfigForm,
  SupplyRecord,
} from '../types/siteSettings'

/** Сообщения как в `DeliveryPromoBar` — аналог `PromoMaterials.tickerMessages`. */
const DEFAULT_TICKER_MESSAGES = [
  'Бесплатная доставка при заказе от 5 000 ₽',
  'Скидка 15% — промокод HELLO15',
  'Распродажа сезона: до −40% в каталоге',
  'Помощь с размером — в разделе «Контакты»',
] as const

const socialIdByName: Record<string, string> = {
  VK: 'vk',
  Telegram: 'telegram',
  YouTube: 'youtube',
}

export function buildDefaultSiteConfig(): SiteConfigForm {
  const year = new Date().getFullYear()
  return {
    brand: {
      logoUrl: '',
      logoColor: '',
      logoAlt: 'Bulai Shop',
      logoHref: '/',
    },
    contact: {
      phoneDisplay: '',
      phoneTel: '',
      email: STORE_EMAIL,
      addressDisplay: '',
    },
    socialLinks: STORE_SOCIAL_LINKS.map((l) => ({
      id: socialIdByName[l.name] ?? l.name.toLowerCase().replace(/\s+/g, '_'),
      name: l.name,
      href: l.href === '#' ? '' : l.href,
    })),
    footer: {
      legalEntityLine: 'ИП Булыга Александр Игоревич',
      shopNameLine: `© ${year} Интернет-магазин bulai.by`,
    },
    adminAccessClientIds: [],
    yandexOAuthClientId: '',
  }
}

const IMG = {
  homeNovinki:
    'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-04-detail-product-shot-01.jpg',
  homeRubashki: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-01.jpg',
  homeMayki: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/category-page-02-image-card-06.jpg',
  homeBryuki: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-02.jpg',
  megaNovinki:
    'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-page-04-detail-product-shot-01.jpg',
  megaMayki: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/category-page-02-image-card-06.jpg',
  megaRubashki: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-01.jpg',
  megaBryuki: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/mega-menu-category-02.jpg',
  keyRubashki: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-feature-06-detail-01.jpg',
  keyMayki: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-feature-06-detail-02.jpg',
  keyBryuki: 'https://tailwindcss.com/plus-assets/img/ecommerce-images/product-feature-06-detail-03.jpg',
} as const

export function buildDefaultCategoryVisuals(): CategoryVisualPromoForm[] {
  const rows: CategoryVisualPromoForm[] = [
    {
      slug: 'novinki',
      displayName: 'Новинки',
      descriptionHome:
        'Тренды сезона и базовые вещи — уже в продаже, собирайте комплименты с первого дня',
      imageHome: IMG.homeNovinki,
      imageMegaMenu: IMG.megaNovinki,
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
      imageHome: IMG.homeRubashki,
      imageMegaMenu: IMG.megaRubashki,
      imageKeyDetails: IMG.keyRubashki,
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
      imageHome: IMG.homeMayki,
      imageMegaMenu: IMG.megaMayki,
      imageKeyDetails: IMG.keyMayki,
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
      imageHome: IMG.homeBryuki,
      imageMegaMenu: IMG.megaBryuki,
      imageKeyDetails: IMG.keyBryuki,
      keyDetailsTitle: 'Брюки: посадка, которая работает',
      keyDetailsBody:
        'Удобный крой и продуманные посадки для повседневной носки. Материалы подбираем практичные и комфортные (хлопок/деним/смесовые), пошив заводской — рассчитан на активный ритм. Универсальный размерный ряд и оверсайз-силуэт (где уместно) дают свободу движений и современный вид.',
      featuredTitle: true,
    },
  ]
  return rows
}

export function createDefaultHomeHeroSlide(): HomeHeroSlideForm {
  return {
    template: 'gradient',
    logoUrl: '',
    imageUrl: '',
    badgeText: 'Новая коллекция уже в каталоге.',
    badgeLinkLabel: 'Смотреть',
    badgeLinkHref: '/catalog',
    title: 'Одежда для тех, кто идёт в ногу со временем',
    subtitle:
      'Актуальные модели, аккуратный сервис и доставка без лишней суеты. Поможем подобрать размер и собрать образ. Скоро — личный кабинет и оплата онлайн.',
    primaryCtaLabel: 'Посмотреть товары',
    primaryCtaHref: '/catalog',
    secondaryCtaLabel: 'О компании',
    secondaryCtaHref: '/about',
  }
}

export function buildDefaultPromoMaterials(): PromoMaterialsForm {
  return {
    tickerMessages: [...DEFAULT_TICKER_MESSAGES],
    homeHeroes: [createDefaultHomeHeroSlide()],
    aboutHero: {
      title: 'Мы делаем ваш образ удобным',
      description:
        'BULAI — это удобная и стильная одежда из качественных материалов: лён, хлопок, вискоза и другие ткани, подобранные с заботой об экологии и комфорте к телу. Комфортный крой и лаконичный дизайн — чтобы образ собирался быстро и смотрелся дорого без лишних усилий. Честные описания и аккуратный пошив — чтобы вы носили вещи долго и с удовольствием, а не «на один сезон».',
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
    categoryVisuals: buildDefaultCategoryVisuals(),
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

export function buildDefaultProductsInventory(): ProductsInventoryDraft {
  const warehouses = [
    {
      id: 'msk-main',
      name: 'Москва, основной',
      address: 'ул. Складская, 1',
    },
    {
      id: 'spb-2',
      name: 'Санкт-Петербург',
      address: 'пр. Логистический, 12',
    },
    {
      id: 'minsk',
      name: 'Минск',
      address: 'ул. Промышленная, 5',
    },
  ]
  const suppliers = [
    {
      id: 'sup-msk-main',
      name: 'ООО «Пошив хоум»',
      requisites: 'ИНН 7701001001, КПП 770101001, р/с 40702810…',
      rating: 5,
      supplyCount: 1,
      defectCount: 0,
    },
    {
      id: 'sup-spb-2',
      name: 'ИП Иванов А.С.',
      requisites: 'ИНН 7802002002, р/с 40802810…',
      rating: 4,
      supplyCount: 1,
      defectCount: 0,
    },
    {
      id: 'sup-minsk',
      name: 'ООО «БелСнаб»',
      requisites: 'УНП 123456789, ОАО «Банк»',
      rating: 3,
      supplyCount: 0,
      defectCount: 0,
    },
  ]
  const catalog = [
    {
      id: 'hoodie-oversize',
      sku: 'HD-OVR-001',
      name: 'Худи оверсайз',
      description:
        'Тёплое худи с мягким внутренним слоем. Универсальный крой и аккуратные швы — удобно носить каждый день.',
      imageUrls: [
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80',
      ],
      recommendedProductIds: ['tee-basic'],
      size: 'L',
      color: 'Черный',
      price: 12990,
      discountPercent: 0,
      discountValidFrom: '',
      discountValidTo: '',
      availability: 'in_stock' as const,
      attributes: {
        category: 'Худи',
        fit: 'Oversize',
        material: 'Хлопок',
        season: 'Осень',
      },
    },
    {
      id: 'tee-basic',
      sku: 'TS-BSC-002',
      name: 'Футболка базовая',
      description: 'Базовая футболка из плотного хлопка. Нейтральный силуэт, подходит под любой низ.',
      imageUrls: [
        'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=600&q=80',
      ],
      recommendedProductIds: ['hoodie-oversize'],
      size: 'M',
      color: 'Белый',
      price: 4990,
      discountPercent: 0,
      discountValidFrom: '',
      discountValidTo: '',
      availability: 'in_stock' as const,
      attributes: {
        category: 'Футболки',
        fit: 'Regular',
        material: 'Хлопок',
        season: 'Лето',
      },
    },
    {
      id: 'shirt-relaxed',
      sku: 'SH-RLX-003',
      name: 'Рубашка relaxed',
      description: 'Рубашка в расслабленной посадке из лёгкого льна. Хорошо смотрится и с брюками, и с шортами.',
      imageUrls: [
        'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=600&q=80',
      ],
      recommendedProductIds: [],
      size: 'XL',
      color: 'Олива',
      price: 8990,
      discountPercent: 0,
      discountValidFrom: '',
      discountValidTo: '',
      availability: 'preorder' as const,
      attributes: {
        category: 'Рубашки',
        fit: 'Relaxed',
        material: 'Лен',
        season: 'Весна',
      },
    },
  ]
  const z = (receipts: number, orders: number, preorders: number, defects: number, stock: number) => ({
    receipts,
    orders,
    preorders,
    defects,
    stock,
  })
  const supplies: SupplyRecord[] = [
    {
      id: 'sup-demo-1',
      warehouseId: 'msk-main',
      supplierId: 'sup-msk-main',
      date: '2026-01-18',
      documentNumber: 'УПД-1042',
      rating: 5,
      note: '',
      lines: [
        { productId: 'hoodie-oversize', quantity: 12 },
        { productId: 'tee-basic', quantity: 30 },
      ],
    },
    {
      id: 'sup-demo-2',
      warehouseId: 'spb-2',
      supplierId: 'sup-spb-2',
      date: '2026-02-02',
      documentNumber: 'Счёт 88',
      rating: 4,
      note: 'Частичная отгрузка',
      lines: [{ productId: 'shirt-relaxed', quantity: 6 }],
    },
  ]

  const stocks = [
    {
      productId: 'hoodie-oversize',
      byWarehouse: {
        'msk-main': z(24, 7, 2, 1, 18),
        'spb-2': z(12, 3, 1, 1, 7),
        minsk: z(6, 1, 0, 1, 4),
      },
    },
    {
      productId: 'tee-basic',
      byWarehouse: {
        'msk-main': z(50, 12, 4, 2, 35),
        'spb-2': z(18, 4, 1, 1, 12),
        minsk: z(12, 2, 0, 1, 9),
      },
    },
    {
      productId: 'shirt-relaxed',
      byWarehouse: {
        'msk-main': z(8, 2, 0, 1, 5),
        'spb-2': z(2, 1, 0, 1, 0),
        minsk: z(4, 1, 0, 1, 2),
      },
    },
  ]
  return { warehouses, suppliers, catalog, stocks, supplies, defectRecords: [] }
}

export function buildDefaultProductsDictionaries(): ProductsDictionariesDraft {
  return {
    skuSourceDictionaryIds: ['category', 'size', 'color'],
    dictionaries: [
      {
        id: 'category',
        name: 'Категория',
        values: [
          {
            id: 'category-1',
            value: 'Новинки',
            color: '',
            imageUrl: IMG.megaNovinki,
            catalogSlug: 'novinki',
          },
          {
            id: 'category-2',
            value: 'Майки',
            color: '',
            imageUrl: IMG.megaMayki,
            catalogSlug: 'mayki',
          },
          {
            id: 'category-3',
            value: 'Рубашки',
            color: '',
            imageUrl: IMG.megaRubashki,
            catalogSlug: 'rubashki',
          },
          {
            id: 'category-4',
            value: 'Брюки',
            color: '',
            imageUrl: IMG.megaBryuki,
            catalogSlug: 'bryuki',
          },
        ],
      },
      {
        id: 'size',
        name: 'Размер',
        values: [
          { id: 'size-1', value: 'XS', color: '', imageUrl: '', catalogSlug: '' },
          { id: 'size-2', value: 'S', color: '', imageUrl: '', catalogSlug: '' },
          { id: 'size-3', value: 'M', color: '', imageUrl: '', catalogSlug: '' },
          { id: 'size-4', value: 'L', color: '', imageUrl: '', catalogSlug: '' },
          { id: 'size-5', value: 'XL', color: '', imageUrl: '', catalogSlug: '' },
        ],
      },
      {
        id: 'color',
        name: 'Цвет',
        values: [
          { id: 'color-1', value: 'Черный', color: '', imageUrl: '', catalogSlug: '' },
          { id: 'color-2', value: 'Белый', color: '', imageUrl: '', catalogSlug: '' },
          { id: 'color-3', value: 'Серый', color: '', imageUrl: '', catalogSlug: '' },
          { id: 'color-4', value: 'Синий', color: '', imageUrl: '', catalogSlug: '' },
        ],
      },
      {
        id: 'fit',
        name: 'Посадка',
        values: [
          { id: 'fit-1', value: 'Slim', color: '', imageUrl: '', catalogSlug: '' },
          { id: 'fit-2', value: 'Regular', color: '', imageUrl: '', catalogSlug: '' },
          { id: 'fit-3', value: 'Oversize', color: '', imageUrl: '', catalogSlug: '' },
        ],
      },
      {
        id: 'material',
        name: 'Материал',
        values: [
          { id: 'material-1', value: 'Хлопок', color: '', imageUrl: '', catalogSlug: '' },
          { id: 'material-2', value: 'Лен', color: '', imageUrl: '', catalogSlug: '' },
          { id: 'material-3', value: 'Вискоза', color: '', imageUrl: '', catalogSlug: '' },
        ],
      },
      {
        id: 'season',
        name: 'Сезон',
        values: [
          { id: 'season-1', value: 'Весна', color: '', imageUrl: '', catalogSlug: '' },
          { id: 'season-2', value: 'Лето', color: '', imageUrl: '', catalogSlug: '' },
          { id: 'season-3', value: 'Осень', color: '', imageUrl: '', catalogSlug: '' },
          { id: 'season-4', value: 'Зима', color: '', imageUrl: '', catalogSlug: '' },
        ],
      },
      {
        id: 'availability',
        name: 'Наличие',
        values: [
          { id: 'availability-1', value: 'В наличии', color: '', imageUrl: '', catalogSlug: '' },
          { id: 'availability-2', value: 'Нет в наличии', color: '', imageUrl: '', catalogSlug: '' },
          { id: 'availability-3', value: 'Предзаказ', color: '', imageUrl: '', catalogSlug: '' },
        ],
      },
    ],
  }
}
