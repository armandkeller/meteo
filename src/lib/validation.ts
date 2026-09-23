function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone })
    return true
  } catch {
    return false
  }
}

export function validateCityQuery(data: unknown): { query: string } {
  if (!isRecord(data) || typeof data.query !== 'string') {
    throw new Error('Paramètre "query" manquant')
  }
  return { query: data.query.trim().slice(0, 100) }
}

export function validateForecastInput(data: unknown): {
  lat: number
  lon: number
  timeZone: string
} {
  if (!isRecord(data)) throw new Error('Paramètres de prévision manquants')
  const { lat, lon, timeZone } = data
  if (typeof lat !== 'number' || !Number.isFinite(lat) || Math.abs(lat) > 90) {
    throw new Error('Latitude invalide')
  }
  if (typeof lon !== 'number' || !Number.isFinite(lon) || Math.abs(lon) > 180) {
    throw new Error('Longitude invalide')
  }
  if (typeof timeZone !== 'string' || !isValidTimeZone(timeZone)) {
    throw new Error('Fuseau horaire invalide')
  }
  return { lat, lon, timeZone }
}
