import type { ProfileExtras } from '../../pages/ProfilePage'

export type AdminClientRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  /** Полный профиль, как в «Настройки профиля» на сайте */
  profile?: ProfileExtras
}
