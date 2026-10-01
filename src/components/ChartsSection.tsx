import { useState } from 'react'
import type { Confidence, ForecastField } from '#/lib/aggregate'
import { FORECAST_FIELDS } from '#/lib/aggregate'
import { HOURLY_FIELD_META } from '#/lib/fields'
import type { ForecastView } from '#/lib/forecast-view'
import { MAIN_FORECAST_DAYS } from '#/lib/forecast-view'
import { ConfidenceBadge, ConfidenceLegend } from './Confidence'
import { ForecastChart } from './ForecastChart'

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

export function ChartsSection({ view }: { view: ForecastView }) {
  const [field, setField] = useState<ForecastField>('temp')
  const [showExtended, setShowExtended] = useState(false)

  const mainHourly = view.hourly.filter((p) => !p.extended)
  const meta = HOURLY_FIELD_META[field]

  return (
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
  )
}
