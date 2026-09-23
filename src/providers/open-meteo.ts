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

// TODO : découper les clés `{variable}_{modele}` en NormalizedForecast[]
export function normalize(_raw: unknown): NormalizedForecast[] {
  throw new Error('Not implemented')
}

export const openMeteoProvider: WeatherProvider = {
  name: 'open-meteo',
  async fetchForecast(lat, lon) {
    const res = await fetch(buildUrl(lat, lon))
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
    return normalize(await res.json())
  },
}
