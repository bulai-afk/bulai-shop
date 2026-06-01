/** Имя файла для подписи в интерфейсе без расширения. */
export function documentDisplayName(fileName: string): string {
  const t = fileName.trim()
  if (!t) return t
  const i = t.lastIndexOf('.')
  if (i <= 0 || i >= t.length - 1) return t
  return t.slice(0, i)
}
