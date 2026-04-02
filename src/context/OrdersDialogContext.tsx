import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { OrdersDialog } from '../components/OrdersDialog'

type OrdersDialogContextValue = {
  ordersDialogOpen: boolean
  openOrdersDialog: () => void
  closeOrdersDialog: () => void
}

const OrdersDialogContext = createContext<OrdersDialogContextValue | null>(null)

export function OrdersDialogProvider({ children }: { children: ReactNode }) {
  const [ordersDialogOpen, setOrdersDialogOpen] = useState(false)
  const openOrdersDialog = useCallback(() => setOrdersDialogOpen(true), [])
  const closeOrdersDialog = useCallback(() => setOrdersDialogOpen(false), [])

  const value = useMemo(
    () => ({
      ordersDialogOpen,
      openOrdersDialog,
      closeOrdersDialog,
    }),
    [ordersDialogOpen, openOrdersDialog, closeOrdersDialog],
  )

  return (
    <OrdersDialogContext.Provider value={value}>
      {children}
      <OrdersDialog />
    </OrdersDialogContext.Provider>
  )
}

export function useOrdersDialog() {
  const ctx = useContext(OrdersDialogContext)
  if (!ctx) throw new Error('useOrdersDialog must be used within OrdersDialogProvider')
  return ctx
}
