import type { ForecastView } from '#/lib/forecast-view'
import { MAIN_FORECAST_DAYS } from '#/lib/forecast-view'
import { DailyTable, HourlyTable } from './ForecastTables'

export function TablesSection({ view }: { view: ForecastView }) {
  const mainHourly = view.hourly.filter((p) => !p.extended)
  const mainDaily = view.daily.filter((d) => !d.extended)
  const extendedDaily = view.daily.filter((d) => d.extended)

  return (
    <>
      <section>
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
    </>
  )
}
