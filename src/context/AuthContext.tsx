import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  deriveProfileFromYandexLoginInfo,
  emailFromYandexInfo,
  extractYandexOAuthToken,
  fetchYandexLoginInfo,
} from '../api/yandexLoginInfo'
import { YANDEX_AUTH_SUCCESS_PARAM } from '../constants/yandexAuth'

const STORAGE_KEY = 'bulai-shop-auth'

export type AuthUser = {
  email: string
  provider: 'email' | 'yandex'
  /** Поля из login.yandex.ru/info (права задаются в кабинете OAuth) */
  yandexLogin?: string
  displayName?: string
  yandexId?: string
  realName?: string
  firstName?: string
  lastName?: string
  /** Список email из API (если выдано право) */
  emails?: string[]
  yandexAvatarUrl?: string
  phone?: string
  birthday?: string
  sex?: 'male' | 'female' | null
  /** Адрес доставки: не из стандартного /info; может прийти от прокси/бэкенда */
  deliveryAddress?: string
}

type AuthDialogOptions = {
  mode?: 'signin' | 'signup'
}

type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  hydrated: boolean
  authDialogOpen: boolean
  authDialogMode: 'signin' | 'signup'
  openAuthDialog: (options?: AuthDialogOptions) => void
  closeAuthDialog: () => void
  logout: () => void
  signInWithEmail: (email: string, _password: string) => void
  signUpWithEmail: (email: string, _password: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthUser
    if (parsed?.email && (parsed.provider === 'email' || parsed.provider === 'yandex')) {
      const u: AuthUser = {
        email: String(parsed.email),
        provider: parsed.provider,
      }
      if (typeof parsed.yandexLogin === 'string') u.yandexLogin = parsed.yandexLogin
      if (typeof parsed.displayName === 'string') u.displayName = parsed.displayName
      if (typeof parsed.yandexId === 'string') u.yandexId = parsed.yandexId
      if (typeof parsed.realName === 'string') u.realName = parsed.realName
      if (typeof parsed.firstName === 'string') u.firstName = parsed.firstName
      if (typeof parsed.lastName === 'string') u.lastName = parsed.lastName
      if (Array.isArray(parsed.emails) && parsed.emails.every((e) => typeof e === 'string')) {
        u.emails = parsed.emails as string[]
      }
      if (typeof parsed.yandexAvatarUrl === 'string') u.yandexAvatarUrl = parsed.yandexAvatarUrl
      if (typeof parsed.phone === 'string') u.phone = parsed.phone
      if (typeof parsed.birthday === 'string') u.birthday = parsed.birthday
      if (parsed.sex === 'male' || parsed.sex === 'female' || parsed.sex === null) u.sex = parsed.sex
      if (typeof parsed.deliveryAddress === 'string') u.deliveryAddress = parsed.deliveryAddress
      return u
    }
  } catch {
    // ignore
  }
  return null
}

function persistUser(user: AuthUser | null) {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  else localStorage.removeItem(STORAGE_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [authDialogMode, setAuthDialogMode] = useState<'signin' | 'signup'>('signin')

  useEffect(() => {
    setUser(readStoredUser())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const onYandex = (ev: Event) => {
      void (async () => {
        const detail = (ev as CustomEvent<unknown>).detail as Record<string, unknown> | undefined

        let email: string | null = null
        let yandexExtra: Partial<AuthUser> = {}

        const token = extractYandexOAuthToken(detail)
        if (token) {
          try {
            const info = await fetchYandexLoginInfo(token)
            email = emailFromYandexInfo(info)
            yandexExtra = deriveProfileFromYandexLoginInfo(info)
          } catch (err) {
            if (import.meta.env.DEV) {
              // eslint-disable-next-line no-console
              console.warn('[Yandex] login.yandex.ru/info:', err)
            }
          }
        }

        if (!email && detail) {
          const raw =
            typeof detail.default_email === 'string'
              ? detail.default_email
              : typeof detail.login === 'string'
                ? `${detail.login}@yandex.ru`
                : null
          if (raw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) email = raw
        }

        const nextUser: AuthUser = {
          email: email ?? 'yandex@id.yandex',
          provider: 'yandex',
          ...yandexExtra,
        }
        setUser(nextUser)
        persistUser(nextUser)
        setAuthDialogOpen(false)

        const params = new URLSearchParams(location.search)
        params.set(YANDEX_AUTH_SUCCESS_PARAM, '1')
        const q = params.toString()
        navigate(
          { pathname: location.pathname, search: q ? `?${q}` : '', hash: location.hash },
          { replace: true },
        )
      })()
    }
    window.addEventListener('yandex-auth-suggest', onYandex)
    return () => window.removeEventListener('yandex-auth-suggest', onYandex)
  }, [hydrated, location.pathname, location.search, location.hash, navigate])

  const openAuthDialog = useCallback((options?: AuthDialogOptions) => {
    setAuthDialogMode(options?.mode ?? 'signin')
    setAuthDialogOpen(true)
  }, [])

  const closeAuthDialog = useCallback(() => {
    setAuthDialogOpen(false)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    persistUser(null)
  }, [])

  const signInWithEmail = useCallback((email: string, _password: string) => {
    const trimmed = email.trim()
    if (!trimmed) return
    const next: AuthUser = { email: trimmed, provider: 'email' }
    setUser(next)
    persistUser(next)
    setAuthDialogOpen(false)
  }, [])

  const signUpWithEmail = useCallback((email: string, _password: string) => {
    signInWithEmail(email, _password)
  }, [signInWithEmail])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      hydrated,
      authDialogOpen,
      authDialogMode,
      openAuthDialog,
      closeAuthDialog,
      logout,
      signInWithEmail,
      signUpWithEmail,
    }),
    [
      user,
      hydrated,
      authDialogOpen,
      authDialogMode,
      openAuthDialog,
      closeAuthDialog,
      logout,
      signInWithEmail,
      signUpWithEmail,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
