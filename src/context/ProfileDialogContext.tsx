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
}

const ProfileDialogContext = createContext<ProfileDialogContextValue | null>(null)

const SAVE_TOAST_MS = 5500

export function ProfileDialogProvider({ children }: { children: ReactNode }) {
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [saveToastOpen, setSaveToastOpen] = useState(false)
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | 0>(0)

  const openProfileDialog = useCallback(() => setProfileDialogOpen(true), [])
  const closeProfileDialog = useCallback(() => setProfileDialogOpen(false), [])

  const dismissSaveToast = useCallback(() => {
    if (saveToastTimerRef.current) {
      window.clearTimeout(saveToastTimerRef.current)
      saveToastTimerRef.current = 0
    }
    setSaveToastOpen(false)
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

  useEffect(() => {
    return () => {
      if (saveToastTimerRef.current) window.clearTimeout(saveToastTimerRef.current)
    }
  }, [])

  const value = useMemo(
    () => ({
      profileDialogOpen,
      openProfileDialog,
      closeProfileDialog,
      showProfileSaveToast,
    }),
    [profileDialogOpen, openProfileDialog, closeProfileDialog, showProfileSaveToast],
  )

  return (
    <ProfileDialogContext.Provider value={value}>
      {children}
      <ProfileDialog />
      <ProfileSaveToast open={saveToastOpen} onDismiss={dismissSaveToast} />
    </ProfileDialogContext.Provider>
  )
}

export function useProfileDialog() {
  const ctx = useContext(ProfileDialogContext)
  if (!ctx) throw new Error('useProfileDialog must be used within ProfileDialogProvider')
  return ctx
}
