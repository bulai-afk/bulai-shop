import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useCallback, useId, useState } from 'react'

export type WriteReviewPayload = {
  rating: number
  text: string
}

export type WriteReviewProductPreview = {
  name: string
  image: string
  size: string
  color: string
  /** Класс фона кружка цвета, как в корзине (`bg-gray-950` и т.п.). */
  colorSwatchClassName?: string
}

type WriteReviewDialogProps = {
  open: boolean
  onClose: () => void
  onSubmit?: (payload: WriteReviewPayload) => void
  /** Миникарточка товара (страница товара); в каталоге не передаётся. */
  productPreview?: WriteReviewProductPreview | null
}

const textareaClass =
  'mt-1 block min-h-[120px] w-full resize-y rounded-md bg-white/5 px-3 py-2 text-base text-white outline outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6'

export function WriteReviewDialog({ open, onClose, onSubmit, productPreview }: WriteReviewDialogProps) {
  const textFieldId = useId()
  const starsLegendId = useId()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setRating(0)
    setHoverRating(0)
    setText('')
    setError(null)
  }, [])

  const finishClose = useCallback(() => {
    resetForm()
    onClose()
  }, [onClose, resetForm])

  const displayStars = hoverRating > 0 ? hoverRating : rating

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (rating < 1) {
      setError('Выберите оценку от 1 до 5 звёзд')
      return
    }
    const t = text.trim()
    if (t.length < 3) {
      setError('Напишите отзыв хотя бы из нескольких слов')
      return
    }
    onSubmit?.({ rating, text: t })
    finishClose()
  }

  return (
    <Dialog open={open} onClose={finishClose} className="relative z-[125]">
      <DialogBackdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
        <DialogPanel className="relative w-full max-w-md rounded-xl bg-[#0d1b2a] px-6 py-8 shadow-2xl shadow-black/50 ring-1 ring-white/10">
          <button
            type="button"
            onClick={finishClose}
            className="absolute right-3 top-3 rounded-md p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Закрыть"
          >
            <XMarkIcon className="size-5" aria-hidden />
          </button>

          <DialogTitle className="pr-10 text-xl font-bold tracking-tight text-white">
            {productPreview ? 'Написать отзыв о товаре' : 'Написать отзыв'}
          </DialogTitle>
          {productPreview ? (
            <div className="mt-3 flex gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
              <img
                src={productPreview.image}
                alt={productPreview.name}
                className="h-[4.5rem] w-[3.5rem] shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug text-white">{productPreview.name}</p>
                <p className="mt-1.5 text-xs text-gray-400">
                  <span className="text-gray-500">Размер:</span> {productPreview.size || '—'}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-gray-400">
                  <span className="text-gray-500">Цвет:</span>
                  {productPreview.colorSwatchClassName ? (
                    <span
                      className={`size-3.5 shrink-0 rounded-full ring-1 ring-inset ring-white/25 ${productPreview.colorSwatchClassName}`}
                      aria-hidden
                    />
                  ) : null}
                  <span>{productPreview.color || '—'}</span>
                </p>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div>
              <p id={starsLegendId} className="text-sm font-medium text-gray-200">
                Ваша оценка
              </p>
              <div
                role="group"
                aria-labelledby={starsLegendId}
                className="mt-2 flex gap-1"
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onFocus={() => setHoverRating(star)}
                    onBlur={() => setHoverRating(0)}
                    aria-label={`${star} из 5`}
                    aria-pressed={rating === star}
                    className="rounded-md p-1 text-3xl leading-none text-gray-600 transition hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <span className={star <= displayStars ? 'text-amber-300' : 'text-gray-600'}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
              {rating > 0 ? (
                <p className="sr-only" aria-live="polite">
                  Выбрано {rating} из 5
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor={textFieldId} className="text-sm font-medium text-gray-200">
                Текст отзыва
              </label>
              <textarea
                id={textFieldId}
                name="review"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder="Расскажите, что понравилось или что можно улучшить"
                className={textareaClass}
                autoComplete="off"
              />
            </div>

            {error ? (
              <p className="text-sm font-medium text-rose-400" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-slate-700/65 px-4 py-2.5 text-sm font-semibold text-gray-100 transition hover:bg-slate-600/75"
              >
                Отправить
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
