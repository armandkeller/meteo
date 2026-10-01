import { Link } from '@tanstack/react-router'

export type ViewMode = 'illu' | 'graph' | 'table'

// Vue affichée par défaut (paramètre `view` absent de l'URL).
export const DEFAULT_VIEW_MODE: ViewMode = 'illu'

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: 'illu', label: 'Illustré' },
  { id: 'graph', label: 'Graphiques' },
  { id: 'table', label: 'Tableaux' },
]

export function parseViewMode(value: unknown): ViewMode | undefined {
  return VIEW_MODES.find((m) => m.id === value)?.id
}

export function ViewToggle({ current }: { current: ViewMode }) {
  return (
    <nav aria-label="Affichage de la prévision">
      <ul className="m-0 inline-flex list-none gap-1 rounded-full bg-white p-1 ring-1 ring-slate-200">
        {VIEW_MODES.map((mode) => {
          const active = mode.id === current
          return (
            <li key={mode.id}>
              <Link
                from="/prevision"
                to="/prevision"
                search={(prev) => ({
                  ...prev,
                  view: mode.id === DEFAULT_VIEW_MODE ? undefined : mode.id,
                })}
                // Sans cela, le lien « Illustré » (sans `view`) serait actif
                // sur toutes les vues. Le lien actif reçoit aria-current.
                activeOptions={{ explicitUndefined: true }}
                replace
                resetScroll={false}
                className={`inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-bold no-underline ${
                  active ? 'bg-ink text-white' : 'text-ink hover:bg-slate-100'
                }`}
              >
                {mode.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
