import { normProfileAccountEmail } from '../constants/profileExtrasStorage'
import type { CartLine } from '../context/CartContext'

const CART_KEY_PREFIX = 'bulai-shop-cart:'
const GUEST_CART_KEY = `${CART_KEY_PREFIX}guest`

export type StoredCart = {
  lines: CartLine[]
  appliedPromoCode: string | null
}

export function cartStorageKey(accountEmail: string | null | undefined): string {
  const e = accountEmail?.trim()
  if (!e) return GUEST_CART_KEY
  return `${CART_KEY_PREFIX}${normProfileAccountEmail(e)}`
}

function isCartLine(value: unknown): value is CartLine {
  if (value == null || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  return (
    typeof o.lineId === 'string' &&
    typeof o.productId === 'string' &&
    typeof o.name === 'string' &&
    typeof o.quantity === 'number' &&
    o.quantity > 0
  )
}

export function readStoredCart(storageKey: string): StoredCart {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return { lines: [], appliedPromoCode: null }
    const parsed = JSON.parse(raw) as Partial<StoredCart>
    const lines = Array.isArray(parsed.lines) ? parsed.lines.filter(isCartLine) : []
    const appliedPromoCode =
      typeof parsed.appliedPromoCode === 'string' && parsed.appliedPromoCode.trim()
        ? parsed.appliedPromoCode.trim().toUpperCase()
        : null
    return { lines, appliedPromoCode }
  } catch {
    return { lines: [], appliedPromoCode: null }
  }
}

export function writeStoredCart(storageKey: string, cart: StoredCart): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(cart))
  } catch {
    /* quota / private mode */
  }
}

export function isCartStorageEventKey(key: string | null): boolean {
  if (!key) return false
  return key === GUEST_CART_KEY || key.startsWith(CART_KEY_PREFIX)
}
