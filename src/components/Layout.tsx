import { useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import {
  MainScrollbarSuppressionProvider,
  useMainScrollbarSuppression,
} from '../context/MainScrollbarSuppressionContext'
import { PublicDocumentsProvider } from '../context/PublicDocumentsContext'
import { StorefrontSettingsProvider } from '../context/StorefrontSettingsContext'
import { AuthDialog } from './AuthDialog'
import { YandexWelcomeDialog } from './YandexWelcomeDialog'
import { CartDrawer } from './CartDrawer'
import { DeliveryPromoBar } from './DeliveryPromoBar'
import { Footer } from './Footer'
import { Navbar } from './Navbar'
import { PageScrollbar } from './PageScrollbar'

function LayoutContent() {
  const pathname = useLocation().pathname
  const isHome = pathname === '/'
  const isCatalog = pathname.startsWith('/catalog')
  const isProduct = pathname.startsWith('/product/')
  const isCheckout = pathname.startsWith('/checkout')
  const isAbout = pathname === '/about'
  const isApiDoc = pathname === '/api/doc'
  /** Как на главной: прозрачное «стекло» и переход в плотный фон при скролле */
  const heroStyleHeader = isHome || isAbout
  const {
    blockPageScrollbarForCatalog,
    setBlockPageScrollbarForCatalog,
    setHideMainScrollbarForCatalogBottom,
    hideMainScrollbarForCatalogBottom,
  } = useMainScrollbarSuppression()

  useLayoutEffect(() => {
    const onCatalog = pathname.startsWith('/catalog')
    setBlockPageScrollbarForCatalog(onCatalog)
    if (!onCatalog) setHideMainScrollbarForCatalogBottom(false)
  }, [pathname, setBlockPageScrollbarForCatalog, setHideMainScrollbarForCatalogBottom])

  const pageScrollbarHidden =
    isCatalog && (blockPageScrollbarForCatalog || hideMainScrollbarForCatalogBottom)

  return (
    <div
      className={`flex min-h-dvh flex-col font-sans antialiased ${
        heroStyleHeader ? 'bg-gray-900' : 'bg-gray-900 text-gray-100'
      }`}
    >
      {!isApiDoc ? (
        /* Всегда fixed: иначе при sticky мегаменю раздвигает контент вниз вместо наложения поверх. */
        <div
          className={
            heroStyleHeader
              ? 'fixed inset-x-0 top-0 z-50 flex flex-col shadow-lg shadow-black/20'
              : 'fixed inset-x-0 top-0 z-50 flex flex-col shadow-lg shadow-black/30'
          }
        >
          <DeliveryPromoBar />
          <Navbar overlay={heroStyleHeader} embeddedInFixedHeader={heroStyleHeader} />
        </div>
      ) : null}

      <main
        className={
          isApiDoc
            ? 'flex min-h-dvh w-full flex-1 flex-col'
            : heroStyleHeader
              ? 'flex min-h-0 flex-1 flex-col pt-[6.5rem]'
              : pathname.startsWith('/catalog')
                ? 'w-full flex-1 pt-[6.5rem]'
                : isProduct || isCheckout
                  ? 'mx-auto w-full max-w-7xl flex-1 px-4 pb-6 pt-[6.5rem]'
                  : 'mx-auto w-full max-w-5xl flex-1 px-4 pb-10 pt-[6.5rem]'
        }
      >
        <Outlet />
      </main>

      {!heroStyleHeader && !isApiDoc ? (
        <PageScrollbar hidden={pageScrollbarHidden} />
      ) : null}
      {!isApiDoc ? <Footer variant="dark" /> : null}
      <AuthDialog />
      <YandexWelcomeDialog />
      <CartDrawer />
    </div>
  )
}

export function Layout() {
  return (
    <MainScrollbarSuppressionProvider>
      <PublicDocumentsProvider>
        <StorefrontSettingsProvider>
          <LayoutContent />
        </StorefrontSettingsProvider>
      </PublicDocumentsProvider>
    </MainScrollbarSuppressionProvider>
  )
}
