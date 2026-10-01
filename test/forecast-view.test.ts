import { describe, expect, it } from 'vitest'
import {
  buildForecastView,
  currentHourIso,
  MAIN_FORECAST_DAYS,
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
function series(
  days: number,
  models: string[],
  temp = 15,
): NormalizedForecast[] {
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
    const forecasts = [...series(2, ['a', 'b']), ...series(4, ['c'])]
    const view = buildForecastView(forecasts, 'UTC')
    expect(view.hourly[0].values.temp.modelCount).toBe(3)
    expect(view.hourly[0].values.temp.confidence).toBe('elevee')
    const late = view.hourly.at(-1)
    expect(late?.values.temp.modelCount).toBe(1)
    expect(late?.values.temp.confidence).toBe('faible')
  })

  it('écarte les heures passées du détail horaire', () => {
    const view = buildForecastView(
      series(1, ['a']),
      'UTC',
      [],
      '2026-09-23T10:00:00.000Z',
    )
    expect(view.hourly[0].time).toBe('2026-09-23T10:00:00.000Z')
    expect(view.hourly).toHaveLength(14)
  })

  it('garde toute la journée en cours dans le résumé journalier', () => {
    // Max à 13 h UTC, il est 18 h UTC : le max du jour reste celui de 13 h
    const start = Date.parse('2026-09-23T00:00:00.000Z')
    const forecasts = ['a', 'b', 'c'].flatMap((source) =>
      Array.from({ length: 48 }, (_, h) =>
        forecast(source, new Date(start + h * 3600_000).toISOString(), {
          temp: h === 13 ? 25 : 15,
        }),
      ),
    )
    const view = buildForecastView(
      forecasts,
      'UTC',
      [],
      '2026-09-23T18:00:00.000Z',
    )
    expect(view.daily[0]).toMatchObject({ date: '2026-09-23', hourCount: 24 })
    expect(view.daily[0].values.tempMax.median).toBe(25)
  })

  it('écarte la veille locale, même si elle est encore dans la réponse', () => {
    // Paris (UTC+2) : le 23 commence le 22 à 22:00 UTC (past_days=1)
    const start = Date.parse('2026-09-22T00:00:00.000Z')
    const forecasts = Array.from({ length: 72 }, (_, h) =>
      forecast('a', new Date(start + h * 3600_000).toISOString(), { temp: 15 }),
    )
    const view = buildForecastView(
      forecasts,
      'Europe/Paris',
      [],
      '2026-09-23T10:00:00.000Z',
    )
    expect(view.daily[0]).toMatchObject({ date: '2026-09-23', hourCount: 24 })
    expect(view.hourly[0].time).toBe('2026-09-23T10:00:00.000Z')
  })

  it('transmet le nombre de modèles avec précipitations', () => {
    // 2 modèles sur 5 prévoient de la pluie, à des heures différentes :
    // médiane horaire à 0, mais wetCount le signale
    const forecasts = ['a', 'b', 'c', 'd', 'e'].flatMap((source, i) =>
      series(1, [source]).map((f, h) => ({
        ...f,
        precip: (i === 0 && h === 3) || (i === 1 && h === 15) ? 2 : 0,
      })),
    )
    const view = buildForecastView(forecasts, 'UTC')
    expect(view.hourly[3].values.precip).toMatchObject({
      median: 0,
      wetCount: 1,
      modelCount: 5,
    })
    expect(view.daily[0].values.precip).toMatchObject({
      median: 0,
      wetCount: 2,
    })
  })

  it('liste les modèles de la journée, heures passées comprises', () => {
    // b ne fournit que le début de la journée, déjà passé
    const forecasts = [
      ...series(1, ['a']),
      forecast('b', '2026-09-23T02:00:00.000Z', { temp: 10 }),
    ]
    const view = buildForecastView(
      forecasts,
      'UTC',
      [],
      '2026-09-23T10:00:00.000Z',
    )
    expect(view.models).toEqual(['a', 'b'])
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
