import { LinkIcon } from '@heroicons/react/24/outline'
import { useStorefrontSiteConfig } from '../context/StorefrontSettingsContext'
import { socialIconFromDraft } from '../utils/socialDraftIcons'

type FooterProps = {
  variant?: 'dark' | 'light'
}

function SocialLinksFromDraft({
  iconClass,
  wrapClassName,
}: {
  iconClass: string
  /** Обёртка только если есть ссылки — чтобы не оставлять пустой ряд во футере */
  wrapClassName?: string
}) {
  const site = useStorefrontSiteConfig()
  const links = site.socialLinks.filter((l) => l.href.trim())
  if (links.length === 0) return null
  const inner = (
    <>
      {links.map((item) => {
        const IconFn = socialIconFromDraft(item.id, item.name)
        const href = item.href.trim()
        const external = href.startsWith('http')
        return (
          <a
            key={`${item.id}-${item.name}`}
            href={href}
            className={`${iconClass} transition`}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            <span className="sr-only">{item.name}</span>
            {IconFn ? (
              <IconFn className="size-5" />
            ) : (
              <LinkIcon className="size-5" aria-hidden />
            )}
          </a>
        )
      })}
    </>
  )
  if (wrapClassName) {
    return <div className={wrapClassName}>{inner}</div>
  }
  return inner
}

export function Footer({ variant = 'light' }: FooterProps) {
  const site = useStorefrontSiteConfig()
  const isDark = variant === 'dark'

  const shell = isDark
    ? 'border-white/10 bg-gray-950'
    : 'border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950'

  const textMuted = isDark
    ? 'text-gray-400'
    : 'text-zinc-500 dark:text-zinc-400'

  const iconClass = isDark
    ? 'text-gray-400 hover:text-gray-300'
    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'

  const legalParts = site.footer.legalEntityLine
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
  const shopLine =
    site.footer.shopNameLine.trim() ||
    `© ${new Date().getFullYear()} Интернет-магазин bulai.by`

  return (
    <footer className={`border-t ${shell} overscroll-none`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div
          className={`flex flex-col items-center gap-3 py-4 text-center ${textMuted}`}
        >
          <SocialLinksFromDraft
            iconClass={iconClass}
            wrapClassName="flex justify-center gap-x-5"
          />
          <p className="max-w-3xl px-2 text-xs leading-snug">
            {legalParts.length > 0 ? `${shopLine} — ${legalParts.join(', ')}` : shopLine}
          </p>
        </div>
      </div>
    </footer>
  )
}
