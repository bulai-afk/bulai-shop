import { buildDefaultPromoMaterials, buildDefaultCategoryVisuals } from '../admin/data/siteSettingsDefaults'
import type { CatalogCategoryPromoSlug } from '../constants/catalogCategoryPromo'
import type {
  AboutMissionForm,
  AboutValuesForm,
  AboutValueItemForm,
  CatalogKeyDetailsSectionForm,
  CategoryVisualPromoForm,
  HomeAdvantagesForm,
  HomeFeaturesForm,
  HomeHeroSlideForm,
  HomeHeroTemplateId,
  PromoFeatureIconId,
  PromoMaterialsForm,
  PromoValueIconId,
} from '../admin/types/siteSettings'

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
const CATEGORY_SLUGS: CatalogCategoryPromoSlug[] = ['novinki', 'rubashki', 'mayki', 'bryuki']

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback
}

function iconFeature(v: unknown, fallback: PromoFeatureIconId): PromoFeatureIconId {
  return FEATURE_ICONS.includes(v as PromoFeatureIconId) ? (v as PromoFeatureIconId) : fallback
}

function iconValue(v: unknown, fallback: PromoValueIconId): PromoValueIconId {
  return VALUE_ICONS.includes(v as PromoValueIconId) ? (v as PromoValueIconId) : fallback
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

function getItemsArray(block: unknown): unknown[] {
  if (!block || typeof block !== 'object') return []
  const items = (block as { items?: unknown }).items
  return Array.isArray(items) ? items : []
}

/**
 * В сырых данных иногда перепутаны ключи: фото лежат в homeFeatures, иконки — в homeAdvantages.
 * Тогда на главной под «Почему мы» оказывается второй компонент (картинки), а тексты не совпадают с админкой.
 */
function migrateHomePromoBlocksRaw(raw: Record<string, unknown>): void {
  const hf = raw.homeFeatures
  const ha = raw.homeAdvantages
  const hfItems = getItemsArray(hf)
  const haItems = getItemsArray(ha)

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

function mergeCategoryVisuals(raw: unknown): CategoryVisualPromoForm[] {
  const base = buildDefaultCategoryVisuals()
  const bySlug = new Map<CatalogCategoryPromoSlug, CategoryVisualPromoForm>()
  for (const row of base) bySlug.set(row.slug, { ...row })

  if (!Array.isArray(raw)) return base

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Partial<CategoryVisualPromoForm>
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

  /** Сохраняем порядок из raw, затем добиваем недостающие slug из base. */
  const ordered: CategoryVisualPromoForm[] = []
  const seen = new Set<CatalogCategoryPromoSlug>()
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue
      const slug = (item as { slug?: unknown }).slug
      if (!CATEGORY_SLUGS.includes(slug as CatalogCategoryPromoSlug)) continue
      const s = slug as CatalogCategoryPromoSlug
      if (seen.has(s)) continue
      seen.add(s)
      ordered.push(bySlug.get(s)!)
    }
  }
  for (const row of base) {
    if (!seen.has(row.slug)) ordered.push(bySlug.get(row.slug)!)
  }
  return ordered
}

function mergeHomeFeatures(raw: unknown, base: HomeFeaturesForm): HomeFeaturesForm {
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<HomeFeaturesForm>
  const itemsBase = base.items
  const rawItems = Array.isArray(r.items) ? r.items : []
  const items = itemsBase.map((def, i) => {
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

function mergeHomeAdvantages(raw: unknown, base: HomeAdvantagesForm): HomeAdvantagesForm {
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<HomeAdvantagesForm>
  const itemsBase = base.items
  const rawItems = Array.isArray(r.items) ? r.items : []
  const items = itemsBase.map((def, i) => {
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

function mergeAboutMission(raw: unknown, base: AboutMissionForm): AboutMissionForm {
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<AboutMissionForm>
  return {
    heading: str(r.heading, base.heading),
    paragraph1: str(r.paragraph1, base.paragraph1),
    paragraph2: str(r.paragraph2, base.paragraph2),
    bannerImage: str(r.bannerImage, base.bannerImage),
  }
}

function mergeAboutValues(raw: unknown, base: AboutValuesForm): AboutValuesForm {
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<AboutValuesForm>
  const rawItems = Array.isArray(r.items) ? r.items : []
  const items: AboutValueItemForm[] = base.items.map((def, i) => {
    const it = rawItems[i]
    if (!it || typeof it !== 'object') return def
    const o = it as { title?: unknown; text?: unknown; iconId?: unknown }
    return {
      title: str(o.title, def.title),
      text: str(o.text, def.text),
      iconId: iconValue(o.iconId, def.iconId),
    }
  })
  return {
    heading: str(r.heading, base.heading),
    subtitle: str(r.subtitle, base.subtitle),
    items: items.length > 0 ? items : base.items,
  }
}

function mergeCatalogKeyDetailsSection(
  raw: unknown,
  base: CatalogKeyDetailsSectionForm,
): CatalogKeyDetailsSectionForm {
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<CatalogKeyDetailsSectionForm>
  return {
    heading: str(r.heading, base.heading),
    lead: str(r.lead, base.lead),
  }
}

const HOME_HERO_TEMPLATES: readonly HomeHeroTemplateId[] = [
  'gradient',
  'splitLogo',
  'angledRight',
  'angledLeft',
]

function mergeHomeHeroTemplate(v: unknown, fallback: HomeHeroTemplateId): HomeHeroTemplateId {
  return typeof v === 'string' && HOME_HERO_TEMPLATES.includes(v as HomeHeroTemplateId)
    ? (v as HomeHeroTemplateId)
    : fallback
}

function mergeHomeHeroSlide(
  raw: unknown,
  base: HomeHeroSlideForm,
): HomeHeroSlideForm {
  if (!raw || typeof raw !== 'object') return base
  const ho = raw as Partial<HomeHeroSlideForm> & { titleLine1?: string; titleLine2?: string }
  const mergedTitle =
    (typeof ho.title === 'string' && ho.title.trim()) ||
    [ho.titleLine1, ho.titleLine2].filter((x): x is string => typeof x === 'string').join(' ').trim() ||
    base.title
  return {
    template: mergeHomeHeroTemplate(ho.template, base.template),
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

/** Несколько hero; legacy `homeHero` (объект) → один слайд. */
function mergeHomeHeroes(rawInput: unknown, base: PromoMaterialsForm): HomeHeroSlideForm[] {
  const baseSlides = base.homeHeroes
  const firstBase = baseSlides[0]
  if (!firstBase) return buildDefaultPromoMaterials().homeHeroes
  if (!rawInput || typeof rawInput !== 'object') return baseSlides
  const raw = rawInput as Record<string, unknown>

  const arr = raw.homeHeroes
  if (Array.isArray(arr)) {
    if (arr.length === 0) {
      const legacy = raw.homeHero
      if (legacy && typeof legacy === 'object') {
        return [mergeHomeHeroSlide(legacy, firstBase)]
      }
      return baseSlides
    }
    return arr.map((item, i) => mergeHomeHeroSlide(item, baseSlides[i] ?? firstBase))
  }

  const legacy = raw.homeHero
  if (legacy && typeof legacy === 'object') {
    return [mergeHomeHeroSlide(legacy, firstBase)]
  }

  return baseSlides
}

/** Слияние с черновиком по умолчанию; поддержка legacy titleLine1/titleLine2 в слайдах hero. */
export function mergePromoMaterialsForm(input: unknown): PromoMaterialsForm {
  if (input && typeof input === 'object') {
    migrateHomePromoBlocksRaw(input as Record<string, unknown>)
  }
  const base = buildDefaultPromoMaterials()
  if (!input || typeof input !== 'object') return base
  const raw = input as Partial<PromoMaterialsForm>

  const ao = (raw.aboutHero ?? {}) as Partial<PromoMaterialsForm['aboutHero']>

  return {
    tickerMessages: Array.isArray(raw.tickerMessages)
      ? raw.tickerMessages.filter((t): t is string => typeof t === 'string')
      : base.tickerMessages,
    homeHeroes: mergeHomeHeroes(raw, base),
    aboutHero: {
      title: str(ao.title, base.aboutHero.title),
      description: str(ao.description, base.aboutHero.description),
      imageA: str(ao.imageA, base.aboutHero.imageA),
      imageB: str(ao.imageB, base.aboutHero.imageB),
      imageC: str(ao.imageC, base.aboutHero.imageC),
      imageD: str(ao.imageD, base.aboutHero.imageD),
      imageE: str(ao.imageE, base.aboutHero.imageE),
    },
    homeFeatures: mergeHomeFeatures(raw.homeFeatures, base.homeFeatures),
    homeAdvantages: mergeHomeAdvantages(raw.homeAdvantages, base.homeAdvantages),
    categoryVisuals: mergeCategoryVisuals(raw.categoryVisuals),
    aboutMission: mergeAboutMission(raw.aboutMission, base.aboutMission),
    aboutValues: mergeAboutValues(raw.aboutValues, base.aboutValues),
    catalogKeyDetailsSection: mergeCatalogKeyDetailsSection(
      raw.catalogKeyDetailsSection,
      base.catalogKeyDetailsSection,
    ),
  }
}
