import type { Confidence, DailyField, ForecastField } from './aggregate'

export type FieldMeta = {
  label: string
  short: string
  unit: string
  decimals: number
  // Conversion pour l'affichage (ex. secondes d'ensoleillement → minutes)
  scale?: number
  // Cumul (affiché en barres / en escalier)
  cumulative?: boolean
  hint?: string
}

export const HOURLY_FIELD_META: Record<ForecastField, FieldMeta> = {
  temp: { label: 'Température', short: 'Temp.', unit: '°C', decimals: 1 },
  apparentTemp: {
    label: 'Température ressentie',
    short: 'Ressenti',
    unit: '°C',
    decimals: 1,
  },
  humidity: { label: 'Humidité', short: 'Humid.', unit: '%', decimals: 0 },
  precip: {
    label: 'Précipitations',
    short: 'Précip.',
    unit: 'mm',
    decimals: 1,
    cumulative: true,
    hint: "Cumul de l'heure précédente",
  },
  rain: {
    label: 'Pluie',
    short: 'Pluie',
    unit: 'mm',
    decimals: 1,
    cumulative: true,
    hint: "Cumul de l'heure précédente",
  },
  snowfall: {
    label: 'Neige',
    short: 'Neige',
    unit: 'cm',
    decimals: 1,
    cumulative: true,
    hint: "Cumul de l'heure précédente (en cm)",
  },
  cloudCover: {
    label: 'Couverture nuageuse',
    short: 'Nuages',
    unit: '%',
    decimals: 0,
  },
  sunshine: {
    label: 'Ensoleillement',
    short: 'Soleil',
    unit: 'min',
    decimals: 0,
    scale: 1 / 60,
    hint: "Minutes de soleil dans l'heure",
  },
  windSpeed: { label: 'Vent', short: 'Vent', unit: 'km/h', decimals: 0 },
  windGusts: { label: 'Rafales', short: 'Rafales', unit: 'km/h', decimals: 0 },
}

export const DAILY_FIELD_META: Record<DailyField, FieldMeta> = {
  tempMin: { label: 'Température min', short: 'Min', unit: '°C', decimals: 1 },
  tempMax: { label: 'Température max', short: 'Max', unit: '°C', decimals: 1 },
  precip: {
    label: 'Précipitations',
    short: 'Précip.',
    unit: 'mm',
    decimals: 1,
  },
  snowfall: { label: 'Neige', short: 'Neige', unit: 'cm', decimals: 1 },
  sunshine: {
    label: 'Ensoleillement',
    short: 'Soleil',
    unit: 'h',
    decimals: 1,
    scale: 1 / 3600,
  },
  windGustsMax: {
    label: 'Rafales max',
    short: 'Rafales',
    unit: 'km/h',
    decimals: 0,
  },
}

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  elevee: 'Confiance élevée',
  moyenne: 'Confiance moyenne',
  faible: 'Confiance faible',
}

export const MODEL_LABELS: Record<string, string> = {
  ecmwf_ifs025: 'ECMWF IFS',
  gfs_seamless: 'GFS (NOAA)',
  icon_seamless: 'ICON (DWD)',
  gem_seamless: 'GEM (Canada)',
  ukmo_seamless: 'UKMO (Met Office)',
  meteofrance_seamless: 'Météo-France',
}
