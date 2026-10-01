import type { NormalizedForecast } from '../types/forecast'

// fetchForecast doit couvrir toute la journée locale en cours, heures
// passées comprises (Open-Meteo : past_days=1) : dans le résumé journalier,
// un modèle sans ses 24 heures est écarté du jour.
export interface WeatherProvider {
  name: string
  fetchForecast(lat: number, lon: number): Promise<NormalizedForecast[]>
}
