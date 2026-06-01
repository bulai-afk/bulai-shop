import type { ProductCatalogRow, StockRow, Warehouse } from '../admin/types/siteSettings'
import { getTotalStockUnitsForProduct } from '../admin/lib/stockRowUtils'
import type { ColorSwatch, Product, ProductAccordionSections, ProductCategory, ProductMeta } from '../data/catalogProducts'
import { formatBelarusRubAmount } from '../lib/formatMoney'

const PLACEHOLDER_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect fill="%231a2332" width="400" height="500"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-family="system-ui" font-size="14">Нет фото</text></svg>',
  )

function decodeMultiValue(value: string): string[] {
  return value
    .split('||')
    .map((part) => part.trim())
    .filter(Boolean)
}

function todayIsoLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isDiscountInPeriod(row: ProductCatalogRow): boolean {
  const from = row.discountValidFrom?.trim() ?? ''
  const to = row.discountValidTo?.trim() ?? ''
  if (!from && !to) return true
  const t = todayIsoLocal()
  if (from && t < from) return false
  if (to && t > to) return false
  return true
}

function swatchClassForColor(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('черн') || n === 'black') return 'bg-gray-950'
  if (n.includes('бел')) return 'bg-white'
  if (n.includes('сер') || n.includes('графит')) return 'bg-gray-500'
  if (n.includes('син') || n.includes('индиго')) return 'bg-blue-600'
  if (n.includes('красн') || n.includes('бордо')) return 'bg-red-900'
  if (n.includes('зел') || n.includes('олива') || n.includes('лайм')) return 'bg-lime-700'
  if (n.includes('жёлт') || n.includes('песоч') || n.includes('беж')) return 'bg-amber-200'
  if (n.includes('розов') || n.includes('фукс')) return 'bg-fuchsia-900'
  if (n.includes('коричн')) return 'bg-amber-900'
  if (n.includes('молоч')) return 'bg-zinc-200'
  return 'bg-gray-600'
}

function normalizeCategory(raw: string): ProductCategory {
  const s = raw.trim().toLowerCase()
  if (!s) return 'майки'
  if (s.includes('брюк') || s.includes('джинс') || s.includes('штаны')) return 'брюки'
  if (s.includes('рубаш') || s.includes('сорочк')) return 'рубашки'
  if (s.includes('майк') || s.includes('футбол') || s.includes('худи') || s.includes('лонг') || s.includes('свитш') || s.includes('поло'))
    return 'майки'
  return 'майки'
}

function normalizeFit(raw: string): ProductMeta['fit'] {
  const s = raw.trim().toLowerCase()
  if (s.includes('slim') || s.includes('притален')) return 'slim'
  if (s.includes('wide') || s.includes('широк') || s.includes('оверсайз') || s.includes('oversize')) return 'wide'
  if (s.includes('relaxed') || s.includes('свобод')) return 'relaxed'
  return 'regular'
}

function normalizeMaterial(raw: string): ProductMeta['material'] {
  const s = raw.trim().toLowerCase()
  if (s.includes('деним') || s.includes('джинс')) return 'деним'
  if (s.includes('лен') || s.includes('льн')) return 'лен'
  if (s.includes('смес') || s.includes('поли')) return 'смесовая'
  if (s.includes('хлоп')) return 'хлопок'
  return 'хлопок'
}

function normalizeSeason(raw: string): ProductMeta['season'] {
  const s = raw.trim().toLowerCase()
  if (s.includes('зим') || s.includes('winter')) return 'зима'
  if (s.includes('лет') || s.includes('summer')) return 'лето'
  return 'деми'
}

export type StorefrontInventoryStock = {
  stocks: StockRow[]
  warehouses: Warehouse[]
}

/** Бейдж «В наличии» на витрине: остаток > 0 и статус не «нет» / не предзаказ. */
export function resolveStorefrontInStock(row: ProductCatalogRow, stockUnits: number): boolean {
  if (row.availability === 'out_of_stock') return false
  if (row.availability === 'preorder') return false
  return stockUnits > 0
}

function metaFromRow(row: ProductCatalogRow, index: number, stockUnits: number): ProductMeta {
  const a = row.attributes ?? {}
  const cat = typeof a.category === 'string' ? a.category : ''
  const fit = typeof a.fit === 'string' ? a.fit : ''
  const material = typeof a.material === 'string' ? a.material : ''
  const season = typeof a.season === 'string' ? a.season : ''
  return {
    category: normalizeCategory(cat),
    isNew: index < 6,
    fit: normalizeFit(fit),
    material: normalizeMaterial(material),
    season: normalizeSeason(season),
    inStock: resolveStorefrontInStock(row, stockUnits),
  }
}

function accordionFromRow(row: ProductCatalogRow): ProductAccordionSections | undefined {
  const lines = row.description
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return undefined
  return {
    features: {
      any: lines.slice(0, 12),
    },
  }
}

export function mapCatalogRowsToStorefront(
  rows: ProductCatalogRow[],
  inventoryStock?: StorefrontInventoryStock,
): {
  products: Product[]
  metaById: Record<string, ProductMeta>
} {
  const products: Product[] = []
  const metaById: Record<string, ProductMeta> = {}
  const stocks = inventoryStock?.stocks ?? []
  const warehouses = inventoryStock?.warehouses ?? []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const stockUnits = getTotalStockUnitsForProduct(stocks, warehouses, row.id)
    const mainImage = row.imageUrls[0]?.trim() || PLACEHOLDER_IMAGE
    const colorNames = decodeMultiValue(row.color)
    const sizeList = decodeMultiValue(row.size)
    const sizes = sizeList.length > 0 ? sizeList : ['—']

    const colors: ColorSwatch[] =
      colorNames.length > 0
        ? colorNames.map((name, ci) => ({
            name,
            className: swatchClassForColor(name),
            image: row.imageUrls[ci]?.trim() || mainImage,
          }))
        : [{ name: 'Цвет', className: 'bg-gray-600', image: mainImage }]

    const pct = Math.min(100, Math.max(0, Math.round(Number(row.discountPercent) || 0)))
    const activeDiscount = pct > 0 && isDiscountInPeriod(row)
    const listPrice = Math.max(0, row.price)
    const salePrice = activeDiscount ? Math.round(listPrice * (1 - pct / 100)) : listPrice
    const priceStr = formatBelarusRubAmount(salePrice)
    const oldPriceStr =
      activeDiscount && salePrice < listPrice ? formatBelarusRubAmount(listPrice) : undefined
    const discountStr = activeDiscount ? `-${pct}%` : undefined

    const accordionSections = accordionFromRow(row)

    products.push({
      id: row.id,
      name: row.name.trim() || 'Товар',
      price: priceStr,
      oldPrice: oldPriceStr,
      discount: discountStr,
      image: mainImage,
      rating: 0,
      reviews: 0,
      sizes,
      colors,
      accordionSections,
    })
    metaById[row.id] = metaFromRow(row, i, stockUnits)
  }

  return { products, metaById }
}

export function getRelatedProductsFromCatalog(
  products: Product[],
  metaById: Record<string, ProductMeta>,
  currentId: string,
  limit = 4,
): Product[] {
  const meta = metaById[currentId]
  if (!meta) return []
  return products
    .filter((p) => p.id !== currentId && metaById[p.id]?.category === meta.category)
    .slice(0, limit)
}
