/**
 * Реальный контейнер вертикального скролла страницы.
 * При `html { overflow-y: hidden }` и скролле на `body` (см. index.css) `document.scrollingElement`
 * может оставаться documentElement с scrollTop === 0 — тогда кастомный скролл и гейт каталога ломаются.
 */
export function getPageScrollElement(): HTMLElement {
  const docEl = document.documentElement
  const style = getComputedStyle(docEl)
  const oy = style.overflowY
  if (oy === 'hidden' || oy === 'clip') {
    return document.body
  }
  return (document.scrollingElement ?? docEl) as HTMLElement
}
