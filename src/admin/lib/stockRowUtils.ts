import type { StockRow, Warehouse, WarehouseStockBreakdown } from '../types/siteSettings'

export function emptyWarehouseStock(): WarehouseStockBreakdown {
  return { receipts: 0, orders: 0, preorders: 0, defects: 0, stock: 0 }
}

function clampNonNegInt(n: unknown): number {
  const x = typeof n === 'number' && Number.isFinite(n) ? Math.floor(n) : Number.parseInt(String(n), 10)
  if (!Number.isFinite(x)) return 0
  return Math.max(0, x)
}

export function normalizeWarehouseStockValue(v: unknown): WarehouseStockBreakdown {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>
    let orders = clampNonNegInt(o.orders)
    let preorders = clampNonNegInt(o.preorders)
    let defects = clampNonNegInt(o.defects)
    if (orders === 0 && preorders === 0 && defects === 0 && 'outgoing' in o) {
      orders = clampNonNegInt(o.outgoing)
    }
    return {
      receipts: clampNonNegInt(o.receipts),
      orders,
      preorders,
      defects,
      stock: clampNonNegInt(o.stock),
    }
  }
  return { receipts: 0, orders: 0, preorders: 0, defects: 0, stock: clampNonNegInt(v) }
}

export function getWarehouseStock(
  byWarehouse: StockRow['byWarehouse'],
  warehouseId: string,
): WarehouseStockBreakdown {
  const raw = byWarehouse[warehouseId]
  return raw ? normalizeWarehouseStockValue(raw) : emptyWarehouseStock()
}

/** Остаток: поступления − заказ − предзаказы − брак. */
export function deriveStockFromBreakdown(b: WarehouseStockBreakdown): number {
  const r = Math.max(0, Math.floor(Number(b.receipts) || 0))
  const o = Math.max(0, Math.floor(Number(b.orders) || 0))
  const pr = Math.max(0, Math.floor(Number(b.preorders) || 0))
  const d = Math.max(0, Math.floor(Number(b.defects) || 0))
  return r - o - pr - d
}

export function withDerivedStock(row: WarehouseStockBreakdown): WarehouseStockBreakdown {
  return { ...row, stock: deriveStockFromBreakdown(row) }
}

/** Сумма остатков по всем складам для витрины и отчётов. */
export function getTotalStockUnitsForProduct(
  stocks: StockRow[],
  warehouses: Warehouse[],
  productId: string,
): number {
  const row = stocks.find((s) => s.productId === productId)
  if (!row || warehouses.length === 0) return 0
  return warehouses.reduce((sum, w) => {
    const b = getWarehouseStock(row.byWarehouse, w.id)
    return sum + deriveStockFromBreakdown(b)
  }, 0)
}

export function sumMetricsAcrossWarehouses(
  stockRow: StockRow | undefined,
  warehouses: Warehouse[],
): WarehouseStockBreakdown {
  if (!stockRow) return emptyWarehouseStock()
  return warehouses.reduce(
    (acc, w) => {
      const b = getWarehouseStock(stockRow.byWarehouse, w.id)
      return {
        receipts: acc.receipts + b.receipts,
        orders: acc.orders + b.orders,
        preorders: acc.preorders + b.preorders,
        defects: acc.defects + b.defects,
        stock: acc.stock + b.stock,
      }
    },
    { receipts: 0, orders: 0, preorders: 0, defects: 0, stock: 0 },
  )
}

export function normalizeStockRowsFromStorage(
  stocks: unknown[],
  warehouses: Warehouse[],
): StockRow[] {
  const whIds = warehouses.map((w) => w.id)
  return stocks.map((raw, index) => {
    const row = raw as Partial<StockRow>
    const byWarehouse: Record<string, WarehouseStockBreakdown> = {}
    const legacyMap = row.byWarehouse && typeof row.byWarehouse === 'object' && !Array.isArray(row.byWarehouse)
      ? (row.byWarehouse as Record<string, unknown>)
      : {}
    for (const wid of whIds) {
      byWarehouse[wid] = normalizeWarehouseStockValue(legacyMap[wid])
    }
    return {
      productId: typeof row.productId === 'string' ? row.productId : `unknown-${index + 1}`,
      byWarehouse,
    }
  })
}
