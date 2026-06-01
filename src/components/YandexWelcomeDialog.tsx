import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { YANDEX_AUTH_SUCCESS_PARAM } from '../constants/yandexAuth'
import { useAuth } from '../context/AuthContext'
import { BulaiLogo } from './BulaiLogo'

export function YandexWelcomeDialog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, hydrated } = useAuth()
  const [open, setOpen] = useState(false)

  const stripParam = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete(YANDEX_AUTH_SUCCESS_PARAM)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!hydrated) return
    if (!searchParams.has(YANDEX_AUTH_SUCCESS_PARAM)) return

    if (user?.provider === 'yandex') {
      setOpen(true)
      return
    }

    stripParam()
  }, [hydrated, user, searchParams, stripParam])

  const close = () => {
    setOpen(false)
    stripParam()
  }

  return (
    <Dialog open={open} onClose={close} className="relative z-[125]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-out data-closed:opacity-0"
      />
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
        <DialogPanel
          transition
          className="relative w-full max-w-sm transform rounded-xl bg-[#0d1b2a] px-6 py-8 shadow-2xl shadow-black/50 ring-1 ring-white/10 transition duration-300 ease-out data-closed:scale-95 data-closed:opacity-0"
        >
          <div className="flex flex-col items-center text-center">
            <BulaiLogo className="h-8 w-auto text-violet-400" />
            <DialogTitle className="mt-6 text-center text-xl font-bold tracking-tight text-white">
              Добро пожаловать!
            </DialogTitle>
            <p className="mt-3 text-sm leading-6 text-gray-300">
              Вы успешно авторизовались с помощью Яндекс.
            </p>
            {user?.yandexAvatarUrl ? (
              <img
                src={user.yandexAvatarUrl}
                alt=""
                className="mt-4 size-16 rounded-full object-cover ring-2 ring-white/20"
              />
            ) : null}
            {user?.displayName || user?.realName ? (
              <p className="mt-2 text-base font-medium text-white">
                {user.displayName ?? user.realName}
              </p>
            ) : null}
            {user?.email ? (
              <p
                className={`truncate text-sm text-gray-400 ${user?.displayName || user?.realName ? 'mt-1' : 'mt-2'}`}
                title={user.email}
              >
                {user.email}
              </p>
            ) : null}
            <button
              type="button"
              onClick={close}
              className="mt-8 w-full rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              Продолжить
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
