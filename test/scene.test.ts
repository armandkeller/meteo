import { describe, expect, it } from 'vitest'
import type { DailyField, ForecastField } from '../src/lib/aggregate'
import { DAILY_FIELDS, FORECAST_FIELDS } from '../src/lib/aggregate'
import type {
  DailyPoint,
  HourlyPoint,
  RatedValue,
} from '../src/lib/forecast-view'
import {
  AGREEMENT_LABELS,
  agreementLabel,
  dailyScene,
  hourlyScene,
  isSnowy,
  sceneMood,
  TOO_FEW_MODELS_LABEL,
  worstConfidence,
} from '../src/lib/scene'

const DAY = 12 * 3600 // durée du jour utilisée dans les tests (s)

function rated(values: Partial<RatedValue> = {}): RatedValue {
  return {
    median: null,
    min: null,
    max: null,
    modelCount: 6,
    confidence: 'elevee',
    ...values,
  }
}

function day(
  values: Partial<Record<DailyField, Partial<RatedValue>>> = {},
  extended = false,
): DailyPoint {
  const all = {} as Record<DailyField, RatedValue>
  for (const field of DAILY_FIELDS) all[field] = rated(values[field])
  return { date: '2026-10-01', hourCount: 24, extended, values: all }
}

function hour(
  values: Partial<Record<ForecastField, Partial<RatedValue>>> = {},
): HourlyPoint {
  const all = {} as Record<ForecastField, RatedValue>
  for (const field of FORECAST_FIELDS) all[field] = rated(values[field])
  return {
    time: '2026-10-01T16:00:00.000Z',
    date: '2026-10-01',
    extended: false,
    values: all,
  }
}

describe('dailyScene', () => {
  it('choisit le ciel selon la part du jour ensoleillée', () => {
    expect(dailyScene(day({ sunshine: { median: 0.8 * DAY } }), DAY).kind).toBe(
      'soleil',
    )
    expect(dailyScene(day({ sunshine: { median: 0.5 * DAY } }), DAY).kind).toBe(
      'eclaircies',
    )
    expect(dailyScene(day({ sunshine: { median: 0.1 * DAY } }), DAY).kind).toBe(
      'nuageux',
    )
  })

  it('affiche un ciel gris si l’ensoleillement est inconnu ou en nuit polaire', () => {
    expect(dailyScene(day(), DAY).kind).toBe('nuageux')
    expect(dailyScene(day({ sunshine: { median: 0 } }), 0).kind).toBe('nuageux')
  })

  it('se fonde sur le nombre de modèles mouillés, pas sur la médiane', () => {
    const sunny = { median: 0.8 * DAY }
    const wet = (wetCount: number, modelCount = 6) =>
      dailyScene(
        day({ sunshine: sunny, precip: { median: 0, wetCount, modelCount } }),
        DAY,
      ).kind
    expect(wet(1)).toBe('soleil')
    expect(wet(2)).toBe('averses')
    expect(wet(3)).toBe('averses')
    expect(wet(4)).toBe('pluie')
    expect(wet(2, 3)).toBe('pluie')
  })

  it('donne la priorité à la neige, puis aux précipitations, puis au vent', () => {
    const allWet = { wetCount: 6, modelCount: 6 }
    expect(
      dailyScene(day({ snowfall: { median: 0.5 }, precip: allWet }), DAY).kind,
    ).toBe('neige')
    expect(
      dailyScene(day({ precip: allWet, windGustsMax: { median: 80 } }), DAY)
        .kind,
    ).toBe('pluie')
    expect(dailyScene(day({ windGustsMax: { median: 60 } }), DAY).kind).toBe(
      'vent',
    )
    expect(dailyScene(day({ windGustsMax: { median: 59 } }), DAY).kind).toBe(
      'nuageux',
    )
  })

  it('montre de la neige pour des averses neigeuses', () => {
    const scene = dailyScene(
      day({
        snowfall: { median: 0, max: 2 },
        precip: { median: 0, max: 3, wetCount: 2, modelCount: 6 },
      }),
      DAY,
    )
    expect(scene.kind).toBe('neige')
  })

  it('ignore une neige médiane trop faible', () => {
    expect(dailyScene(day({ snowfall: { median: 0.4 } }), DAY).kind).toBe(
      'nuageux',
    )
  })

  it('fait douter le personnage quand la confiance est faible', () => {
    expect(dailyScene(day(), DAY).mood).toBe('sure')
    expect(
      dailyScene(day({ tempMax: { confidence: 'faible' } }), DAY).mood,
    ).toBe('hesite')
    expect(
      dailyScene(day({ precip: { confidence: 'faible' } }), DAY).mood,
    ).toBe('hesite')
    expect(
      dailyScene(day({ tempMax: { confidence: 'moyenne' } }), DAY).mood,
    ).toBe('sure')
  })

  it('fait toujours douter le personnage au-delà de 7 jours', () => {
    expect(dailyScene(day({}, true), DAY).mood).toBe('hesite')
  })
})

describe('hourlyScene', () => {
  it('choisit le ciel selon la couverture nuageuse le jour', () => {
    expect(hourlyScene(hour({ cloudCover: { median: 10 } }), true).kind).toBe(
      'soleil',
    )
    expect(hourlyScene(hour({ cloudCover: { median: 50 } }), true).kind).toBe(
      'eclaircies',
    )
    expect(hourlyScene(hour({ cloudCover: { median: 70 } }), true).kind).toBe(
      'nuageux',
    )
    expect(hourlyScene(hour(), true).kind).toBe('nuageux')
  })

  it('montre la lune la nuit seulement quand le ciel est dégagé', () => {
    expect(hourlyScene(hour({ cloudCover: { median: 10 } }), false)).toEqual({
      kind: 'nuit',
      mood: 'sure',
      night: true,
    })
    // Même seuil que le soleil le jour : 50 % n'est pas une nuit claire
    expect(hourlyScene(hour({ cloudCover: { median: 50 } }), false)).toEqual({
      kind: 'nuageux',
      mood: 'sure',
      night: true,
    })
    expect(hourlyScene(hour({ cloudCover: { median: 90 } }), false).kind).toBe(
      'nuageux',
    )
  })

  it('montre de la neige quand une neige faible rend les modèles mouillés', () => {
    // 0,12 mm d'eau ≈ 0,08 cm de neige : sous le seuil de 0,1 cm
    const snow = { median: 0.08, max: 0.09 }
    const precip = { median: 0.12, max: 0.13, wetCount: 6, modelCount: 6 }
    expect(hourlyScene(hour({ snowfall: snow, precip }), true).kind).toBe(
      'neige',
    )
    expect(
      hourlyScene(hour({ snowfall: { median: 0, max: 0 }, precip }), true).kind,
    ).toBe('pluie')
  })

  it('garde les précipitations la nuit, en le signalant', () => {
    const scene = hourlyScene(
      hour({ precip: { median: 0, wetCount: 3, modelCount: 6 } }),
      false,
    )
    expect(scene).toEqual({ kind: 'averses', mood: 'sure', night: true })
  })

  it('détecte la neige horaire à partir de 0,1 cm', () => {
    expect(hourlyScene(hour({ snowfall: { median: 0.1 } }), true).kind).toBe(
      'neige',
    )
  })

  it('fait douter le personnage quand la température est incertaine', () => {
    expect(
      hourlyScene(hour({ temp: { confidence: 'faible' } }), true).mood,
    ).toBe('hesite')
  })
})

describe('isSnowy', () => {
  it('compare la neige (en eau) aux précipitations', () => {
    const value = (max: number | null) => rated({ max })
    // 0,7 cm de neige = 1 mm d'eau
    expect(isSnowy(value(0.7), value(2))).toBe(true)
    expect(isSnowy(value(0.6), value(2))).toBe(false)
    expect(isSnowy(value(1), value(0))).toBe(false)
    expect(isSnowy(value(null), value(2))).toBe(false)
  })
})

describe('agreementLabel', () => {
  it('distingue le désaccord du manque de modèles', () => {
    expect(agreementLabel('faible', 6)).toBe(AGREEMENT_LABELS.faible)
    expect(agreementLabel('faible', 2)).toBe(TOO_FEW_MODELS_LABEL)
    expect(agreementLabel('elevee', 3)).toBe(AGREEMENT_LABELS.elevee)
  })
})

describe('worstConfidence et sceneMood', () => {
  it('retient la confiance la plus basse', () => {
    expect(worstConfidence(['elevee', 'moyenne'])).toBe('moyenne')
    expect(worstConfidence(['moyenne', 'faible', 'elevee'])).toBe('faible')
    expect(worstConfidence([])).toBe('elevee')
  })

  it('ne fait douter que pour une confiance faible', () => {
    expect(sceneMood('elevee')).toBe('sure')
    expect(sceneMood('moyenne')).toBe('sure')
    expect(sceneMood('faible')).toBe('hesite')
  })
})
