import { describe, expect, it } from 'vitest'
import {
  MAIN_FORECAST_DAYS,
  buildForecastView,
  currentHourIso,
} from '../src/lib/forecast-view'
import { normalize } from '../src/providers/open-meteo'
import type { NormalizedForecast } from '../src/types/forecast'
import fixture from './fixtures/openmeteo-quebec-sec.json'

function forecast(
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

// `days` jours de 24 h à partir du 23 septembre 00:00 UTC, pour `models` modèles
function series(days: number, models: string[], temp = 15): NormalizedForecast[] {
  const start = Date.parse('2026-09-23T00:00:00.000Z')
  return models.flatMap((source) =>
    Array.from({ length: days * 24 }, (_, h) =>
      forecast(source, new Date(start + h * 3600_000).toISOString(), { temp }),
    ),
  )
}

describe('buildForecastView', () => {
  it('agrège la fixture de Québec heure par heure', () => {
    const view = buildForecastView(normalize(fixture), 'America/Toronto')
    expect(view.hourly).toHaveLength(48)
    expect(view.models).toHaveLength(6)
    const first = view.hourly[0]
    expect(first.time).toBe('2026-09-23T02:00:00.000Z')
    // 02:00 UTC = 22:00 la veille à Québec
    expect(first.date).toBe('2026-09-22')
    expect(first.values.temp.modelCount).toBe(6)
    expect(first.values.temp.min).toBe(8)
    expect(first.values.temp.max).toBe(12.3)
    // Variable absente de la fixture : aucune valeur, jamais 0
    expect(first.values.windSpeed).toMatchObject({
      median: null,
      modelCount: 0,
      confidence: 'faible',
    })
  })

  it(`sépare les ${MAIN_FORECAST_DAYS} premiers jours des suivants`, () => {
    const view = buildForecastView(series(10, ['a', 'b', 'c']), 'UTC')
    const mainDates = new Set(
      view.hourly.filter((p) => !p.extended).map((p) => p.date),
    )
    expect(mainDates.size).toBe(MAIN_FORECAST_DAYS)
    expect(view.daily.filter((d) => d.extended)).toHaveLength(3)
    expect(view.daily[MAIN_FORECAST_DAYS].date).toBe('2026-09-30')
  })

  it('abaisse la confiance au-delà de 7 jours', () => {
    const view = buildForecastView(series(10, ['a', 'b', 'c']), 'UTC')
    const main = view.hourly.find((p) => !p.extended)
    const extended = view.hourly.find((p) => p.extended)
    expect(main?.values.temp.confidence).toBe('elevee')
    expect(extended?.values.temp.confidence).toBe('moyenne')
  })

  it("passe en confiance faible quand des modèles s'arrêtent", () => {
    // 3 modèles sur 2 jours, puis un seul modèle continue
    const forecasts = [
      ...series(2, ['a', 'b']),
      ...series(4, ['c']),
    ]
    const view = buildForecastView(forecasts, 'UTC')
    expect(view.hourly[0].values.temp.modelCount).toBe(3)
    expect(view.hourly[0].values.temp.confidence).toBe('elevee')
    const late = view.hourly.at(-1)
    expect(late?.values.temp.modelCount).toBe(1)
    expect(late?.values.temp.confidence).toBe('faible')
  })

  it('écarte les heures passées', () => {
    const view = buildForecastView(
      series(1, ['a']),
      'UTC',
      [],
      '2026-09-23T10:00:00.000Z',
    )
    expect(view.hourly[0].time).toBe('2026-09-23T10:00:00.000Z')
    expect(view.hourly).toHaveLength(14)
    expect(view.daily[0].hourCount).toBe(14)
  })

  it('transmet les sources en échec', () => {
    const failures = [{ source: 'x', message: 'down' }]
    expect(buildForecastView([], 'UTC', failures).failures).toEqual(failures)
  })

  it("ne liste pas un modèle qui n'a que des null", () => {
    const view = buildForecastView(
      [
        forecast('a', '2026-09-23T00:00:00.000Z', { temp: 1 }),
        forecast('b', '2026-09-23T00:00:00.000Z'),
      ],
      'UTC',
    )
    expect(view.models).toEqual(['a'])
  })
})

describe('currentHourIso', () => {
  it("tronque à l'heure UTC", () => {
    expect(currentHourIso(new Date('2026-09-23T14:37:12.345Z'))).toBe(
      '2026-09-23T14:00:00.000Z',
    )
  })
})
