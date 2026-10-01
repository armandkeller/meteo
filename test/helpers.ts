import type { NormalizedForecast } from '../src/types/forecast'

// Prévision d'un modèle pour une heure, toutes les variables à null sauf
// celles passées dans `values`.
export function forecast(
  source: string,
  time: string,
  values: Partial<NormalizedForecast> = {},
): NormalizedForecast {
  return {
    source,
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
    ...values,
  }
}
