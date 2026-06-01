import type { SVGProps } from 'react'
import type { ReactElement } from 'react'
import { STORE_SOCIAL_LINKS } from '../constants/storeContact'

type IconFn = (props: SVGProps<SVGSVGElement>) => ReactElement

const byStoreName = new Map<string, IconFn>(
  STORE_SOCIAL_LINKS.map((l) => [l.name.toLowerCase(), l.icon]),
)

/** Соответствие id из админки иконкам из справочника витрины. */
const ID_TO_STORE_NAME: Record<string, string> = {
  vk: 'VK',
  telegram: 'Telegram',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
  viber: 'Viber',
  instagram: 'Instagram',
  facebook: 'Facebook',
}

/** Иконка для соцссылки из черновика настроек; иначе null — показать универсальную ссылку. */
export function socialIconFromDraft(id: string, name: string): IconFn | null {
  const idKey = id.trim().toLowerCase()
  const mapped = ID_TO_STORE_NAME[idKey]
  if (mapped) {
    const fn = byStoreName.get(mapped.toLowerCase())
    if (fn) return fn
  }
  const byName = byStoreName.get(name.trim().toLowerCase())
  return byName ?? null
}
