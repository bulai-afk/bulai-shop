import { Navigate } from 'react-router-dom'

/** Раньше «Hero-блоки»; разделено: главная — /home, о компании — /about. */
export function AdminPromoBannerPage() {
  return <Navigate to="/admin/promo-materials/home" replace />
}
