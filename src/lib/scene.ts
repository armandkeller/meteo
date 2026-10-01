import type { AggregatedValue } from '../types/forecast'
import type { Confidence } from './aggregate'
import { MIN_MODELS_FOR_CONFIDENCE } from './aggregate'
import type { DailyPoint, HourlyPoint } from './forecast-view'

// Vue illustrée : une scène (un personnage) par heure ou par jour, choisie à
// partir des médianes et de l'accord des modèles. Fonctions pures.

export type SceneKind =
  | 'soleil'
  | 'eclaircies'
  | 'nuageux'
  | 'averses'
  | 'pluie'
  | 'neige'
  | 'vent'
  | 'nuit'

// Confiance faible : le personnage doute (sourcils, bouche ondulée, « ? »).
export type SceneMood = 'sure' | 'hesite'

export type Scene = {
  kind: SceneKind
  mood: SceneMood
  night: boolean // heure de nuit : le soleil d'une averse devient une lune
}

export const SCENE_LABELS: Record<SceneKind, string> = {
  soleil: 'Soleil',
  eclaircies: 'Éclaircies',
  nuageux: 'Nuageux',
  averses: 'Averses possibles',
  pluie: 'Pluie',
  neige: 'Neige',
  vent: 'Vent fort',
  nuit: 'Nuit claire',
}

export const SCENE_SENTENCES: Record<SceneKind, string> = {
  soleil: 'Une belle journée, avec du soleil presque tout le temps.',
  eclaircies: 'Un ciel partagé entre nuages et soleil.',
  nuageux: 'Un ciel plutôt gris, le soleil se fait rare.',
  averses:
    'Les modèles sont partagés sur les précipitations : gardez un parapluie à portée de main.',
  pluie: 'Des précipitations prévues par la plupart des modèles.',
  neige: 'De la neige est attendue.',
  vent: 'Ça souffle fort : tenez bien votre chapeau.',
  nuit: 'Une nuit dégagée.',
}

export const AGREEMENT_LABELS: Record<Confidence, string> = {
  elevee: 'Les modèles sont d’accord',
  moyenne: 'Les modèles hésitent un peu',
  faible: 'Les modèles ne sont pas d’accord',
}

// Confiance faible faute de modèles : ils ne sont pas en désaccord pour autant.
export const TOO_FEW_MODELS_LABEL = 'Trop peu de modèles pour conclure'

// `modelCount` : modèles disponibles pour les valeurs affichées (le plus
// petit nombre si plusieurs variables).
export function agreementLabel(
  confidence: Confidence,
  modelCount: number,
): string {
  return modelCount < MIN_MODELS_FOR_CONFIDENCE
    ? TOO_FEW_MODELS_LABEL
    : AGREEMENT_LABELS[confidence]
}

// Open-Meteo convertit la neige à raison de 0,7 cm par mm d'eau.
export const SNOW_CM_PER_MM = 0.7

// Seuils des scènes. Testés dans l'ordre : neige, pluie, averses, vent,
// puis ciel (soleil / éclaircies / nuageux, ou nuit claire).
export const SCENE_THRESHOLDS = {
  // Part des modèles qui prévoient des précipitations (wetCount)
  rainRatio: 2 / 3,
  showerRatio: 1 / 3,
  windGusts: 60, // km/h
  daily: {
    snowfall: 0.5, // cm sur la journée (médiane)
    sunnyRatio: 0.7, // part de la durée du jour ensoleillée
    partlyRatio: 0.3,
  },
  hourly: {
    snowfall: 0.1, // cm dans l'heure (médiane)
    clearCloudCover: 30, // % (en dessous : soleil, ou nuit claire)
    partlyCloudCover: 70, // %
  },
} as const

const CONFIDENCE_ORDER: Confidence[] = ['faible', 'moyenne', 'elevee']

export function worstConfidence(levels: Confidence[]): Confidence {
  let worst: Confidence = 'elevee'
  for (const level of levels) {
    if (CONFIDENCE_ORDER.indexOf(level) < CONFIDENCE_ORDER.indexOf(worst)) {
      worst = level
    }
  }
  return worst
}

export function sceneMood(confidence: Confidence): SceneMood {
  return confidence === 'faible' ? 'hesite' : 'sure'
}

// Part des modèles disponibles qui prévoient des précipitations.
function wetRatio(value: { wetCount?: number; modelCount: number }): number {
  if (value.modelCount === 0) return 0
  return (value.wetCount ?? 0) / value.modelCount
}

function atLeast(value: number | null, threshold: number): boolean {
  return value !== null && value >= threshold
}

// Précipitations surtout sous forme de neige : la neige du modèle le plus
// enneigé (en eau) atteint la moitié des précipitations du plus arrosé.
// Les médianes ne suffisent pas : une neige faible reste sous le seuil de
// neige alors que les modèles sont « mouillés » (0,1 mm ≈ 0,07 cm).
export function isSnowy(
  snowfall: AggregatedValue,
  precip: AggregatedValue,
): boolean {
  if (snowfall.max === null || precip.max === null || precip.max <= 0) {
    return false
  }
  return snowfall.max / SNOW_CM_PER_MM >= precip.max / 2
}

// Scène commune aux heures et aux jours (précipitations, puis vent).
function weatherKind(
  snowfall: AggregatedValue,
  snowThreshold: number,
  precip: AggregatedValue,
  gusts: number | null,
): SceneKind | null {
  if (atLeast(snowfall.median, snowThreshold)) return 'neige'
  const ratio = wetRatio(precip)
  const wet =
    ratio >= SCENE_THRESHOLDS.rainRatio
      ? 'pluie'
      : ratio >= SCENE_THRESHOLDS.showerRatio
        ? 'averses'
        : null
  if (wet) return isSnowy(snowfall, precip) ? 'neige' : wet
  if (atLeast(gusts, SCENE_THRESHOLDS.windGusts)) return 'vent'
  return null
}

// Confiance d'une journée : la pire entre la température max et les
// précipitations (ce que la scène et le grand chiffre affichent).
export function dayConfidence(day: DailyPoint): Confidence {
  return worstConfidence([
    day.values.tempMax.confidence,
    day.values.precip.confidence,
  ])
}

export function hourConfidence(hour: HourlyPoint): Confidence {
  return worstConfidence([
    hour.values.temp.confidence,
    hour.values.precip.confidence,
  ])
}

// `dayLength` : durée du jour en secondes (voir sun.ts).
export function dailyScene(day: DailyPoint, dayLength: number): Scene {
  const { values } = day
  const t = SCENE_THRESHOLDS.daily
  const mood: SceneMood = day.extended
    ? 'hesite'
    : sceneMood(dayConfidence(day))
  const weather = weatherKind(
    values.snowfall,
    t.snowfall,
    values.precip,
    values.windGustsMax.median,
  )
  if (weather) return { kind: weather, mood, night: false }

  const sunshine = values.sunshine.median
  // Nuit polaire ou ensoleillement inconnu : ciel gris par défaut
  const ratio = sunshine === null || dayLength === 0 ? 0 : sunshine / dayLength
  const kind: SceneKind =
    ratio >= t.sunnyRatio
      ? 'soleil'
      : ratio >= t.partlyRatio
        ? 'eclaircies'
        : 'nuageux'
  return { kind, mood, night: false }
}

// `isDay` : le soleil est au-dessus de l'horizon à cette heure (voir sun.ts).
export function hourlyScene(hour: HourlyPoint, isDay: boolean): Scene {
  const { values } = hour
  const t = SCENE_THRESHOLDS.hourly
  const mood = sceneMood(hourConfidence(hour))
  const night = !isDay
  const weather = weatherKind(
    values.snowfall,
    t.snowfall,
    values.precip,
    values.windGusts.median,
  )
  if (weather) return { kind: weather, mood, night }

  const cloud = values.cloudCover.median
  // Couverture inconnue : ciel gris par défaut
  if (cloud === null || cloud >= t.partlyCloudCover) {
    return { kind: 'nuageux', mood, night }
  }
  const clear = cloud < t.clearCloudCover
  if (night) return { kind: clear ? 'nuit' : 'nuageux', mood, night }
  return { kind: clear ? 'soleil' : 'eclaircies', mood, night }
}
