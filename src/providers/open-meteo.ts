import type { NormalizedForecast } from '../types/forecast'
import type { WeatherProvider } from './types'

const BASE_URL = 'https://api.open-meteo.com/v1/forecast'

export const MODELS = [
  'ecmwf_ifs025',
  'gfs_seamless',
  'icon_seamless',
  'gem_seamless',
  'ukmo_seamless',
  'meteofrance_seamless',
] as const

export const HOURLY_VARIABLES = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'precipitation',
  'rain',
  'snowfall',
  'cloud_cover',
  'sunshine_duration',
  'wind_speed_10m',
  'wind_gusts_10m',
] as const

// Pas de paramètre timezone : les heures restent en UTC.
export function buildUrl(lat: number, lon: number, forecastDays = 16): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: HOURLY_VARIABLES.join(','),
    models: MODELS.join(','),
    forecast_days: String(forecastDays),
  })
  return `${BASE_URL}?${params}`
}

type HourlyVariable = (typeof HOURLY_VARIABLES)[number]

const FIELD_BY_VARIABLE = {
  temperature_2m: 'temp',
  apparent_temperature: 'apparentTemp',
  relative_humidity_2m: 'humidity',
  precipitation: 'precip',
  rain: 'rain',
  snowfall: 'snowfall',
  cloud_cover: 'cloudCover',
  sunshine_duration: 'sunshine',
  wind_speed_10m: 'windSpeed',
  wind_gusts_10m: 'windGusts',
} as const satisfies Record<HourlyVariable, keyof NormalizedForecast>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// L'API renvoie "2026-09-23T02:00" sans offset : on l'interprète en UTC
// (corrigé de utc_offset_seconds, qui vaut 0 sans paramètre timezone).
function toUtcIso(time: string, utcOffsetSeconds: number): string {
  const ms = Date.parse(`${time}Z`)
  if (Number.isNaN(ms)) throw new Error(`Open-Meteo : heure invalide "${time}"`)
  return new Date(ms - utcOffsetSeconds * 1000).toISOString()
}

// Découpe les clés `{variable}_{modele}` en NormalizedForecast[].
// Un modèle absent de la réponse est ignoré ; une variable absente
// ou une valeur non numérique donne null (jamais 0).
export function normalize(raw: unknown): NormalizedForecast[] {
  if (!isRecord(raw) || !isRecord(raw.hourly)) {
    throw new Error('Open-Meteo : champ "hourly" manquant')
  }
  const hourly = raw.hourly
  const times = hourly.time
  if (!Array.isArray(times) || !times.every((t) => typeof t === 'string')) {
    throw new Error('Open-Meteo : tableau "hourly.time" invalide')
  }
  const offset =
    typeof raw.utc_offset_seconds === 'number' ? raw.utc_offset_seconds : 0
  const utcTimes = times.map((t: string) => toUtcIso(t, offset))

  const forecasts: NormalizedForecast[] = []
  for (const model of MODELS) {
    const series = new Map<HourlyVariable, unknown[]>()
    for (const variable of HOURLY_VARIABLES) {
      const values = hourly[`${variable}_${model}`]
      if (Array.isArray(values)) series.set(variable, values)
    }
    if (series.size === 0) continue

    utcTimes.forEach((time, i) => {
      const forecast: NormalizedForecast = {
        source: model,
        time,
        temp: null,
        apparentTemp: null,
        humidity: null,
        precip: null,
        rain: null,
        snowfall: null,
        cloudCover: null,
        sunshine: null,
        windSpeed: null,
        windGusts: null,
      }
      for (const [variable, values] of series) {
        const value = values[i]
        forecast[FIELD_BY_VARIABLE[variable]] =
          typeof value === 'number' && Number.isFinite(value) ? value : null
      }
      forecasts.push(forecast)
    })
  }
  return forecasts
}

export const openMeteoProvider: WeatherProvider = {
  name: 'open-meteo',
  async fetchForecast(lat, lon) {
    const res = await fetch(buildUrl(lat, lon))
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
    return normalize(await res.json())
  },
}
