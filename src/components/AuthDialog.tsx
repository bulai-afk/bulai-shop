import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useEffect, useId, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { BulaiLogo } from './BulaiLogo'
import { YandexLoginButton } from './YandexLoginButton'

const fieldClass =
  'block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6'

export function AuthDialog() {
  const {
    authDialogOpen,
    authDialogMode,
    closeAuthDialog,
    openAuthDialog,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth()

  const emailId = useId()
  const passwordId = useId()
  const password2Id = useId()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!authDialogOpen) {
      setEmail('')
      setPassword('')
      setPassword2('')
      setFormError(null)
    }
  }, [authDialogOpen])

  const mode = authDialogMode
  const hasYandex = Boolean(import.meta.env.VITE_YANDEX_CLIENT_ID?.trim())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const em = email.trim()
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setFormError('Укажите корректный email')
      return
    }
    if (password.length < 6) {
      setFormError('Пароль не короче 6 символов')
      return
    }
    if (mode === 'signup') {
      if (password !== password2) {
        setFormError('Пароли не совпадают')
        return
      }
      signUpWithEmail(em, password)
    } else {
      signInWithEmail(em, password)
    }
  }

  return (
    <Dialog open={authDialogOpen} onClose={closeAuthDialog} className="relative z-[120]">
      <DialogBackdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
        {/*
          transition на Panel откладывает монтирование детей; YaAuthSuggest.init ищет parentId в DOM —
          если узла ещё нет, кнопка уезжает в document.body и её не видно под модалкой.
        */}
        <DialogPanel className="relative w-full max-w-sm rounded-xl bg-[#0d1b2a] px-6 py-8 shadow-2xl shadow-black/50 ring-1 ring-white/10">
          <button
            type="button"
            onClick={closeAuthDialog}
            className="absolute right-3 top-3 rounded-md p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Закрыть"
          >
            <XMarkIcon className="size-5" aria-hidden />
          </button>

          <div className="flex flex-col items-center">
            <BulaiLogo className="h-8 w-auto text-violet-400" />
            <DialogTitle className="mt-8 text-center text-2xl/9 font-bold tracking-tight text-white">
              {mode === 'signin' ? 'Вход в аккаунт' : 'Регистрация'}
            </DialogTitle>
          </div>

          <div className="mt-8 space-y-8">
            {authDialogOpen && hasYandex ? (
              <section aria-labelledby="auth-yandex-heading" className="space-y-4">
                <h2
                  id="auth-yandex-heading"
                  className="text-center text-sm font-medium text-gray-400"
                >
                  Войти через Яндекс
                </h2>
                <div className="flex min-h-[48px] justify-center overflow-visible">
                  <YandexLoginButton parentId="yandex-login-auth-dialog" buttonSize="l" />
                </div>
              </section>
            ) : null}

            {authDialogOpen && hasYandex ? (
              <div className="relative">
                <div aria-hidden className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#0d1b2a] px-3 text-center text-xs font-medium tracking-wide text-gray-500">
                    или
                  </span>
                </div>
              </div>
            ) : null}

            <section
              aria-labelledby={hasYandex ? 'auth-email-heading' : undefined}
              aria-label={hasYandex ? undefined : 'Вход по email и паролю'}
              className={hasYandex ? 'space-y-4' : undefined}
            >
              {hasYandex ? (
                <h2
                  id="auth-email-heading"
                  className="text-center text-sm font-medium text-gray-400"
                >
                  Вход по email и паролю
                </h2>
              ) : null}
              <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor={emailId} className="block text-sm/6 font-medium text-gray-100">
                  Email (логин)
                </label>
                <div className="mt-2">
                  <input
                    id={emailId}
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                {mode === 'signin' ? (
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor={passwordId} className="block text-sm/6 font-medium text-gray-100">
                      Пароль
                    </label>
                    <button
                      type="button"
                      className="text-sm font-semibold text-indigo-400 hover:text-indigo-300"
                      onClick={() => setFormError('Восстановление пароля — в разработке')}
                    >
                      Забыли пароль?
                    </button>
                  </div>
                ) : (
                  <label htmlFor={passwordId} className="block text-sm/6 font-medium text-gray-100">
                    Пароль
                  </label>
                )}
                <div className="mt-2">
                  <input
                    id={passwordId}
                    type="password"
                    name="password"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>

              {mode === 'signup' ? (
                <div>
                  <label htmlFor={password2Id} className="block text-sm/6 font-medium text-gray-100">
                    Повторите пароль
                  </label>
                  <div className="mt-2">
                    <input
                      id={password2Id}
                      type="password"
                      name="password2"
                      autoComplete="new-password"
                      required
                      value={password2}
                      onChange={(e) => setPassword2(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </div>
              ) : null}

              {formError ? <p className="text-sm text-rose-400">{formError}</p> : null}

              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                {mode === 'signin' ? 'Войти' : 'Зарегистрироваться'}
              </button>
            </form>
            </section>

            <p className="pt-2 text-center text-sm/6 text-gray-400">
              {mode === 'signin' ? (
                <>
                  Нет аккаунта?{' '}
                  <button
                    type="button"
                    className="font-semibold text-indigo-400 hover:text-indigo-300"
                    onClick={() => openAuthDialog({ mode: 'signup' })}
                  >
                    Зарегистрируйтесь
                  </button>
                </>
              ) : (
                <>
                  Уже есть аккаунт?{' '}
                  <button
                    type="button"
                    className="font-semibold text-indigo-400 hover:text-indigo-300"
                    onClick={() => openAuthDialog({ mode: 'signin' })}
                  >
                    Войти
                  </button>
                </>
              )}
            </p>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
