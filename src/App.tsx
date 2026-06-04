import { lazy, Suspense, useLayoutEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import { CatalogInventoryProvider } from './context/CatalogInventoryContext'
import { CartProvider } from './context/CartContext'
import { CurrencyProvider } from './context/CurrencyContext'
import { AboutPage } from './pages/AboutPage'
import { CatalogPage } from './pages/CatalogPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { HomePage } from './pages/HomePage'

const ApiDocPage = lazy(async () => {
  const m = await import('./pages/ApiDocPage')
  return { default: m.ApiDocPage }
})
import { ProductPage } from './pages/ProductPage'
import { AdminLayout } from './admin/AdminLayout'
import { AdminOverviewPage } from './admin/pages/AdminOverviewPage'
import { AdminClientsPage } from './admin/pages/AdminClientsPage'
import { AdminOrdersPage } from './admin/pages/AdminOrdersPage'
import {
  AdminPlaceholderPage,
  AdminTeamDetailPage,
} from './admin/pages/AdminPlaceholderPage'
import { AdminPromoAboutPage } from './admin/pages/AdminPromoAboutPage'
import { AdminPromoBannerPage } from './admin/pages/AdminPromoBannerPage'
import { AdminPromoCatalogPage } from './admin/pages/AdminPromoCatalogPage'
import { AdminPromoCodesPage } from './admin/pages/AdminPromoCodesPage'
import { AdminPromoHomePage } from './admin/pages/AdminPromoHomePage'
import { AdminPromoMaterialsPage } from './admin/pages/AdminPromoMaterialsPage'
import { AdminProductsCatalogPage } from './admin/pages/AdminProductsCatalogPage'
import { AdminProductsDictionariesPage } from './admin/pages/AdminProductsDictionariesPage'
import { AdminProductsDiscountsPage } from './admin/pages/AdminProductsDiscountsPage'
import { AdminProductsStocksPage } from './admin/pages/AdminProductsStocksPage'
import { AdminCalendarPage } from './admin/pages/AdminCalendarPage'
import { AdminDocumentsPage } from './admin/pages/AdminDocumentsPage'
import { AdminSiteSettingsPage } from './admin/pages/AdminSiteSettingsPage'
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
          <CatalogInventoryProvider>
            <ProfileDialogProvider>
              <OrdersDialogProvider>
                <CartProvider>
                  <Routes>
                  <Route path="admin" element={<AdminLayout />}>
                    <Route index element={<AdminOverviewPage />} />
                    <Route path="team" element={<Navigate to="/admin/clients" replace />} />
                    <Route path="clients" element={<AdminClientsPage />} />
                    <Route path="projects" element={<Navigate to="/admin/orders" replace />} />
                    <Route path="orders" element={<AdminOrdersPage />} />
                    <Route path="products/catalog" element={<AdminProductsCatalogPage />} />
                    <Route path="products/stocks" element={<AdminProductsStocksPage />} />
                    <Route path="products/dictionaries" element={<AdminProductsDictionariesPage />} />
                    <Route path="products/discounts" element={<AdminProductsDiscountsPage />} />
                    <Route path="products" element={<Navigate to="/admin/products/catalog" replace />} />
                    <Route path="calendar" element={<AdminCalendarPage />} />
                    <Route path="documents" element={<AdminDocumentsPage />} />
                    <Route path="reports" element={<AdminPlaceholderPage title="Отчёты" />} />
                    <Route path="discounts" element={<Navigate to="/admin/products/discounts" replace />} />
                    <Route path="promo-codes" element={<AdminPromoCodesPage />} />
                    <Route path="promo-materials/home" element={<AdminPromoHomePage />} />
                    <Route path="promo-materials/about" element={<AdminPromoAboutPage />} />
                    <Route path="promo-materials/catalog" element={<AdminPromoCatalogPage />} />
                    <Route path="promo-materials/ticker" element={<AdminPromoMaterialsPage />} />
                    <Route path="promo-materials/banner" element={<AdminPromoBannerPage />} />
                    <Route
                      path="promo-materials"
                      element={<Navigate to="/admin/promo-materials/home" replace />}
                    />
                    <Route path="profile" element={<AdminPlaceholderPage title="Профиль" />} />
                    <Route path="site-settings" element={<AdminSiteSettingsPage />} />
                    <Route path="teams/:teamId" element={<AdminTeamDetailPage />} />
                  </Route>
                  <Route element={<Layout />}>
                    <Route index element={<HomePage />} />
                    <Route path="catalog" element={<CatalogPage />} />
                    <Route path="product/:productId" element={<ProductPage />} />
                    <Route path="about" element={<AboutPage />} />
                    <Route
                      path="api/doc"
                      element={
                        <Suspense
                          fallback={
                            <div className="flex min-h-[50vh] items-center justify-center px-4 text-gray-400">
                              Загрузка документации…
                            </div>
                          }
                        >
                          <ApiDocPage />
                        </Suspense>
                      }
                    />
                    <Route path="checkout" element={<CheckoutPage />} />
                    <Route path="profile" element={<ProfileDeepLink />} />
                    <Route path="orders" element={<OrdersDeepLink />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                  </Routes>
                </CartProvider>
              </OrdersDialogProvider>
            </ProfileDialogProvider>
          </CatalogInventoryProvider>
        </AuthProvider>
      </BrowserRouter>
    </CurrencyProvider>
  )
}
