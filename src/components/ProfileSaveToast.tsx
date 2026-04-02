import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/solid'

type ProfileSaveToastProps = {
  open: boolean
  onDismiss: () => void
}

export function ProfileSaveToast({ open, onDismiss }: ProfileSaveToastProps) {
  if (!open) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex justify-center px-4 pb-6 sm:px-6"
      aria-live="polite"
    >
      <div
        role="status"
        className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl bg-[#0d1b2a] px-4 py-4 shadow-2xl shadow-black/50 ring-1 ring-white/10"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
          <CheckCircleIcon className="size-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-white">Изменения сохранены</p>
          <p className="mt-1 text-sm text-gray-400">
            Спасибо, что рассказали о себе — мы это сохранили, чтобы в следующий раз всё было под рукой.
          </p>
        </div>
        <div className="flex shrink-0">
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex rounded-md p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            aria-label="Закрыть уведомление"
          >
            <XMarkIcon className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
