import { useLayoutEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { CurrencyProvider } from './context/CurrencyContext'
import { AboutPage } from './pages/AboutPage'
import { CatalogPage } from './pages/CatalogPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { ContactsPage } from './pages/ContactsPage'
import { HomePage } from './pages/HomePage'
import { ProductPage } from './pages/ProductPage'
import { OrdersDialogProvider, useOrdersDialog } from './context/OrdersDialogContext'
import { ProfileDialogProvider, useProfileDialog } from './context/ProfileDialogContext'

function ProfileDeepLink() {
  const navigate = useNavigate()
  const { openProfileDialog } = useProfileDialog()
  useLayoutEffect(() => {
    openProfileDialog()
    navigate('/', { replace: true })
  }, [navigate, openProfileDialog])
  return null
}

function OrdersDeepLink() {
  const navigate = useNavigate()
  const { openOrdersDialog } = useOrdersDialog()
  useLayoutEffect(() => {
    openOrdersDialog()
    navigate('/', { replace: true })
  }, [navigate, openOrdersDialog])
  return null
}

export default function App() {
  return (
    <CurrencyProvider>
      <BrowserRouter>
        <AuthProvider>
          <ProfileDialogProvider>
            <OrdersDialogProvider>
              <CartProvider>
                <Routes>
                  <Route element={<Layout />}>
                    <Route index element={<HomePage />} />
                    <Route path="catalog" element={<CatalogPage />} />
                    <Route path="product/:productId" element={<ProductPage />} />
                    <Route path="about" element={<AboutPage />} />
                    <Route path="contacts" element={<ContactsPage />} />
                    <Route path="checkout" element={<CheckoutPage />} />
                    <Route path="profile" element={<ProfileDeepLink />} />
                    <Route path="orders" element={<OrdersDeepLink />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
              </CartProvider>
            </OrdersDialogProvider>
          </ProfileDialogProvider>
        </AuthProvider>
      </BrowserRouter>
    </CurrencyProvider>
  )
}
