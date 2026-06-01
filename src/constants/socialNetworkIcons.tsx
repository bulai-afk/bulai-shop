import { Icon } from '@iconify/react'
import type { ReactElement } from 'react'

/** Id соцсети в настройках сайта → иконка Simple Icons (как в админке). */
export const SOCIAL_ICONIFY_BY_ID: Record<string, string> = {
  vk: 'simple-icons:vk',
  telegram: 'simple-icons:telegram',
  whatsapp: 'simple-icons:whatsapp',
  viber: 'simple-icons:viber',
  youtube: 'simple-icons:youtube',
  instagram: 'simple-icons:instagram',
  tiktok: 'simple-icons:tiktok',
  facebook: 'simple-icons:facebook',
  odnoklassniki: 'simple-icons:odnoklassniki',
}

export type SocialIconProps = {
  className?: string
}

export type SocialIconComponent = (props: SocialIconProps) => ReactElement

/** Иконка соцсети для витрины и админки; `null` — показать универсальную ссылку. */
export function socialIconComponentForId(id: string): SocialIconComponent | null {
  const key = id.trim().toLowerCase()
  if (key === 'max') {
    return ({ className }) => (
      <img
        src="https://maxicons.ru/icons/Max_logo.svg"
        alt=""
        aria-hidden
        className={className ?? 'size-5 object-contain'}
      />
    )
  }
  const icon = SOCIAL_ICONIFY_BY_ID[key]
  if (!icon) return null
  return ({ className }) => <Icon icon={icon} className={className ?? 'size-5'} aria-hidden />
}
