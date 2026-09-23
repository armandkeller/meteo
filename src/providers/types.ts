import type { NormalizedForecast } from '../types/forecast'

export interface WeatherProvider {
  name: string
  fetchForecast(lat: number, lon: number): Promise<NormalizedForecast[]>
}
