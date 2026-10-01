import { describe, expect, it } from 'vitest'
import { dayLengthSeconds, isDaytime, solarElevation } from '../src/lib/sun'

const minutes = (s: number) => s / 60

describe('dayLengthSeconds', () => {
  it('donne la durée du jour à Paris aux solstices (à 5 min près)', () => {
    // Références : 16 h 11 le 21 juin, 8 h 13 le 21 décembre
    expect(minutes(dayLengthSeconds(48.85, '2026-06-21'))).toBeCloseTo(971, -1)
    expect(minutes(dayLengthSeconds(48.85, '2026-12-21'))).toBeCloseTo(493, -1)
  })

  it("dure un peu plus de 12 h à l'équateur", () => {
    const length = minutes(dayLengthSeconds(0, '2026-03-20'))
    expect(length).toBeGreaterThan(720)
    expect(length).toBeLessThan(730)
  })

  it('gère la nuit et le jour polaires', () => {
    expect(dayLengthSeconds(69.65, '2026-12-21')).toBe(0)
    expect(dayLengthSeconds(69.65, '2026-06-21')).toBe(86_400)
  })
})

describe('isDaytime', () => {
  it('distingue le jour de la nuit à Paris', () => {
    expect(isDaytime(48.85, 2.35, '2026-06-21T12:00:00.000Z')).toBe(true)
    expect(isDaytime(48.85, 2.35, '2026-06-21T00:00:00.000Z')).toBe(false)
  })

  it('situe le coucher du soleil à Québec le 1er octobre (vers 18 h 30)', () => {
    // 22:00 UTC = 18 h à Québec (UTC−4), 23:00 UTC = 19 h
    expect(isDaytime(46.81, -71.21, '2026-10-01T22:00:00.000Z')).toBe(true)
    expect(isDaytime(46.81, -71.21, '2026-10-01T23:00:00.000Z')).toBe(false)
  })

  it('utilise la longitude : midi solaire à Tokyo vers 03:00 UTC', () => {
    const noon = solarElevation(35.68, 139.69, new Date('2026-06-21T02:45Z'))
    expect(noon).toBeGreaterThan(75)
  })
})
