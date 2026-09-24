import { describe, expect, it } from 'vitest'
import {
  isValidTimeZone,
  validateCityQuery,
  validateForecastInput,
} from '../src/lib/validation'

describe('validateCityQuery', () => {
  it('nettoie et tronque la requête', () => {
    expect(validateCityQuery({ query: '  Lyon ' })).toEqual({ query: 'Lyon' })
    expect(validateCityQuery({ query: 'x'.repeat(300) }).query).toHaveLength(
      100,
    )
  })

  it('refuse une entrée invalide', () => {
    expect(() => validateCityQuery({})).toThrow()
    expect(() => validateCityQuery('Lyon')).toThrow()
  })
})

describe('validateForecastInput', () => {
  const ok = { lat: 46.8, lon: -71.2, timeZone: 'America/Toronto' }

  it('accepte des coordonnées et un fuseau valides', () => {
    expect(validateForecastInput(ok)).toEqual(ok)
  })

  it('refuse des coordonnées hors limites ou non numériques', () => {
    expect(() => validateForecastInput({ ...ok, lat: 91 })).toThrow('Latitude')
    expect(() => validateForecastInput({ ...ok, lon: -181 })).toThrow(
      'Longitude',
    )
    expect(() => validateForecastInput({ ...ok, lat: '46' })).toThrow(
      'Latitude',
    )
    expect(() => validateForecastInput({ ...ok, lon: Number.NaN })).toThrow()
  })

  it('refuse un fuseau inconnu', () => {
    expect(() =>
      validateForecastInput({ ...ok, timeZone: 'Mars/Olympus' }),
    ).toThrow('Fuseau')
  })
})

describe('isValidTimeZone', () => {
  it('reconnaît les fuseaux IANA', () => {
    expect(isValidTimeZone('Europe/Paris')).toBe(true)
    expect(isValidTimeZone('pas/un/fuseau')).toBe(false)
  })
})
