import type { Location } from '../types/forecast'

export const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

export const MIN_QUERY_LENGTH = 2
const MAX_RESULTS = 10

export function buildGeocodingUrl(query: string): string {
  const params = new URLSearchParams({
    name: query,
    count: String(MAX_RESULTS),
    language: 'fr',
    format: 'json',
  })
  return `${GEOCODING_URL}?${params}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined

// Mappe la réponse vers Location[]. Les résultats sans nom ou sans
// coordonnées valides sont ignorés ; sans fuseau, on retombe sur UTC.
export function parseGeocoding(raw: unknown): Location[] {
  if (!isRecord(raw) || !Array.isArray(raw.results)) return []
  const locations: Location[] = []
  for (const result of raw.results) {
    if (!isRecord(result)) continue
    const name = optionalString(result.name)
    const { latitude, longitude } = result
    if (
      name === undefined ||
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      continue
    }
    locations.push({
      name,
      country:
        optionalString(result.country) ??
        optionalString(result.country_code) ??
        '',
      admin1: optionalString(result.admin1),
      latitude,
      longitude,
      timezone: optionalString(result.timezone) ?? 'UTC',
    })
  }
  return locations
}

export async function searchCities(query: string): Promise<Location[]> {
  const trimmed = query.trim()
  if (trimmed.length < MIN_QUERY_LENGTH) return []
  const res = await fetch(buildGeocodingUrl(trimmed))
  if (!res.ok) throw new Error(`Géocodage Open-Meteo ${res.status}`)
  return parseGeocoding(await res.json())
}
