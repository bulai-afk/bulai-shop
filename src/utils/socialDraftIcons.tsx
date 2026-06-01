import type { ReactElement, SVGProps } from 'react'
import { STORE_SOCIAL_LINKS } from '../constants/storeContact'
import { socialIconComponentForId, type SocialIconComponent } from '../constants/socialNetworkIcons'

type IconFn = (props: SVGProps<SVGSVGElement>) => ReactElement

const byStoreName = new Map<string, IconFn>(
  STORE_SOCIAL_LINKS.map((l) => [l.name.toLowerCase(), l.icon]),
)

function wrapComponent(comp: SocialIconComponent): IconFn {
  return (props) => comp({ className: props.className })
}

/** Иконка для соцссылки из настроек сайта; иначе null — показать универсальную ссылку. */
export function socialIconFromDraft(id: string, name: string): IconFn | null {
  const fromId = socialIconComponentForId(id)
  if (fromId) return wrapComponent(fromId)

  const byName = byStoreName.get(name.trim().toLowerCase())
  return byName ?? null
}
