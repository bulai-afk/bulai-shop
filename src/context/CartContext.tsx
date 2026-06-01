import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { fetchPromoCodesCatalogFromApi } from '../api/promoCodesCatalogApi'
import { type Product } from '../data/catalogProducts'
import { useCatalogInventory } from './CatalogInventoryContext'
import { promoCatalogRowsToPercentMap } from '../utils/promoCodePercentMap'

export type CartLine = {
  lineId: string
  productId: string
  name: string
  href: string
  colorLabel: string
  /** Класс фона кружка цвета (как у варианта в каталоге), например `bg-gray-950`. */
  colorSwatchClassName?: string
  sizeLabel: string
  priceDisplay: string
  /** Цена до скидки (как в каталоге), если есть скидка. */
  oldPriceDisplay?: string
  /** Бейдж вроде «−15%». */
  discountLabel?: string
  quantity: number
  imageSrc: string
  imageAlt: string
}

function digitsFromPriceDisplay(s: string): number {
  const n = parseInt(s.replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

export function formatCartAmount(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n)).replace(/\u00A0/g, ' ')
}

/** Если API промокодов недоступен или в БД ещё нет снимка — эти коды всё ещё работают. */
export const CART_PROMO_CODES: Record<string, number> = {
  HELLO15: 15,
}

function buildInitialLines(products: Product[]): CartLine[] {
  if (products.length === 0) return []
  return products.slice(0, 3).map((p) => {
    const c = p.colors[0]
    return {
      lineId: `seed-${p.id}`,
      productId: p.id,
      name: p.name,
      href: `/product/${p.id}`,
      colorLabel: c?.name ?? '',
      colorSwatchClassName: c?.className,
      sizeLabel: p.sizes[0] ?? '',
      priceDisplay: p.price,
      oldPriceDisplay: p.oldPrice,
      discountLabel: p.discount,
      quantity: 1,
      imageSrc: c?.image ?? p.image,
      imageAlt: `${p.name}, цвет ${c?.name ?? ''}`,
    }
  })
}

type CartContextValue = {
  lines: CartLine[]
  isOpen: boolean
  setOpen: (open: boolean) => void
  openCart: () => void
  totalCount: number
  subtotalFormatted: string
  /** Сумма по ценам до скидки; только если есть экономия. */
  listPriceTotalFormatted: string | null
  /** Суммарная скидка на товары (разница списка и корзины). */
  totalSavingsFormatted: string | null
  /** Применённый промокод (верхний регистр) или null. */
  appliedPromoCode: string | null
  /** Процент скидки по промокоду; 0 если нет. */
  appliedPromoPercent: number
  /** Сумма скидки по промокоду; null если не применён или 0. */
  promoDiscountFormatted: string | null
  /** Итог к оплате после промокода. */
  grandTotalFormatted: string
  applyPromo: (raw: string) => 'ok' | 'invalid' | 'empty'
  clearPromo: () => void
  addItem: (product: Product, colorName: string, size: string) => void
  removeLine: (lineId: string) => void
  incrementQuantity: (lineId: string) => void
  decrementQuantity: (lineId: string) => void
  /** Очистить корзину (например после оформления заказа). */
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { products, catalogFingerprint } = useCatalogInventory()
  const [lines, setLines] = useState<CartLine[]>([])
  const lastCatalogFingerprintRef = useRef<string | null>(null)

  useEffect(() => {
    const fp = catalogFingerprint
    if (lastCatalogFingerprintRef.current === fp) return

    if (lastCatalogFingerprintRef.current === null) {
      setLines(buildInitialLines(products))
      lastCatalogFingerprintRef.current = fp
      return
    }

    lastCatalogFingerprintRef.current = fp
    const byId = Object.fromEntries(products.map((p) => [p.id, p])) as Record<string, Product>
    setLines((prev) => {
      const next: CartLine[] = []
      for (const line of prev) {
        const p = byId[line.productId]
        if (!p) continue
        const swatch = p.colors.find((c) => c.name === line.colorLabel) ?? p.colors[0]
        next.push({
          ...line,
          name: p.name,
          href: `/product/${p.id}`,
          priceDisplay: p.price,
          oldPriceDisplay: p.oldPrice,
          discountLabel: p.discount,
          imageSrc: swatch?.image ?? p.image,
          imageAlt: `${p.name}, цвет ${swatch?.name ?? line.colorLabel}`,
          colorSwatchClassName: swatch?.className,
        })
      }
      if (next.length === 0 && prev.length > 0) {
        return buildInitialLines(products)
      }
      return next
    })
  }, [catalogFingerprint, products])
  const [isOpen, setOpen] = useState(false)
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null)
  const [promoPercentByCode, setPromoPercentByCode] = useState<Record<string, number>>(() => ({
    ...CART_PROMO_CODES,
  }))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const remote = await fetchPromoCodesCatalogFromApi()
        if (cancelled || remote == null) return
        setPromoPercentByCode(promoCatalogRowsToPercentMap(remote.promoCodes))
      } catch {
        /* остаётся CART_PROMO_CODES */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!appliedPromoCode) return
    if (promoPercentByCode[appliedPromoCode] === undefined) {
      setAppliedPromoCode(null)
    }
  }, [promoPercentByCode, appliedPromoCode])

  const totalCount = useMemo(() => lines.reduce((s, l) => s + l.quantity, 0), [lines])

  const appliedPromoPercent =
    appliedPromoCode && promoPercentByCode[appliedPromoCode] !== undefined
      ? promoPercentByCode[appliedPromoCode]
      : 0

  const {
    subtotalFormatted,
    listPriceTotalFormatted,
    totalSavingsFormatted,
    promoDiscountFormatted,
    grandTotalFormatted,
  } = useMemo(() => {
    let sale = 0
    let catalog = 0
    for (const l of lines) {
      const uSale = digitsFromPriceDisplay(l.priceDisplay)
      const uCatalog = l.oldPriceDisplay ? digitsFromPriceDisplay(l.oldPriceDisplay) : uSale
      sale += uSale * l.quantity
      catalog += uCatalog * l.quantity
    }
    const savings = Math.max(0, catalog - sale)
    const hasSavings = savings > 0

    const pct = appliedPromoPercent
    const promoRub = pct > 0 ? Math.round((sale * pct) / 100) : 0
    const afterPromo = Math.max(0, sale - promoRub)

    return {
      subtotalFormatted: formatCartAmount(sale),
      listPriceTotalFormatted: hasSavings ? formatCartAmount(catalog) : null,
      totalSavingsFormatted: hasSavings ? formatCartAmount(savings) : null,
      promoDiscountFormatted: promoRub > 0 ? formatCartAmount(promoRub) : null,
      grandTotalFormatted: formatCartAmount(afterPromo),
    }
  }, [lines, appliedPromoCode, appliedPromoPercent])

  const applyPromo = useCallback((raw: string) => {
    const code = raw.trim().toUpperCase()
    if (!code) {
      setAppliedPromoCode(null)
      return 'empty' as const
    }
    if (promoPercentByCode[code] !== undefined) {
      setAppliedPromoCode(code)
      return 'ok' as const
    }
    return 'invalid' as const
  }, [promoPercentByCode])

  const clearPromo = useCallback(() => setAppliedPromoCode(null), [])

  const addItem = useCallback((product: Product, colorName: string, size: string) => {
    const swatch = product.colors.find((c) => c.name === colorName) ?? product.colors[0]
    const imageSrc = swatch?.image ?? product.image
    const imageAlt = `${product.name}, цвет ${swatch?.name ?? colorName}`

    setLines((prev) => {
      const i = prev.findIndex(
        (l) =>
          l.productId === product.id && l.colorLabel === colorName && l.sizeLabel === size,
      )
      if (i >= 0) {
        return prev.map((l, j) =>
          j === i ? { ...l, quantity: l.quantity + 1 } : l,
        )
      }
      return [
        ...prev,
        {
          lineId: `${product.id}-${colorName}-${size}-${Date.now()}`,
          productId: product.id,
          name: product.name,
          href: `/product/${product.id}`,
          colorLabel: swatch?.name ?? colorName,
          colorSwatchClassName: swatch?.className,
          sizeLabel: size,
          priceDisplay: product.price,
          oldPriceDisplay: product.oldPrice,
          discountLabel: product.discount,
          quantity: 1,
          imageSrc,
          imageAlt,
        },
      ]
    })
    setOpen(true)
  }, [])

  const removeLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.lineId !== lineId))
  }, [])

  const clearCart = useCallback(() => {
    setLines([])
    setAppliedPromoCode(null)
  }, [])

  const incrementQuantity = useCallback((lineId: string) => {
    setLines((prev) =>
      prev.map((l) => (l.lineId === lineId ? { ...l, quantity: l.quantity + 1 } : l)),
    )
  }, [])

  const decrementQuantity = useCallback((lineId: string) => {
    setLines((prev) =>
      prev
        .map((l) => {
          if (l.lineId !== lineId) return l
          if (l.quantity <= 1) return null
          return { ...l, quantity: l.quantity - 1 }
        })
        .filter((l): l is CartLine => l !== null),
    )
  }, [])

  const openCart = useCallback(() => setOpen(true), [])

  const value = useMemo(
    () => ({
      lines,
      isOpen,
      setOpen,
      openCart,
      totalCount,
      subtotalFormatted,
      listPriceTotalFormatted,
      totalSavingsFormatted,
      appliedPromoCode,
      appliedPromoPercent,
      promoDiscountFormatted,
      grandTotalFormatted,
      applyPromo,
      clearPromo,
      addItem,
      removeLine,
      incrementQuantity,
      decrementQuantity,
      clearCart,
    }),
    [
      lines,
      isOpen,
      openCart,
      totalCount,
      subtotalFormatted,
      listPriceTotalFormatted,
      totalSavingsFormatted,
      appliedPromoCode,
      appliedPromoPercent,
      promoDiscountFormatted,
      grandTotalFormatted,
      applyPromo,
      clearPromo,
      addItem,
      removeLine,
      incrementQuantity,
      decrementQuantity,
      clearCart,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider')
  }
  return ctx
}
