import {
  loadClientsDraft,
  loadOrdersDraft,
  saveOrdersDraft,
  ORDERS_UPDATED_EVENT,
} from '../admin/lib/adminDraftStorage'
import { postCheckout, cartLinesToCheckoutLines, type CheckoutRequestBody } from '../api/checkoutApi'
import {
  buildAdminOrderFromCheckout,
  resolveClientIdForEmail,
  type CheckoutPaymentUi,
} from './createOrderFromCheckout'
import type { CartLine } from '../context/CartContext'
import { isSiteConfigApiExpected } from '../constants/apiBase'

export type SubmitCheckoutParams = {
  sessionJwt: string | null
  userEmail: string
  firstName: string
  lastName: string
  phone: string
  termsAccepted: boolean
  deliveryMethodLabel: string
  paymentMethod: CheckoutPaymentUi
  lines: CartLine[]
  appliedPromoCode: string | null
  appliedPromoPercent: number
}

export async function submitCheckoutOrder(params: SubmitCheckoutParams): Promise<{
  orderNumber: string
  usedApi: boolean
}> {
  const email = params.userEmail.trim()
  const clients = loadClientsDraft()
  const clientId = resolveClientIdForEmail(clients, email)
  const existing = loadOrdersDraft()

  const apiExpected = isSiteConfigApiExpected() && Boolean(params.sessionJwt)

  if (apiExpected && params.sessionJwt) {
    const body: CheckoutRequestBody = {
      promoCode: params.appliedPromoCode ?? undefined,
      lines: cartLinesToCheckoutLines(params.lines),
      contact: {
        lastName: params.lastName,
        firstName: params.firstName,
        email,
        phone: params.phone,
        termsAccepted: params.termsAccepted,
      },
      shipping: {
        country: 'Беларусь',
        city: '—',
        postalCode: '—',
        addressLine: params.deliveryMethodLabel || '—',
      },
      paymentMethod: params.paymentMethod,
      deliveryNote: params.deliveryMethodLabel,
    }
    const res = await postCheckout(params.sessionJwt, body)
    const order = buildAdminOrderFromCheckout(
      {
        clientEmail: email,
        clientId,
        firstName: params.firstName,
        lastName: params.lastName,
        phone: params.phone,
        lines: params.lines,
        appliedPromoCode: params.appliedPromoCode,
        appliedPromoPercent: params.appliedPromoPercent,
        paymentMethod: params.paymentMethod,
        deliveryMethodLabel: params.deliveryMethodLabel,
      },
      existing,
    )
    order.orderNumber = res.orderNumber
    const num = res.orderNumber.trim()
    const withoutDup = num
      ? existing.filter((o) => o.orderNumber.trim().toLowerCase() !== num.toLowerCase())
      : existing
    saveOrdersDraft([...withoutDup, order])
    window.dispatchEvent(new Event(ORDERS_UPDATED_EVENT))
    return { orderNumber: res.orderNumber, usedApi: true }
  }

  const order = buildAdminOrderFromCheckout(
    {
      clientEmail: email,
      clientId,
      firstName: params.firstName,
      lastName: params.lastName,
      phone: params.phone,
      lines: params.lines,
      appliedPromoCode: params.appliedPromoCode,
      appliedPromoPercent: params.appliedPromoPercent,
      paymentMethod: params.paymentMethod,
      deliveryMethodLabel: params.deliveryMethodLabel,
    },
    existing,
  )
  saveOrdersDraft([...existing, order])
  return { orderNumber: order.orderNumber, usedApi: false }
}
