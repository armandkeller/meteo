import { describe, expect, it } from 'vitest'
import { DAILY_FIELD_META, HOURLY_FIELD_META } from '../src/lib/fields'
import {
  formatHour,
  formatLocalDate,
  formatValue,
  formatWithUnit,
} from '../src/lib/format'

// Espaces insécables normalisés pour comparer facilement
const plain = (s: string) => s.replace(/[  ]/g, ' ')

describe('formatHour', () => {
  it("affiche l'heure dans le fuseau de la ville", () => {
    const t = '2026-09-23T02:00:00.000Z'
    expect(formatHour(t, 'UTC')).toBe('02 h')
    expect(formatHour(t, 'Europe/Paris')).toBe('04 h')
    expect(formatHour(t, 'America/Toronto')).toBe('22 h')
  })
})

describe('formatLocalDate', () => {
  it('affiche la date locale sans décalage de fuseau', () => {
    expect(formatLocalDate('2026-09-23')).toBe('mercredi 23 septembre')
  })
})

describe('formatValue', () => {
  it('arrondit selon la variable', () => {
    expect(formatValue(12.345, HOURLY_FIELD_META.temp)).toBe('12,3')
    expect(formatValue(55.6, HOURLY_FIELD_META.humidity)).toBe('56')
  })

  it('affiche un tiret pour une valeur manquante (jamais 0)', () => {
    expect(formatValue(null, HOURLY_FIELD_META.precip)).toBe('–')
  })

  it("n'affiche jamais -0", () => {
    expect(formatValue(-0.04, HOURLY_FIELD_META.temp)).toBe('0,0')
  })

  it("convertit l'ensoleillement", () => {
    expect(formatValue(1800, HOURLY_FIELD_META.sunshine)).toBe('30')
    expect(formatValue(5.5 * 3600, DAILY_FIELD_META.sunshine)).toBe('5,5')
  })
})

describe('formatWithUnit', () => {
  it("ajoute l'unité", () => {
    expect(formatWithUnit(12.3, HOURLY_FIELD_META.temp)).toBe('12,3°C')
    expect(plain(formatWithUnit(25, HOURLY_FIELD_META.windSpeed))).toBe('25 km/h')
    expect(formatWithUnit(null, HOURLY_FIELD_META.windSpeed)).toBe('–')
  })
})
