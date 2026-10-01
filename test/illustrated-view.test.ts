import { describe, expect, it } from 'vitest'
import { buildForecastView } from '../src/lib/forecast-view'
import {
  buildIllustratedView,
  RIBBON_HOURS,
  wetText,
} from '../src/lib/illustrated-view'
import { SCENE_LABELS } from '../src/lib/scene'
import { normalize } from '../src/providers/open-meteo'
import type { NormalizedForecast } from '../src/types/forecast'
import fixture from './fixtures/openmeteo-quebec-sec.json'

const QUEBEC = { lat: 46.81, lon: -71.21 }

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

// `hours` heures à partir du 1er octobre 00:00 UTC, pour `models` modèles
function series(hours: number, models: string[]): NormalizedForecast[] {
  const start = Date.parse('2026-10-01T00:00:00.000Z')
  return models.flatMap((source) =>
    Array.from({ length: hours }, (_, h) =>
      forecast(source, new Date(start + h * 3600_000).toISOString(), {
        temp: 15,
        precip: 0,
        snowfall: 0,
        cloudCover: 20,
        sunshine: 3600,
        windGusts: 20,
      }),
    ),
  )
}

describe('wetText', () => {
  it('compte les modèles sans parler de probabilité', () => {
    expect(wetText(0, 6)).toBe(
      'Aucun des 6 modèles ne prévoit de précipitations',
    )
    expect(wetText(1, 6)).toBe('1 modèle sur 6 prévoit des précipitations')
    expect(wetText(3, 5)).toBe('3 modèles sur 5 prévoient des précipitations')
    expect(wetText(0, 1)).toBe(
      'Le seul modèle disponible ne prévoit pas de précipitations',
    )
    expect(wetText(0, 0)).toBe(
      'Aucun modèle disponible pour les précipitations',
    )
  })
})

describe('buildIllustratedView', () => {
  it('construit le bandeau horaire et les jours complets de la fixture de Québec', () => {
    const view = buildForecastView(normalize(fixture), 'America/Toronto')
    const illustrated = buildIllustratedView(view, QUEBEC.lat, QUEBEC.lon)

    expect(illustrated.hours).toHaveLength(RIBBON_HOURS)
    expect(illustrated.hours[0].time).toBe(view.hourly[0].time)
    // 48 h depuis minuit UTC : seule la journée locale du milieu est complète
    expect(illustrated.days).toHaveLength(1)
    expect(illustrated.extended).toHaveLength(0)
    for (const item of [...illustrated.hours, ...illustrated.days]) {
      expect(SCENE_LABELS[item.kind]).toBeDefined()
      // Fixture sans pluie
      expect(['pluie', 'averses', 'neige']).not.toContain(item.kind)
    }
  })

  it('reprend les valeurs du résumé journalier', () => {
    const view = buildForecastView(normalize(fixture), 'America/Toronto')
    const [day] = buildIllustratedView(view, QUEBEC.lat, QUEBEC.lon).days
    const source = view.daily.find((d) => d.date === day.date)
    expect(day.tempMax).toBe(source?.values.tempMax.median)
    expect(day.tempMin).toBe(source?.values.tempMin.median)
    expect(day.wetCount).toBe(0)
    expect(day.precipModelCount).toBe(source?.values.precip.modelCount)
  })

  it('sépare les jours 8 à 16 et écarte la journée tronquée en fin d’horizon', () => {
    const view = buildForecastView(series(16 * 24 + 6, ['a', 'b', 'c']), 'UTC')
    const illustrated = buildIllustratedView(view, QUEBEC.lat, QUEBEC.lon)
    expect(illustrated.days).toHaveLength(7)
    expect(illustrated.extended).toHaveLength(9)
    expect(illustrated.extended.every((d) => d.mood === 'hesite')).toBe(true)
  })

  it('montre la nuit dans le bandeau horaire', () => {
    const view = buildForecastView(series(24, ['a', 'b', 'c']), 'UTC')
    const { hours } = buildIllustratedView(view, QUEBEC.lat, QUEBEC.lon)
    // 00:00 UTC = 20 h à Québec : nuit ; ciel peu nuageux → lune
    expect(hours[0]).toMatchObject({ kind: 'nuit', night: true })
  })
})
