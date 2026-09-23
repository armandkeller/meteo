import { Link } from '@tanstack/react-router'
import { CitySearch } from './CitySearch'

export function AppHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
        <Link to="/" className="shrink-0 text-lg font-semibold text-slate-900">
          Météo multi-modèles
        </Link>
        <CitySearch />
      </div>
    </header>
  )
}
