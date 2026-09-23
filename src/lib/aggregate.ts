import type { AggregatedValue, NormalizedForecast } from '../types/forecast'

export type ForecastField = keyof Omit<NormalizedForecast, 'source' | 'time'>

export const FORECAST_FIELDS = [
  'temp',
  'apparentTemp',
  'humidity',
  'precip',
  'rain',
  'snowfall',
  'cloudCover',
  'sunshine',
  'windSpeed',
  'windGusts',
] as const satisfies readonly ForecastField[]

export type Confidence = 'elevee' | 'moyenne' | 'faible'

// En dessous de ce nombre de modèles : confiance faible quel que soit l'écart.
export const MIN_MODELS_FOR_CONFIDENCE = 3

// Écart max − min toléré entre modèles : [confiance élevée, confiance moyenne].
// Au-delà du second seuil : confiance faible.
export type SpreadThresholds = readonly [high: number, medium: number]

export const HOURLY_SPREAD_THRESHOLDS: Record<ForecastField, SpreadThresholds> = {
  temp: [3, 6], // °C
  apparentTemp: [4, 8], // °C
  humidity: [10, 20], // %
  precip: [0.5, 2], // mm
  rain: [0.5, 2], // mm
  snowfall: [0.3, 1], // cm
  cloudCover: [25, 50], // %
  sunshine: [900, 1800], // s
  windSpeed: [8, 15], // km/h
  windGusts: [12, 25], // km/h
}

// Médiane en ignorant les null (jamais traités comme 0).
// Nombre pair de valeurs : moyenne des deux valeurs centrales.
export function median(values: (number | null)[]): number | null {
  const sorted = values
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

// Médiane / min / max / nombre de modèles, en ignorant les null.
export function summarize(values: (number | null)[]): AggregatedValue {
  const available = values.filter((v): v is number => v !== null)
  return {
    median: median(available),
    min: available.length > 0 ? Math.min(...available) : null,
    max: available.length > 0 ? Math.max(...available) : null,
    modelCount: available.length,
  }
}

// Regroupe par heure et calcule médiane / min / max / nombre de modèles.
// Une heure dont tous les modèles sont null est conservée
// (valeurs null, modelCount 0). Les clés suivent l'ordre chronologique.
export function aggregateByHour(
  forecasts: NormalizedForecast[],
  field: ForecastField,
): Map<string, AggregatedValue> {
  const valuesByHour = new Map<string, (number | null)[]>()
  for (const forecast of forecasts) {
    const values = valuesByHour.get(forecast.time) ?? []
    values.push(forecast[field])
    valuesByHour.set(forecast.time, values)
  }

  const result = new Map<string, AggregatedValue>()
  const hours = [...valuesByHour.keys()].sort()
  for (const time of hours) {
    result.set(time, summarize(valuesByHour.get(time) ?? []))
  }
  return result
}

// Indice de confiance à partir de l'écart entre modèles et de leur nombre.
// `reduced` (jours 8 à 16) abaisse la confiance d'un cran.
export function confidence(
  value: AggregatedValue,
  thresholds: SpreadThresholds,
  reduced = false,
): Confidence {
  if (
    value.modelCount < MIN_MODELS_FOR_CONFIDENCE ||
    value.min === null ||
    value.max === null
  ) {
    return 'faible'
  }
  const spread = value.max - value.min
  const level: Confidence =
    spread <= thresholds[0]
      ? 'elevee'
      : spread <= thresholds[1]
        ? 'moyenne'
        : 'faible'
  if (!reduced) return level
  return level === 'elevee' ? 'moyenne' : 'faible'
}

// --- Résumé journalier ---------------------------------------------------

export const DAILY_FIELDS = [
  'tempMin',
  'tempMax',
  'precip',
  'snowfall',
  'sunshine',
  'windGustsMax',
] as const

export type DailyField = (typeof DAILY_FIELDS)[number]

export const DAILY_SPREAD_THRESHOLDS: Record<DailyField, SpreadThresholds> = {
  tempMin: [3, 6], // °C
  tempMax: [3, 6], // °C
  precip: [2, 6], // mm sur la journée
  snowfall: [1, 3], // cm sur la journée
  sunshine: [7200, 14400], // s sur la journée
  windGustsMax: [15, 30], // km/h
}

type DailyReducer = {
  field: ForecastField
  reduce: (values: number[]) => number
}

const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0)

const DAILY_REDUCERS: Record<DailyField, DailyReducer> = {
  tempMin: { field: 'temp', reduce: (v) => Math.min(...v) },
  tempMax: { field: 'temp', reduce: (v) => Math.max(...v) },
  precip: { field: 'precip', reduce: sum },
  snowfall: { field: 'snowfall', reduce: sum },
  sunshine: { field: 'sunshine', reduce: sum },
  windGustsMax: { field: 'windGusts', reduce: (v) => Math.max(...v) },
}

export type DailyAggregate = {
  date: string // AAAA-MM-JJ dans le fuseau de la ville
  hourCount: number // heures couvertes ce jour-là (journée partielle au début)
  values: Record<DailyField, AggregatedValue>
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>()

// Date locale (AAAA-MM-JJ) d'une heure UTC dans le fuseau donné.
export function localDate(isoTime: string, timeZone: string): string {
  let formatter = dateFormatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    dateFormatters.set(timeZone, formatter)
  }
  return formatter.format(new Date(isoTime))
}

// Calcule d'abord la valeur journalière de chaque modèle (min, max, cumul),
// puis la médiane entre modèles : la somme des médianes horaires n'est pas
// la médiane des cumuls. Un modèle ne compte pour un jour que s'il a une
// valeur pour toutes les heures de ce jour (sinon son cumul serait tronqué,
// typiquement en fin d'horizon).
export function aggregateByDay(
  forecasts: NormalizedForecast[],
  timeZone: string,
): DailyAggregate[] {
  const hoursByDate = new Map<string, Set<string>>()
  const byDateAndSource = new Map<string, Map<string, NormalizedForecast[]>>()
  for (const forecast of forecasts) {
    const date = localDate(forecast.time, timeZone)
    const hours = hoursByDate.get(date) ?? new Set<string>()
    hours.add(forecast.time)
    hoursByDate.set(date, hours)

    const bySource =
      byDateAndSource.get(date) ?? new Map<string, NormalizedForecast[]>()
    const list = bySource.get(forecast.source) ?? []
    list.push(forecast)
    bySource.set(forecast.source, list)
    byDateAndSource.set(date, bySource)
  }

  return [...hoursByDate.keys()].sort().map((date) => {
    const hourCount = hoursByDate.get(date)?.size ?? 0
    const bySource =
      byDateAndSource.get(date) ?? new Map<string, NormalizedForecast[]>()
    const values = {} as Record<DailyField, AggregatedValue>
    for (const dailyField of DAILY_FIELDS) {
      const { field, reduce } = DAILY_REDUCERS[dailyField]
      const perModel: (number | null)[] = []
      for (const list of bySource.values()) {
        const hourly = list
          .map((f) => f[field])
          .filter((v): v is number => v !== null)
        perModel.push(hourly.length === hourCount ? reduce(hourly) : null)
      }
      values[dailyField] = summarize(perModel)
    }
    return { date, hourCount, values }
  })
}
