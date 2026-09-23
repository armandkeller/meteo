import type { Location } from '../types/forecast'

export const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

// TODO : appeler l'API (name, count, language=fr) et mapper vers Location[]
export async function searchCities(_query: string): Promise<Location[]> {
  throw new Error('Not implemented')
}
