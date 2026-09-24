import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AppHeader } from '#/components/AppHeader'
import { ConfidenceBadge, ConfidenceLegend } from '#/components/Confidence'
import { ForecastChart } from '#/components/ForecastChart'
import { DailyTable, HourlyTable } from '#/components/ForecastTables'
import type { Confidence, ForecastField } from '#/lib/aggregate'
import { FORECAST_FIELDS } from '#/lib/aggregate'
import { HOURLY_FIELD_META, MODEL_LABELS } from '#/lib/fields'
import type { ForecastView } from '#/lib/forecast-view'
import { MAIN_FORECAST_DAYS } from '#/lib/forecast-view'
import { isValidTimeZone } from '#/lib/validation'
import { getForecastFn } from '#/lib/weather.functions'

type PrevisionSearch = {
  name: string
  country: string
  admin1?: string
  lat: number
  lon: number
  tz: string
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

// Part des heures (jours 1 à 7) à chaque niveau de confiance, pour le résumé.
function overallConfidence(
  view: ForecastView,
  field: ForecastField,
): Confidence {
  const main = view.hourly.filter(
    (p) => !p.extended && p.values[field].modelCount > 0,
  )
  if (main.length === 0) return 'faible'
  const counts = { elevee: 0, moyenne: 0, faible: 0 }
  for (const p of main) counts[p.values[field].confidence]++
  if (counts.elevee / main.length >= 0.6) return 'elevee'
  if ((counts.elevee + counts.moyenne) / main.length >= 0.6) return 'moyenne'
  return 'faible'
}

function PrevisionPage() {
  const search = Route.useSearch()
  const { data: view } = useSuspenseQuery(
    forecastQuery(search.lat, search.lon, search.tz),
  )
  const [field, setField] = useState<ForecastField>('temp')
  const [showExtended, setShowExtended] = useState(false)

  const mainHourly = view.hourly.filter((p) => !p.extended)
  const mainDaily = view.daily.filter((d) => !d.extended)
  const extendedDaily = view.daily.filter((d) => d.extended)
  const meta = HOURLY_FIELD_META[field]

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

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Variable affichée"
            className="flex flex-wrap gap-1"
          >
            {FORECAST_FIELDS.map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={f === field}
                onClick={() => setField(f)}
                className={`rounded-md px-2.5 py-1 text-sm ${
                  f === field
                    ? 'bg-sky-700 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {HOURLY_FIELD_META[f].label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showExtended}
              onChange={(e) => setShowExtended(e.target.checked)}
            />
            Inclure la tendance au-delà de {MAIN_FORECAST_DAYS} jours
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="font-medium">
            {meta.label} <span className="text-slate-400">({meta.unit})</span>
          </h2>
          <ConfidenceBadge level={overallConfidence(view, field)} />
          {meta.hint && (
            <span className="text-xs text-slate-500">{meta.hint}</span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Ligne : médiane des modèles. Zone colorée : écart entre le modèle le
          plus bas et le plus haut.
        </p>
        <div className="mt-3">
          <ForecastChart
            hourly={showExtended ? view.hourly : mainHourly}
            field={field}
            timeZone={view.timeZone}
          />
        </div>
        <div className="mt-3">
          <ConfidenceLegend />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">
          Résumé des {MAIN_FORECAST_DAYS} prochains jours
        </h2>
        <DailyTable daily={mainDaily} />
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-lg font-semibold">
          Prévisions heure par heure
        </h2>
        <p className="mb-3 text-sm text-slate-500">
          Survolez une valeur pour voir l'écart entre modèles.
        </p>
        <HourlyTable hourly={mainHourly} timeZone={view.timeZone} />
      </section>

      {extendedDaily.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-1 text-lg font-semibold">
            Tendance au-delà de {MAIN_FORECAST_DAYS} jours
          </h2>
          <div className="mb-3 rounded-lg border border-slate-200 bg-slate-100 p-3 text-sm text-slate-700">
            Au-delà de {MAIN_FORECAST_DAYS} jours, plusieurs modèles s'arrêtent
            et les autres divergent : la confiance est abaissée d'un cran, et
            reste faible quand moins de 3 modèles sont disponibles. À lire comme
            une tendance, pas comme une prévision.
          </div>
          <DailyTable daily={extendedDaily} />
        </section>
      )}
    </Shell>
  )
}
