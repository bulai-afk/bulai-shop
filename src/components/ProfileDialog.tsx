import { useProfileDialog } from '../context/ProfileDialogContext'
import { ProfileForm } from '../pages/ProfilePage'
import { ProfileSettingsDialog } from './ProfileSettingsDialog'

export function ProfileDialog() {
  const { profileDialogOpen, closeProfileDialog, showProfileSaveToast, showProfileErrorToast } =
    useProfileDialog()

  return (
    <ProfileSettingsDialog open={profileDialogOpen} onClose={closeProfileDialog}>
      <ProfileForm
        onStorefrontSaveDone={({ serverSyncOk }) => {
          closeProfileDialog()
          if (serverSyncOk) showProfileSaveToast()
          else showProfileErrorToast()
        }}
      />
    </ProfileSettingsDialog>
  )
}
