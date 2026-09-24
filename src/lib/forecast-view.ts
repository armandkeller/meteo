import type { AggregatedValue, NormalizedForecast } from '../types/forecast'
import type { Confidence, DailyField, ForecastField } from './aggregate'
import {
  aggregateByDay,
  aggregateByHour,
  confidence,
  DAILY_FIELDS,
  DAILY_SPREAD_THRESHOLDS,
  FORECAST_FIELDS,
  HOURLY_SPREAD_THRESHOLDS,
  localDate,
} from './aggregate'

// Nombre de jours (dates locales) présentés comme prévision principale.
// Les jours suivants sont affichés à part, avec une confiance réduite.
export const MAIN_FORECAST_DAYS = 7

export type RatedValue = AggregatedValue & { confidence: Confidence }

export type HourlyPoint = {
  time: string // ISO 8601 UTC
  date: string // AAAA-MM-JJ dans le fuseau de la ville
  extended: boolean // jours 8 à 16
  values: Record<ForecastField, RatedValue>
}

export type DailyPoint = {
  date: string
  hourCount: number
  extended: boolean
  values: Record<DailyField, RatedValue>
}

export type SourceFailure = { source: string; message: string }

export type ForecastView = {
  timeZone: string
  models: string[] // modèles ayant fourni au moins une valeur
  failures: SourceFailure[]
  hourly: HourlyPoint[]
  daily: DailyPoint[]
}

// Début de l'heure en cours (UTC) : l'API renvoie les heures depuis minuit UTC.
export function currentHourIso(now: Date = new Date()): string {
  const d = new Date(now)
  d.setUTCMinutes(0, 0, 0)
  return d.toISOString()
}

// `from` (ISO UTC) : les heures antérieures sont écartées. Les heures
// sont au format ISO UTC normalisé, la comparaison de chaînes suffit.
export function buildForecastView(
  allForecasts: NormalizedForecast[],
  timeZone: string,
  failures: SourceFailure[] = [],
  from?: string,
): ForecastView {
  const forecasts =
    from === undefined
      ? allForecasts
      : allForecasts.filter((f) => f.time >= from)
  const byField = new Map(
    FORECAST_FIELDS.map((field) => [field, aggregateByHour(forecasts, field)]),
  )
  const times = [...new Set(forecasts.map((f) => f.time))].sort()
  const dates = [...new Set(times.map((t) => localDate(t, timeZone)))].sort()
  const extendedDates = new Set(dates.slice(MAIN_FORECAST_DAYS))

  const hourly = times.map((time): HourlyPoint => {
    const date = localDate(time, timeZone)
    const extended = extendedDates.has(date)
    const values = {} as Record<ForecastField, RatedValue>
    for (const field of FORECAST_FIELDS) {
      const value = byField.get(field)?.get(time) ?? {
        median: null,
        min: null,
        max: null,
        modelCount: 0,
      }
      values[field] = {
        ...value,
        confidence: confidence(
          value,
          HOURLY_SPREAD_THRESHOLDS[field],
          extended,
        ),
      }
    }
    return { time, date, extended, values }
  })

  const daily = aggregateByDay(forecasts, timeZone).map((day): DailyPoint => {
    const extended = extendedDates.has(day.date)
    const values = {} as Record<DailyField, RatedValue>
    for (const field of DAILY_FIELDS) {
      values[field] = {
        ...day.values[field],
        confidence: confidence(
          day.values[field],
          DAILY_SPREAD_THRESHOLDS[field],
          extended,
        ),
      }
    }
    return { date: day.date, hourCount: day.hourCount, extended, values }
  })

  const models = [
    ...new Set(
      forecasts
        .filter((f) => FORECAST_FIELDS.some((field) => f[field] !== null))
        .map((f) => f.source),
    ),
  ]

  return { timeZone, models, failures, hourly, daily }
}
