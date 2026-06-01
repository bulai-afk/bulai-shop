import { isSiteConfigApiExpected } from '../../constants/apiBase'

/** Предупреждение: промо в браузере есть, в БД витрины — нет (пока не нажали «Сохранить»). */
export function AdminPromoDbSyncBanner({ show }: { show: boolean }) {
  if (!show || !isSiteConfigApiExpected()) return null
  return (
    <p
      role="status"
      className="mb-6 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
    >
      На сайте показываются стандартные промо-блоки, пока вы не нажмёте «Сохранить» на этой странице — витрина читает
      данные только из базы.
    </p>
  )
}
