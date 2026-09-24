import { describe, expect, it } from 'vitest'
import {
  aggregateByDay,
  aggregateByHour,
  confidence,
  HOURLY_SPREAD_THRESHOLDS,
  localDate,
  median,
  summarize,
} from '../src/lib/aggregate'
import type { NormalizedForecast } from '../src/types/forecast'

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

describe('median', () => {
  it('retourne la valeur centrale pour un nombre impair de valeurs', () => {
    expect(median([3, 1, 2])).toBe(2)
  })

  it('fait la moyenne des deux valeurs centrales pour un nombre pair', () => {
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })

  it('ignore les null', () => {
    expect(median([null, 5, null, 1, 3])).toBe(3)
  })

  it('ne traite pas les null comme 0', () => {
    // Avec null = 0, la médiane serait 0.5
    expect(median([null, null, 1, 2])).toBe(1.5)
  })

  it('conserve les vraies valeurs 0', () => {
    expect(median([0, 0, 0.4])).toBe(0)
  })

  it('gère les valeurs négatives', () => {
    expect(median([-5, -1, -3])).toBe(-3)
  })

  it('retourne null si aucune valeur', () => {
    expect(median([])).toBeNull()
  })

  it('retourne null si toutes les valeurs sont null', () => {
    expect(median([null, null])).toBeNull()
  })

  it('ne modifie pas le tableau reçu', () => {
    const values = [3, null, 1, 2]
    median(values)
    expect(values).toEqual([3, null, 1, 2])
  })
})

describe('aggregateByHour', () => {
  const h0 = '2026-09-23T12:00'
  const h1 = '2026-09-23T13:00'

  it('calcule médiane, min, max et nombre de modèles', () => {
    const forecasts = [
      forecast('ecmwf_ifs025', h0, { temp: 10 }),
      forecast('gfs_seamless', h0, { temp: 14 }),
      forecast('icon_seamless', h0, { temp: 11 }),
    ]
    expect(aggregateByHour(forecasts, 'temp').get(h0)).toEqual({
      median: 11,
      min: 10,
      max: 14,
      modelCount: 3,
    })
  })

  it('regroupe chaque heure séparément', () => {
    const forecasts = [
      forecast('ecmwf_ifs025', h0, { temp: 10 }),
      forecast('ecmwf_ifs025', h1, { temp: 20 }),
      forecast('gfs_seamless', h0, { temp: 12 }),
      forecast('gfs_seamless', h1, { temp: 22 }),
    ]
    const result = aggregateByHour(forecasts, 'temp')
    expect(result.size).toBe(2)
    expect(result.get(h0)?.median).toBe(11)
    expect(result.get(h1)?.median).toBe(21)
  })

  it("n'agrège que le champ demandé", () => {
    const forecasts = [
      forecast('ecmwf_ifs025', h0, { temp: 10, windSpeed: 30 }),
      forecast('gfs_seamless', h0, { temp: 12, windSpeed: 40 }),
    ]
    expect(aggregateByHour(forecasts, 'windSpeed').get(h0)?.median).toBe(35)
  })

  it('ignore les null et ne les compte pas dans modelCount', () => {
    const forecasts = [
      forecast('ecmwf_ifs025', h0, { precip: 0.2 }),
      forecast('gfs_seamless', h0, { precip: null }),
      forecast('ukmo_seamless', h0, { precip: 0.6 }),
    ]
    expect(aggregateByHour(forecasts, 'precip').get(h0)).toEqual({
      median: 0.4,
      min: 0.2,
      max: 0.6,
      modelCount: 2,
    })
  })

  it('garde une heure sans aucune valeur (fin d’horizon)', () => {
    const forecasts = [
      forecast('ukmo_seamless', h0, { temp: null }),
      forecast('gem_seamless', h0, { temp: null }),
    ]
    expect(aggregateByHour(forecasts, 'temp').get(h0)).toEqual({
      median: null,
      min: null,
      max: null,
      modelCount: 0,
    })
  })

  it('compte les 0 comme des valeurs disponibles', () => {
    const forecasts = [
      forecast('ecmwf_ifs025', h0, { snowfall: 0 }),
      forecast('gfs_seamless', h0, { snowfall: 0 }),
      forecast('icon_seamless', h0, { snowfall: 1.4 }),
    ]
    expect(aggregateByHour(forecasts, 'snowfall').get(h0)).toEqual({
      median: 0,
      min: 0,
      max: 1.4,
      modelCount: 3,
    })
  })

  it('renvoie les heures dans l’ordre chronologique', () => {
    const forecasts = [
      forecast('ecmwf_ifs025', h1, { temp: 20 }),
      forecast('ecmwf_ifs025', h0, { temp: 10 }),
    ]
    expect([...aggregateByHour(forecasts, 'temp').keys()]).toEqual([h0, h1])
  })

  it('renvoie une Map vide sans prévisions', () => {
    expect(aggregateByHour([], 'temp').size).toBe(0)
  })
})

describe('summarize', () => {
  it('calcule médiane, min, max et nombre de valeurs non nulles', () => {
    expect(summarize([4, null, 1, 2])).toEqual({
      median: 2,
      min: 1,
      max: 4,
      modelCount: 3,
    })
  })
})

describe('confidence', () => {
  const thresholds = [2, 4] as const
  const value = (min: number, max: number, modelCount = 6) => ({
    median: (min + max) / 2,
    min,
    max,
    modelCount,
  })

  it('est élevée quand les modèles sont proches', () => {
    expect(confidence(value(10, 12), thresholds)).toBe('elevee')
  })

  it('est moyenne pour un écart intermédiaire', () => {
    expect(confidence(value(10, 13.5), thresholds)).toBe('moyenne')
  })

  it('est faible quand les modèles divergent', () => {
    expect(confidence(value(10, 16), thresholds)).toBe('faible')
  })

  it('est faible avec moins de 3 modèles, même sans écart', () => {
    expect(confidence(value(10, 10, 2), thresholds)).toBe('faible')
  })

  it('est possible dès 3 modèles', () => {
    expect(confidence(value(10, 10, 3), thresholds)).toBe('elevee')
  })

  it('est faible sans aucune valeur', () => {
    expect(
      confidence(
        { median: null, min: null, max: null, modelCount: 0 },
        thresholds,
      ),
    ).toBe('faible')
  })

  it("baisse d'un cran au-delà de 7 jours", () => {
    expect(confidence(value(10, 12), thresholds, true)).toBe('moyenne')
    expect(confidence(value(10, 13.5), thresholds, true)).toBe('faible')
    expect(confidence(value(10, 16), thresholds, true)).toBe('faible')
  })

  it('définit des seuils pour chaque variable', () => {
    for (const [high, medium] of Object.values(HOURLY_SPREAD_THRESHOLDS)) {
      expect(high).toBeGreaterThan(0)
      expect(medium).toBeGreaterThan(high)
    }
  })
})

describe('localDate', () => {
  it('donne la date dans le fuseau de la ville, pas en UTC', () => {
    // 03:00 UTC = 23:00 la veille à Québec (UTC−4 en septembre)
    expect(localDate('2026-09-24T03:00:00.000Z', 'America/Toronto')).toBe(
      '2026-09-23',
    )
    expect(localDate('2026-09-24T03:00:00.000Z', 'Europe/Paris')).toBe(
      '2026-09-24',
    )
  })
})

describe('aggregateByDay', () => {
  // 24 heures du 23 septembre en UTC
  const day = Array.from(
    { length: 24 },
    (_, h) => `2026-09-23T${String(h).padStart(2, '0')}:00:00.000Z`,
  )

  function model(
    source: string,
    temps: (number | null)[],
    precip: (number | null)[] = temps.map(() => 0),
  ) {
    return day.map((time, i) =>
      forecast(source, time, { temp: temps[i], precip: precip[i] }),
    )
  }

  it('calcule min et max par modèle puis la médiane entre modèles', () => {
    const ramp = (base: number) => day.map((_, i) => base + i / 2)
    const [result] = aggregateByDay(
      [
        ...model('a', ramp(10)),
        ...model('b', ramp(12)),
        ...model('c', ramp(14)),
      ],
      'UTC',
    )
    expect(result.date).toBe('2026-09-23')
    expect(result.hourCount).toBe(24)
    expect(result.values.tempMin).toEqual({
      median: 12,
      min: 10,
      max: 14,
      modelCount: 3,
    })
    expect(result.values.tempMax.median).toBe(12 + 11.5)
  })

  it('fait la médiane des cumuls, pas la somme des médianes', () => {
    // a : 10 mm en 1 h ; b : 10 mm en 1 h, à une autre heure ; c : sec.
    // Médiane horaire = 0 à chaque heure (somme 0), mais 2 modèles sur 3
    // prévoient 10 mm dans la journée.
    const rainAt = (hour: number) => day.map((_, i) => (i === hour ? 10 : 0))
    const temps = day.map(() => 15)
    const [result] = aggregateByDay(
      [
        ...model('a', temps, rainAt(3)),
        ...model('b', temps, rainAt(15)),
        ...model(
          'c',
          temps,
          day.map(() => 0),
        ),
      ],
      'UTC',
    )
    expect(result.values.precip).toEqual({
      median: 10,
      min: 0,
      max: 10,
      modelCount: 3,
    })
  })

  it("exclut un modèle dont la journée est incomplète (fin d'horizon)", () => {
    const temps = day.map(() => 15)
    const truncated = day.map((_, i) => (i < 12 ? 15 : null))
    const [result] = aggregateByDay(
      [...model('a', temps), ...model('b', temps), ...model('c', truncated)],
      'UTC',
    )
    expect(result.values.tempMax.modelCount).toBe(2)
  })

  it('découpe les jours dans le fuseau de la ville', () => {
    const temps = day.map(() => 15)
    const days = aggregateByDay(model('a', temps), 'Europe/Paris')
    // En heure de Paris (UTC+2), 00:00–21:00 UTC tombe le 23, 22:00–23:00 le 24
    expect(days.map((d) => [d.date, d.hourCount])).toEqual([
      ['2026-09-23', 22],
      ['2026-09-24', 2],
    ])
  })
})
