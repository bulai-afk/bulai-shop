/** Формы черновиков настроек сайта и промо в админке (хранение в localStorage). */

import type { CatalogCategoryPromoSlug } from '../../constants/catalogCategoryPromo'

export type { CatalogCategoryPromoSlug }

export type SiteBrandForm = {
  logoUrl: string
  /** Пусто — цвет темы; иначе `#rrggbb`. Для картинки с прозрачностью — заливка через mask. */
  logoColor: string
  logoAlt: string
  logoHref: string
}

export type SiteContactForm = {
  phoneDisplay: string
  phoneTel: string
  email: string
  addressDisplay: string
}

/** Соцсеть: код иконки (vk, telegram, …), подпись и URL. */
export type SocialLinkForm = {
  id: string
  name: string
  href: string
}

export type SiteFooterForm = {
  legalEntityLine: string
  shopNameLine: string
}

export type SiteConfigForm = {
  brand: SiteBrandForm
  contact: SiteContactForm
  socialLinks: SocialLinkForm[]
  footer: SiteFooterForm
  /**
   * Id клиентов из раздела «Клиенты» с правом входа в админку.
   * Пустой список — доступ не ограничен (как раньше). Непустой — только совпадение по почте или телефону с карточкой клиента.
   */
  adminAccessClientIds: string[]
  /** Публичный OAuth client_id Яндекс ID для кнопки входа на витрине (из oauth.yandex.ru). */
  yandexOAuthClientId: string
}

/** Иконки блока «Почему мы» на главной (Heroicons). */
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

export type HomeFeaturesForm = {
  eyebrow: string
  title: string
  subtitle: string
  items: { name: string; description: string; iconId: PromoFeatureIconId }[]
}

/** Блок «Наши преимущества» на главной — в карточках картинки по URL, не иконки. */
export type HomeAdvantagesForm = {
  eyebrow: string
  title: string
  subtitle: string
  items: { name: string; description: string; imageUrl: string }[]
}

export type CategoryVisualPromoForm = {
  slug: CatalogCategoryPromoSlug
  displayName: string
  descriptionHome: string
  imageHome: string
  imageMegaMenu: string
  imageKeyDetails: string
  keyDetailsTitle: string
  keyDetailsBody: string
  featuredTitle: boolean
}

export type AboutMissionForm = {
  heading: string
  paragraph1: string
  paragraph2: string
  bannerImage: string
}

export type PromoValueIconId =
  | 'sparkles'
  | 'share'
  | 'academic'
  | 'lifebuoy'
  | 'shield'
  | 'moon'

export type AboutValueItemForm = {
  title: string
  text: string
  iconId: PromoValueIconId
}

export type AboutValuesForm = {
  heading: string
  subtitle: string
  items: AboutValueItemForm[]
}

export type CatalogKeyDetailsSectionForm = {
  heading: string
  lead: string
}

/** Вариант вёрстки hero (плюс зеркальный «скос» с фото слева). */
export type HomeHeroTemplateId = 'gradient' | 'splitLogo' | 'angledRight' | 'angledLeft'

/** Один полноэкранный hero на главной `/` (порядок в массиве = порядок при скролле). */
export type HomeHeroSlideForm = {
  template: HomeHeroTemplateId
  /** Логотип над текстом (шаблон «Split + логотип»). Пусто — запасной маркер. */
  logoUrl: string
  /** Боковое фото (split и скос). Пусто — демо-изображение по шаблону. */
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

export type PromoMaterialsForm = {
  tickerMessages: string[]
  homeHeroes: HomeHeroSlideForm[]
  aboutHero: {
    title: string
    description: string
    imageA: string
    imageB: string
    imageC: string
    imageD: string
    imageE: string
  }
  homeFeatures: HomeFeaturesForm
  homeAdvantages: HomeAdvantagesForm
  /** Порядок элементов = блок категорий на главной (первый — крупная карточка). */
  categoryVisuals: CategoryVisualPromoForm[]
  aboutMission: AboutMissionForm
  aboutValues: AboutValuesForm
  catalogKeyDetailsSection: CatalogKeyDetailsSectionForm
}

export type ProductCatalogRow = {
  id: string
  sku: string
  name: string
  description: string
  imageUrls: string[]
  recommendedProductIds: string[]
  size: string
  color: string
  /** Базовая цена в белорусских рублях (BYN), без скидки. */
  price: number
  /** Скидка в процентах, 0–100. Цена на витрине считается от `price` (BYN). */
  discountPercent: number
  /** Начало действия скидки, `YYYY-MM-DD`. Пусто — без ограничения снизу. */
  discountValidFrom: string
  /** Конец действия скидки, `YYYY-MM-DD`. Пусто — без ограничения сверху. */
  discountValidTo: string
  availability: 'in_stock' | 'out_of_stock' | 'preorder'
  attributes: Record<string, string>
}

/** Физический склад: учёт остатков по `id` в матрице. */
export type Warehouse = {
  id: string
  name: string
  /** Почтовый или фактический адрес. */
  address: string
}

/** Юридическое лицо — поставщик товаров (отдельно от складов). */
export type Supplier = {
  id: string
  name: string
  /** Юр. реквизиты, банк, ИНН и т.п. */
  requisites: string
  /** Оценка поставщика, 0–5. */
  rating: number
  /** Число записей в журнале поставок с этим поставщиком. */
  supplyCount: number
  /** Число записей в журнале «Брак» с этим поставщиком. */
  defectCount: number
}

/** Учёт по одному складу: поступления, расход по видам, остаток. */
export type WarehouseStockBreakdown = {
  receipts: number
  /** Заказы (отгрузка по заказу). */
  orders: number
  preorders: number
  defects: number
  stock: number
}

export type StockRow = {
  productId: string
  byWarehouse: Record<string, WarehouseStockBreakdown>
}

/** Строка поставки: товар и принятое количество. */
export type SupplyLine = {
  productId: string
  /** Целое число ≥ 0. */
  quantity: number
}

/** Запись о поставке: куда поступило (склад) и от кого (поставщик). */
export type SupplyRecord = {
  id: string
  warehouseId: string
  supplierId: string
  /** Дата поставки в формате YYYY-MM-DD. */
  date: string
  /** Номер накладной, УПД и т.п. */
  documentNumber: string
  /** Оценка поставки, целое 0–5 (звёзды в форме). */
  rating: number
  note: string
  lines: SupplyLine[]
}

/** Запись журнала брака — те же поля, что у поставки (склад, поставщик, позиции). */
export type DefectRecord = SupplyRecord

export type ProductsInventoryDraft = {
  catalog: ProductCatalogRow[]
  warehouses: Warehouse[]
  suppliers: Supplier[]
  stocks: StockRow[]
  /** Журнал поставок (вкладка «Поставки»). */
  supplies: SupplyRecord[]
  /** Журнал брака (вкладка «Брак»). */
  defectRecords: DefectRecord[]
}

export type ProductDictionaryRow = {
  id: string
  name: string
  values: ProductDictionaryValue[]
}

export type ProductDictionaryValue = {
  id: string
  value: string
  color: string
  /** Фото для мегаменю (справочник «Категория»). */
  imageUrl: string
  /** Slug для `/catalog?category=`; пусто — из названия (новинки → novinki и т.д.). */
  catalogSlug: string
}

export type ProductsDictionariesDraft = {
  dictionaries: ProductDictionaryRow[]
  skuSourceDictionaryIds: string[]
}
