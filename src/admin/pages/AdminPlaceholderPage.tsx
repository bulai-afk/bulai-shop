import { useParams } from 'react-router-dom'

type AdminPlaceholderPageProps = {
  title: string
}

export function AdminPlaceholderPage({ title }: AdminPlaceholderPageProps) {
  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-2 text-sm text-gray-400">Раздел в разработке.</p>
      </div>
    </div>
  )
}

export function AdminTeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const label =
    teamId === 'heroicons'
      ? 'Heroicons'
      : teamId === 'tailwind'
        ? 'Tailwind Labs'
        : teamId === 'workcation'
          ? 'Workcation'
          : teamId ?? 'Команда'

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-white">{label}</h1>
        <p className="mt-2 text-sm text-gray-400">Раздел в разработке.</p>
      </div>
    </div>
  )
}
