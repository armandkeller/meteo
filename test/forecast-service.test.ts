import { describe, expect, it, vi } from 'vitest'
import { cacheKey, createForecastService } from '../src/lib/forecast.server'
import type { WeatherProvider } from '../src/providers/types'
import type { NormalizedForecast } from '../src/types/forecast'

const sample: NormalizedForecast = {
  source: 'ecmwf_ifs025',
  time: '2026-09-23T12:00:00.000Z',
  temp: 12,
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

function provider(
  name: string,
  impl: () => Promise<NormalizedForecast[]> = async () => [sample],
) {
  const fetchForecast = vi.fn(impl)
  const p: WeatherProvider = { name, fetchForecast }
  return { p, fetchForecast }
}

function clock() {
  let t = 0
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms
    },
  }
}

const MIN = 60 * 1000

describe('createForecastService', () => {
  it('fusionne les prévisions de toutes les sources', async () => {
    const a = provider('a')
    const b = provider('b', async () => [{ ...sample, source: 'gfs_seamless' }])
    const service = createForecastService([a.p, b.p])
    const { forecasts, failures } = await service.getForecasts(46.8, -71.2)
    expect(forecasts.map((f) => f.source)).toEqual([
      'ecmwf_ifs025',
      'gfs_seamless',
    ])
    expect(failures).toEqual([])
  })

  it('une source en échec ne fait pas planter les autres', async () => {
    const ok = provider('ok')
    const ko = provider('ko', async () => {
      throw new Error('Open-Meteo 503')
    })
    const service = createForecastService([ok.p, ko.p])
    const { forecasts, failures } = await service.getForecasts(46.8, -71.2)
    expect(forecasts).toHaveLength(1)
    expect(failures).toEqual([{ source: 'ko', message: 'Open-Meteo 503' }])
  })

  it('lève une erreur si toutes les sources échouent, sans la mettre en cache', async () => {
    let fail = true
    const flaky = provider('flaky', async () => {
      if (fail) throw new Error('timeout')
      return [sample]
    })
    const service = createForecastService([flaky.p])
    await expect(service.getForecasts(1, 2)).rejects.toThrow('timeout')
    fail = false
    await expect(service.getForecasts(1, 2)).resolves.toMatchObject({
      failures: [],
    })
    expect(flaky.fetchForecast).toHaveBeenCalledTimes(2)
  })

  it('met en cache environ 30 minutes par (lat, lon)', async () => {
    const a = provider('a')
    const c = clock()
    const service = createForecastService([a.p], { now: c.now })
    await service.getForecasts(46.8, -71.2)
    c.advance(29 * MIN)
    await service.getForecasts(46.8, -71.2)
    expect(a.fetchForecast).toHaveBeenCalledTimes(1)
    c.advance(2 * MIN)
    await service.getForecasts(46.8, -71.2)
    expect(a.fetchForecast).toHaveBeenCalledTimes(2)
  })

  it('distingue deux lieux différents', async () => {
    const a = provider('a')
    const service = createForecastService([a.p])
    await service.getForecasts(46.8, -71.2)
    await service.getForecasts(48.85, 2.35)
    expect(a.fetchForecast).toHaveBeenCalledTimes(2)
  })

  it('partage un même appel entre requêtes simultanées', async () => {
    const a = provider('a')
    const service = createForecastService([a.p])
    await Promise.all([service.getForecasts(1, 2), service.getForecasts(1, 2)])
    expect(a.fetchForecast).toHaveBeenCalledTimes(1)
  })

  it('garde moins longtemps un résultat partiel', async () => {
    const ok = provider('ok')
    const ko = provider('ko', async () => {
      throw new Error('down')
    })
    const c = clock()
    const service = createForecastService([ok.p, ko.p], { now: c.now })
    await service.getForecasts(1, 2)
    c.advance(6 * MIN)
    await service.getForecasts(1, 2)
    expect(ok.fetchForecast).toHaveBeenCalledTimes(2)
  })

  it('purge les entrées expirées', async () => {
    const c = clock()
    const service = createForecastService([provider('a').p], { now: c.now })
    await service.getForecasts(1, 2)
    await service.getForecasts(3, 4)
    expect(service.cacheSize()).toBe(2)
    c.advance(31 * MIN)
    await service.getForecasts(5, 6)
    expect(service.cacheSize()).toBe(1)
  })
})

describe('cacheKey', () => {
  it('arrondit à environ 100 m', () => {
    expect(cacheKey(46.81228, -71.21454)).toBe(cacheKey(46.8121, -71.2149))
    expect(cacheKey(46.81228, -71.21454)).not.toBe(cacheKey(46.82, -71.21454))
  })
})
