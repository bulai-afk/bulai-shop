import { Navigate } from 'react-router-dom'

/** Раньше «Лента»; теперь объединено со страницей «Главная». */
export function AdminPromoMaterialsPage() {
  return <Navigate to="/admin/promo-materials/home" replace />
}
