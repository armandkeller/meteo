import { providers } from '../providers'
import type { WeatherProvider } from '../providers/types'
import type { NormalizedForecast } from '../types/forecast'
import type { SourceFailure } from './forecast-view'

export type FetchResult = {
  forecasts: NormalizedForecast[]
  failures: SourceFailure[]
}

type CacheEntry = { expiresAt: number; promise: Promise<FetchResult> }

export type ForecastServiceOptions = {
  ttlMs?: number // résultat complet
  partialTtlMs?: number // au moins une source en échec : réessayer plus tôt
  now?: () => number
}

const THIRTY_MINUTES = 30 * 60 * 1000
const FIVE_MINUTES = 5 * 60 * 1000

// Environ 100 m : deux recherches de la même ville partagent le cache.
export function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`
}

// Interroge toutes les sources (Promise.allSettled : une source en échec
// ne fait pas planter les autres) avec un cache mémoire par (lat, lon).
// Les appels concurrents pour le même point partagent la même promesse.
// Si toutes les sources échouent, l'erreur est levée et rien n'est mis en cache.
export function createForecastService(
  sources: WeatherProvider[],
  {
    ttlMs = THIRTY_MINUTES,
    partialTtlMs = FIVE_MINUTES,
    now = Date.now,
  }: ForecastServiceOptions = {},
) {
  const cache = new Map<string, CacheEntry>()

  async function fetchAll(lat: number, lon: number): Promise<FetchResult> {
    const results = await Promise.allSettled(
      sources.map((source) => source.fetchForecast(lat, lon)),
    )
    const forecasts: NormalizedForecast[] = []
    const failures: SourceFailure[] = []
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        forecasts.push(...result.value)
      } else {
        const reason: unknown = result.reason
        failures.push({
          source: sources[i].name,
          message: reason instanceof Error ? reason.message : String(reason),
        })
      }
    })
    if (forecasts.length === 0 && failures.length > 0) {
      throw new Error(
        `Aucune source disponible : ${failures.map((f) => `${f.source} (${f.message})`).join(', ')}`,
      )
    }
    return { forecasts, failures }
  }

  function purgeExpired(at: number) {
    for (const [key, entry] of cache) {
      if (entry.expiresAt <= at) cache.delete(key)
    }
  }

  return {
    getForecasts(lat: number, lon: number): Promise<FetchResult> {
      const at = now()
      purgeExpired(at)
      const key = cacheKey(lat, lon)
      const cached = cache.get(key)
      if (cached) return cached.promise

      const promise = fetchAll(lat, lon)
      const entry: CacheEntry = { expiresAt: at + ttlMs, promise }
      cache.set(key, entry)
      promise.then(
        (result) => {
          if (result.failures.length > 0) {
            entry.expiresAt = Math.min(entry.expiresAt, at + partialTtlMs)
          }
        },
        () => {
          if (cache.get(key) === entry) cache.delete(key)
        },
      )
      return promise
    },
    cacheSize: () => cache.size,
  }
}

export const forecastService = createForecastService(providers)
