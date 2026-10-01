import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { AppHeader } from '#/components/AppHeader'
import { ChartsSection } from '#/components/ChartsSection'
import { IllustratedView } from '#/components/illustrated/IllustratedView'
import { TablesSection } from '#/components/TablesSection'
import type { ViewMode } from '#/components/ViewToggle'
import {
  DEFAULT_VIEW_MODE,
  parseViewMode,
  ViewToggle,
} from '#/components/ViewToggle'
import { MODEL_LABELS } from '#/lib/fields'
import { isValidTimeZone } from '#/lib/validation'
import { getForecastFn } from '#/lib/weather.functions'

type PrevisionSearch = {
  name: string
  country: string
  admin1?: string
  lat: number
  lon: number
  tz: string
  view?: ViewMode // absent : vue illustrée
}

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : NaN
}

function validateSearch(search: Record<string, unknown>): PrevisionSearch {
  const lat = toNumber(search.lat)
  const lon = toNumber(search.lon)
  if (
    Number.isNaN(lat) ||
    Math.abs(lat) > 90 ||
    Number.isNaN(lon) ||
    Math.abs(lon) > 180
  ) {
    throw new Error('Coordonnées invalides')
  }
  const tz =
    typeof search.tz === 'string' && isValidTimeZone(search.tz)
      ? search.tz
      : 'UTC'
  return {
    name: typeof search.name === 'string' ? search.name : 'Lieu',
    country: typeof search.country === 'string' ? search.country : '',
    admin1: typeof search.admin1 === 'string' ? search.admin1 : undefined,
    lat,
    lon,
    tz,
    view: parseViewMode(search.view),
  }
}

const forecastQuery = (lat: number, lon: number, timeZone: string) =>
  queryOptions({
    queryKey: ['forecast', lat, lon, timeZone],
    queryFn: () => getForecastFn({ data: { lat, lon, timeZone } }),
    staleTime: 10 * 60 * 1000,
  })

export const Route = createFileRoute('/prevision')({
  validateSearch,
  loaderDeps: ({ search }) => ({
    lat: search.lat,
    lon: search.lon,
    tz: search.tz,
  }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      forecastQuery(deps.lat, deps.lon, deps.tz),
    ),
  head: ({ match }) => ({
    meta: [{ title: `${match.search.name} – Météo multi-modèles` }],
  }),
  component: PrevisionPage,
  pendingComponent: () => (
    <Shell>
      <p className="py-16 text-center text-slate-500">
        Chargement des modèles…
      </p>
    </Shell>
  ),
  errorComponent: ({ error, reset }) => (
    <Shell>
      <div className="my-8 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
        <p className="font-medium">Impossible de charger la prévision.</p>
        <p className="mt-1 text-sm">
          {error instanceof Error ? error.message : String(error)}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-3 rounded-md bg-rose-700 px-3 py-1.5 text-sm text-white hover:bg-rose-800"
        >
          Réessayer
        </button>
      </div>
    </Shell>
  ),
})

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 pb-16">{children}</main>
    </>
  )
}

function PrevisionPage() {
  const search = Route.useSearch()
  const { data: view } = useSuspenseQuery(
    forecastQuery(search.lat, search.lon, search.tz),
  )
  const mode = search.view ?? DEFAULT_VIEW_MODE

  return (
    <Shell>
      <section className="flex flex-col gap-2 py-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{search.name}</h1>
          <p className="text-slate-600">
            {[search.admin1, search.country].filter(Boolean).join(', ')}
            <span className="text-slate-400">
              {' '}
              · {search.lat.toFixed(2)}, {search.lon.toFixed(2)} · heures
              locales ({view.timeZone})
            </span>
          </p>
        </div>
        <p className="text-sm text-slate-500">
          {view.models.length} modèle{view.models.length > 1 ? 's' : ''} :{' '}
          {view.models.map((m) => MODEL_LABELS[m] ?? m).join(', ')}
        </p>
      </section>

      {view.failures.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Source indisponible :{' '}
          {view.failures.map((f) => `${f.source} (${f.message})`).join(', ')}.
          Les autres sources sont affichées.
        </div>
      )}

      <div className="mb-5">
        <ViewToggle current={mode} />
      </div>

      {mode === 'illu' && (
        <IllustratedView view={view} lat={search.lat} lon={search.lon} />
      )}
      {mode === 'graph' && <ChartsSection view={view} />}
      {mode === 'table' && <TablesSection view={view} />}
    </Shell>
  )
}
