import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type Value = {
  /**
   * На каталоге: скрыть глобальный PageScrollbar (пока список товаров в «режиме» внутреннего скролла).
   */
  blockPageScrollbarForCatalog: boolean
  setBlockPageScrollbarForCatalog: (v: boolean) => void
  /**
   * Докрутили страницу до конца — скрыть общий скролл, включить внутренний у отзывов.
   */
  hideMainScrollbarForCatalogBottom: boolean
  setHideMainScrollbarForCatalogBottom: (v: boolean) => void
}

const MainScrollbarSuppressionContext = createContext<Value | null>(null)

export function MainScrollbarSuppressionProvider({ children }: { children: ReactNode }) {
  const [blockPageScrollbarForCatalog, setBlockPageScrollbarForCatalogState] = useState(false)
  const setBlockPageScrollbarForCatalog = useCallback((v: boolean) => {
    setBlockPageScrollbarForCatalogState(v)
  }, [])
  const [hideMainScrollbarForCatalogBottom, setHideMainScrollbarForCatalogBottomState] = useState(false)
  const setHideMainScrollbarForCatalogBottom = useCallback((v: boolean) => {
    setHideMainScrollbarForCatalogBottomState(v)
  }, [])
  const value = useMemo(
    () => ({
      blockPageScrollbarForCatalog,
      setBlockPageScrollbarForCatalog,
      hideMainScrollbarForCatalogBottom,
      setHideMainScrollbarForCatalogBottom,
    }),
    [
      blockPageScrollbarForCatalog,
      setBlockPageScrollbarForCatalog,
      hideMainScrollbarForCatalogBottom,
      setHideMainScrollbarForCatalogBottom,
    ],
  )
  return (
    <MainScrollbarSuppressionContext.Provider value={value}>{children}</MainScrollbarSuppressionContext.Provider>
  )
}

export function useMainScrollbarSuppression() {
  const ctx = useContext(MainScrollbarSuppressionContext)
  if (!ctx) {
    return {
      blockPageScrollbarForCatalog: false,
      setBlockPageScrollbarForCatalog: () => {},
      hideMainScrollbarForCatalogBottom: false,
      setHideMainScrollbarForCatalogBottom: () => {},
    }
  }
  return ctx
}
