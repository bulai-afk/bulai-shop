import { publicApiUrl } from '../constants/apiBase'
import type { CartLine } from '../context/CartContext'
import type { CheckoutPaymentUi } from '../lib/createOrderFromCheckout'

export type CheckoutRequestBody = {
  promoCode?: string
  lines: Array<{
    productId: string
    color: string
    size: string
    quantity: number
  }>
  contact: {
    lastName: string
    firstName: string
    email: string
    phone: string
    termsAccepted: boolean
  }
  shipping: {
    country: string
    city: string
    postalCode: string
    addressLine: string
  }
  paymentMethod: CheckoutPaymentUi
  deliveryNote?: string
}

export type CheckoutResponse = {
  orderNumber: string
  message?: string
}

export function cartLinesToCheckoutLines(lines: CartLine[]): CheckoutRequestBody['lines'] {
  return lines.map((l) => ({
    productId: l.productId,
    color: l.colorLabel,
    size: l.sizeLabel,
    quantity: l.quantity,
  }))
}

export async function postCheckout(
  sessionJwt: string,
  body: CheckoutRequestBody,
): Promise<CheckoutResponse> {
  const res = await fetch(publicApiUrl('/api/checkout'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionJwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `checkout ${res.status}`)
  }
  return (await res.json()) as CheckoutResponse
}
