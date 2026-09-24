import { describe, expect, it } from 'vitest'
import { MODELS, normalize } from '../src/providers/open-meteo'
import fixture from './fixtures/openmeteo-quebec-sec.json'

describe('normalize', () => {
  describe('fixture openmeteo-quebec-sec.json', () => {
    const forecasts = normalize(fixture)

    it('produit 48 entrées par modèle pour la fixture', () => {
      expect(forecasts).toHaveLength(48 * MODELS.length)
      for (const model of MODELS) {
        expect(forecasts.filter((f) => f.source === model)).toHaveLength(48)
      }
    })

    it('découpe les clés {variable}_{modele} de openmeteo-quebec-sec.json', () => {
      const first = (model: string) => forecasts.find((f) => f.source === model)
      expect(first('ecmwf_ifs025')?.temp).toBe(8.7)
      expect(first('gfs_seamless')?.temp).toBe(9.5)
      expect(first('icon_seamless')?.temp).toBe(8.8)
      expect(first('gem_seamless')?.temp).toBe(12.3)
      expect(first('ukmo_seamless')?.temp).toBe(8)
      expect(first('meteofrance_seamless')?.temp).toBe(10.5)
    })

    it('associe la dernière valeur à la dernière heure', () => {
      const last = forecasts.filter((f) => f.source === 'ukmo_seamless').at(-1)
      expect(last?.time).toBe('2026-09-25T01:00:00.000Z')
      expect(last?.temp).toBe(9.6)
    })

    it('convertit les heures en ISO 8601 UTC explicite', () => {
      const times = forecasts
        .filter((f) => f.source === 'ecmwf_ifs025')
        .map((f) => f.time)
      expect(times[0]).toBe('2026-09-23T02:00:00.000Z')
      expect(times[1]).toBe('2026-09-23T03:00:00.000Z')
    })

    it('garde les précipitations à 0 (et non null) par temps sec', () => {
      expect(forecasts.every((f) => f.precip === 0)).toBe(true)
    })

    it('met à null les variables absentes de la réponse', () => {
      expect(forecasts.every((f) => f.windSpeed === null)).toBe(true)
      expect(forecasts.every((f) => f.snowfall === null)).toBe(true)
    })
  })

  it('met à null les valeurs null (fin d’horizon), sans les remplacer par 0', () => {
    const [a, b] = normalize({
      utc_offset_seconds: 0,
      hourly: {
        time: ['2026-09-23T00:00', '2026-09-23T01:00'],
        temperature_2m_ukmo_seamless: [5.2, null],
        snowfall_ukmo_seamless: [0, null],
      },
    })
    expect(a).toMatchObject({ temp: 5.2, snowfall: 0 })
    expect(b).toMatchObject({ temp: null, snowfall: null })
  })

  it('distingue les variables dont le nom se recoupe (rain / precipitation)', () => {
    const [f] = normalize({
      hourly: {
        time: ['2026-09-23T00:00'],
        precipitation_icon_seamless: [1.5],
        rain_icon_seamless: [1.2],
        snowfall_icon_seamless: [0.2],
      },
    })
    expect(f).toMatchObject({ precip: 1.5, rain: 1.2, snowfall: 0.2 })
  })

  it('mappe chaque variable vers son champ normalisé', () => {
    const [f] = normalize({
      hourly: {
        time: ['2026-09-23T00:00'],
        temperature_2m_gem_seamless: [1],
        apparent_temperature_gem_seamless: [2],
        relative_humidity_2m_gem_seamless: [3],
        precipitation_gem_seamless: [4],
        rain_gem_seamless: [5],
        snowfall_gem_seamless: [6],
        cloud_cover_gem_seamless: [7],
        sunshine_duration_gem_seamless: [8],
        wind_speed_10m_gem_seamless: [9],
        wind_gusts_10m_gem_seamless: [10],
      },
    })
    expect(f).toEqual({
      source: 'gem_seamless',
      time: '2026-09-23T00:00:00.000Z',
      temp: 1,
      apparentTemp: 2,
      humidity: 3,
      precip: 4,
      rain: 5,
      snowfall: 6,
      cloudCover: 7,
      sunshine: 8,
      windSpeed: 9,
      windGusts: 10,
    })
  })

  it('ignore un modèle absent de la réponse', () => {
    const forecasts = normalize({
      hourly: {
        time: ['2026-09-23T00:00'],
        temperature_2m_ecmwf_ifs025: [10],
      },
    })
    expect(forecasts.map((f) => f.source)).toEqual(['ecmwf_ifs025'])
  })

  it('ramène les heures en UTC si utc_offset_seconds est non nul', () => {
    const [f] = normalize({
      utc_offset_seconds: -4 * 3600,
      hourly: {
        time: ['2026-09-23T20:00'],
        temperature_2m_gfs_seamless: [10],
      },
    })
    expect(f.time).toBe('2026-09-24T00:00:00.000Z')
  })

  it('lève une erreur si la réponse est invalide', () => {
    expect(() => normalize(null)).toThrow()
    expect(() => normalize({})).toThrow()
    expect(() => normalize({ hourly: { time: 'x' } })).toThrow()
    expect(() => normalize({ hourly: { time: ['pas une date'] } })).toThrow()
  })
})
