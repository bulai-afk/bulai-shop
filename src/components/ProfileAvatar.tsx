import type { AuthUser } from '../context/AuthContext'

export function avatarInitials(email: string): string {
  const local = email.split('@')[0]?.trim() ?? ''
  if (!local) return '?'
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0]![0]
    const b = parts[1]![0]
    if (a && b) return (a + b).toUpperCase()
  }
  return local.slice(0, 2).toUpperCase()
}

const DEFAULT_AVATAR_SIZE = 'size-6'

export function ProfileAvatar({
  user,
  sizeClass = DEFAULT_AVATAR_SIZE,
}: {
  user: AuthUser
  /** Tailwind size utility, e.g. `size-6`, `size-9` */
  sizeClass?: string
}) {
  if (user.yandexAvatarUrl) {
    return (
      <img
        src={user.yandexAvatarUrl}
        alt=""
        className={`${sizeClass} shrink-0 rounded-full object-cover ring-1 ring-white/30`}
      />
    )
  }
  const initialsText =
    sizeClass === DEFAULT_AVATAR_SIZE ? 'text-[9px] sm:text-[10px]' : 'text-xs sm:text-sm'
  return (
    <span
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-white/20 font-semibold text-white ring-1 ring-white/30 ${initialsText}`}
      aria-hidden
    >
      {avatarInitials(user.email)}
    </span>
  )
}
