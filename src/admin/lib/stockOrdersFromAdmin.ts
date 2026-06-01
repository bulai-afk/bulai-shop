import type { AdminOrderLineItem, AdminOrderRow } from '../types/adminOrders'
import type { ProductCatalogRow, Warehouse } from '../types/siteSettings'

export type OrderStockSplit = { orders: number; preorders: number }

/** Склад, к которому относятся заказы без явного warehouseId в карточке. */
export function resolvePrimaryWarehouseId(warehouses: Warehouse[]): string {
  if (warehouses.length === 0) return ''
  const msk = warehouses.find((w) => w.id === 'msk-main')
  return msk?.id ?? warehouses[0]!.id
}

function clampQty(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.floor(n))
}

function catalogIndex(catalog: ProductCatalogRow[]) {
  const byId = new Map<string, ProductCatalogRow>()
  const bySku = new Map<string, ProductCatalogRow>()
  const byName = new Map<string, ProductCatalogRow>()
  for (const p of catalog) {
    byId.set(p.id, p)
    const sku = p.sku.trim().toLowerCase()
    if (sku) bySku.set(sku, p)
    const name = p.name.trim().toLowerCase()
    if (name) byName.set(name, p)
  }
  return { byId, bySku, byName }
}

function resolveLineProductId(
  line: AdminOrderLineItem,
  idx: ReturnType<typeof catalogIndex>,
): ProductCatalogRow | null {
  if (line.productId && idx.byId.has(line.productId)) {
    return idx.byId.get(line.productId)!
  }
  const sku = (line.sku ?? '').trim().toLowerCase()
  if (sku && idx.bySku.has(sku)) return idx.bySku.get(sku)!
  const name = line.name.trim().toLowerCase()
  if (name && idx.byName.has(name)) return idx.byName.get(name)!
  return null
}

/** Заказ ещё резервирует остаток (не отгружен и не возвращён). */
function orderReservesStock(order: AdminOrderRow): boolean {
  if (order.stageId === 'delivered') return false
  if (order.paymentStatus === 'refunded') return false
  return true
}

function addQty(
  map: Map<string, Map<string, OrderStockSplit>>,
  productId: string,
  warehouseId: string,
  field: 'orders' | 'preorders',
  qty: number,
) {
  const q = clampQty(qty)
  if (q <= 0 || !warehouseId) return
  if (!map.has(productId)) map.set(productId, new Map())
  const wm = map.get(productId)!
  const cur = wm.get(warehouseId) ?? { orders: 0, preorders: 0 }
  cur[field] += q
  wm.set(warehouseId, cur)
}

/**
 * «Заказ» и «Предзаказы» по экрану /admin/orders:
 * — только не доставленные и не возвращённые;
 * — позиции с productId / sku / названием из каталога;
 * — предзаказ, если у товара availability === 'preorder', иначе заказ;
 * — склад: основной (msk-main или первый), пока в заказе нет поля склада.
 */
export function buildOrderMetricsFromAdminOrders(
  orders: AdminOrderRow[],
  catalog: ProductCatalogRow[],
  warehouses: Warehouse[],
): Map<string, Map<string, OrderStockSplit>> {
  const map = new Map<string, Map<string, OrderStockSplit>>()
  const warehouseId = resolvePrimaryWarehouseId(warehouses)
  if (!warehouseId) return map

  const idx = catalogIndex(catalog)

  for (const order of orders) {
    if (!orderReservesStock(order)) continue
    const items = order.items ?? []
    for (const line of items) {
      const product = resolveLineProductId(line, idx)
      if (!product) continue
      const field = product.availability === 'preorder' ? 'preorders' : 'orders'
      addQty(map, product.id, warehouseId, field, line.quantity)
    }
  }

  return map
}

export function orderMetricsFromMap(
  map: Map<string, Map<string, OrderStockSplit>>,
  productId: string,
  warehouseId: string,
): OrderStockSplit {
  return map.get(productId)?.get(warehouseId) ?? { orders: 0, preorders: 0 }
}

export function sumOrderMetricsAcrossWarehouses(
  map: Map<string, Map<string, OrderStockSplit>>,
  productId: string,
  warehouseIds: string[],
): OrderStockSplit {
  return warehouseIds.reduce(
    (acc, wid) => {
      const m = orderMetricsFromMap(map, productId, wid)
      return {
        orders: acc.orders + m.orders,
        preorders: acc.preorders + m.preorders,
      }
    },
    { orders: 0, preorders: 0 },
  )
}
