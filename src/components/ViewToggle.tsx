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

const ITEM_CLASS =
  'inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-bold no-underline'

export function ViewToggle({ current }: { current: ViewMode }) {
  return (
    <nav aria-label="Affichage de la prévision">
      <ul className="m-0 inline-flex list-none gap-1 rounded-full bg-white p-1 ring-1 ring-slate-200">
        {VIEW_MODES.map((mode) => (
          <li key={mode.id}>
            {mode.id === current ? (
              // Vue courante : pas un lien, et aria-current ne dépend pas
              // de la correspondance d'URL du routeur (?view=illu explicite)
              <span
                aria-current="page"
                className={`${ITEM_CLASS} bg-ink text-white`}
              >
                {mode.label}
              </span>
            ) : (
              <Link
                from="/prevision"
                to="/prevision"
                search={(prev) => ({
                  ...prev,
                  view: mode.id === DEFAULT_VIEW_MODE ? undefined : mode.id,
                })}
                // Sans cela, le lien « Illustré » (sans `view`) serait marqué
                // actif (aria-current) sur toutes les vues
                activeOptions={{ explicitUndefined: true }}
                replace
                resetScroll={false}
                className={`${ITEM_CLASS} text-ink hover:bg-slate-100`}
              >
                {mode.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
