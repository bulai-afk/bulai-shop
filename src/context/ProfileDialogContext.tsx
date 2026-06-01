import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ProfileDialog } from '../components/ProfileDialog'
import { ProfileSaveToast } from '../components/ProfileSaveToast'

type ProfileDialogContextValue = {
  profileDialogOpen: boolean
  openProfileDialog: () => void
  closeProfileDialog: () => void
  showProfileSaveToast: () => void
  showProfileErrorToast: (title?: string, message?: string) => void
}

const ProfileDialogContext = createContext<ProfileDialogContextValue | null>(null)

const SAVE_TOAST_MS = 5500

const ERROR_TOAST_TITLE = 'Не удалось сохранить на сервере'
const ERROR_TOAST_MESSAGE =
  'Данные сохранены только на этом устройстве. Проверьте соединение или попробуйте позже — запись в базу клиентов не прошла.'

export function ProfileDialogProvider({ children }: { children: ReactNode }) {
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [saveToastOpen, setSaveToastOpen] = useState(false)
  const [errorToastOpen, setErrorToastOpen] = useState(false)
  const [errorToastText, setErrorToastText] = useState({ title: ERROR_TOAST_TITLE, message: ERROR_TOAST_MESSAGE })
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | 0>(0)
  const errorToastTimerRef = useRef<ReturnType<typeof setTimeout> | 0>(0)

  const openProfileDialog = useCallback(() => setProfileDialogOpen(true), [])
  const closeProfileDialog = useCallback(() => setProfileDialogOpen(false), [])

  const dismissSaveToast = useCallback(() => {
    if (saveToastTimerRef.current) {
      window.clearTimeout(saveToastTimerRef.current)
      saveToastTimerRef.current = 0
    }
    setSaveToastOpen(false)
  }, [])

  const dismissErrorToast = useCallback(() => {
    if (errorToastTimerRef.current) {
      window.clearTimeout(errorToastTimerRef.current)
      errorToastTimerRef.current = 0
    }
    setErrorToastOpen(false)
  }, [])

  const showProfileSaveToast = useCallback(() => {
    setSaveToastOpen(true)
    if (saveToastTimerRef.current) {
      window.clearTimeout(saveToastTimerRef.current)
    }
    saveToastTimerRef.current = window.setTimeout(() => {
      saveToastTimerRef.current = 0
      setSaveToastOpen(false)
    }, SAVE_TOAST_MS)
  }, [])

  const showProfileErrorToast = useCallback((title = ERROR_TOAST_TITLE, message = ERROR_TOAST_MESSAGE) => {
    setErrorToastText({ title, message })
    setErrorToastOpen(true)
    if (errorToastTimerRef.current) {
      window.clearTimeout(errorToastTimerRef.current)
    }
    errorToastTimerRef.current = window.setTimeout(() => {
      errorToastTimerRef.current = 0
      setErrorToastOpen(false)
    }, SAVE_TOAST_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (saveToastTimerRef.current) window.clearTimeout(saveToastTimerRef.current)
      if (errorToastTimerRef.current) window.clearTimeout(errorToastTimerRef.current)
    }
  }, [])

  const value = useMemo(
    () => ({
      profileDialogOpen,
      openProfileDialog,
      closeProfileDialog,
      showProfileSaveToast,
      showProfileErrorToast,
    }),
    [profileDialogOpen, openProfileDialog, closeProfileDialog, showProfileSaveToast, showProfileErrorToast],
  )

  return (
    <ProfileDialogContext.Provider value={value}>
      {children}
      <ProfileDialog />
      <ProfileSaveToast open={saveToastOpen} onDismiss={dismissSaveToast} />
      <ProfileSaveToast
        open={errorToastOpen}
        onDismiss={dismissErrorToast}
        variant="error"
        title={errorToastText.title}
        message={errorToastText.message}
      />
    </ProfileDialogContext.Provider>
  )
}

export function useProfileDialog() {
  const ctx = useContext(ProfileDialogContext)
  if (!ctx) throw new Error('useProfileDialog must be used within ProfileDialogProvider')
  return ctx
}
