import type { Confidence } from './aggregate'
import type { DailyPoint, ForecastView, HourlyPoint } from './forecast-view'
import type { Scene } from './scene'
import {
  agreementLabel,
  dailyScene,
  dayConfidence,
  hourlyScene,
  SCENE_LABELS,
  SCENE_SENTENCES,
} from './scene'
import { dayLengthSeconds, isDaytime } from './sun'

// Vue illustrée : la ForecastView réduite à ce que montrent les scènes.
// Fonction pure, appelée côté serveur (getForecastFn) : le calcul solaire
// (sun.ts) n'est pas refait dans le navigateur, où ses dernières décimales
// pourraient différer et casser l'hydratation.

export type SceneDay = Scene & {
  date: string
  extended: boolean
  label: string
  sentence: string
  confidence: Confidence
  agreement: string // « Les modèles sont d'accord »…
  tempMax: number | null
  tempMin: number | null
  tempMaxSpread: number | null // écart max − min entre modèles (°C)
  tempModelCount: number
  precip: number | null // mm (neige comprise, en équivalent eau)
  snowfall: number | null // cm
  sunshine: number | null // secondes
  windGustsMax: number | null // km/h
  wetCount: number
  precipModelCount: number
}

export type SceneHour = Scene & {
  time: string
  temp: number | null
  wetCount: number
  precipModelCount: number
}

export type IllustratedView = {
  today: string | undefined // date locale de l'heure en cours
  days: SceneDay[] // jours 1 à 7
  extended: SceneDay[] // jours 8 à 16 (tendance)
  hours: SceneHour[]
}

// Nombre d'heures du bandeau horaire.
export const RIBBON_HOURS = 12

// En dessous (fin d'horizon), la journée est tronquée : son ensoleillement
// cumulé serait sous-estimé. 23 et non 24 : jour du passage à l'heure d'été.
const MIN_DAY_HOURS = 23

// Nombre de modèles qui prévoient des précipitations. Pas une probabilité.
export function wetText(wetCount: number, modelCount: number): string {
  if (modelCount === 0) return 'Aucun modèle disponible pour les précipitations'
  if (wetCount === 0) {
    return modelCount === 1
      ? 'Le seul modèle disponible ne prévoit pas de précipitations'
      : `Aucun des ${modelCount} modèles ne prévoit de précipitations`
  }
  const plural = wetCount > 1
  return `${wetCount} modèle${plural ? 's' : ''} sur ${modelCount} prévoi${plural ? 'ent' : 't'} des précipitations`
}

function sceneDay(day: DailyPoint, lat: number): SceneDay {
  const { values } = day
  const scene = dailyScene(day, dayLengthSeconds(lat, day.date))
  const mixed = scene.kind === 'pluie' && (values.snowfall.median ?? 0) > 0
  const { min, max } = values.tempMax
  const confidence = dayConfidence(day)
  return {
    ...scene,
    date: day.date,
    extended: day.extended,
    label: mixed ? 'Pluie et neige' : SCENE_LABELS[scene.kind],
    sentence: SCENE_SENTENCES[scene.kind],
    confidence,
    agreement: agreementLabel(
      confidence,
      Math.min(values.tempMax.modelCount, values.precip.modelCount),
    ),
    tempMax: values.tempMax.median,
    tempMin: values.tempMin.median,
    tempMaxSpread: min === null || max === null ? null : max - min,
    tempModelCount: values.tempMax.modelCount,
    precip: values.precip.median,
    snowfall: values.snowfall.median,
    sunshine: values.sunshine.median,
    windGustsMax: values.windGustsMax.median,
    wetCount: values.precip.wetCount ?? 0,
    precipModelCount: values.precip.modelCount,
  }
}

function sceneHour(hour: HourlyPoint, lat: number, lon: number): SceneHour {
  const { values } = hour
  return {
    ...hourlyScene(hour, isDaytime(lat, lon, hour.time)),
    time: hour.time,
    temp: values.temp.median,
    wetCount: values.precip.wetCount ?? 0,
    precipModelCount: values.precip.modelCount,
  }
}

export function buildIllustratedView(
  view: ForecastView,
  lat: number,
  lon: number,
): IllustratedView {
  const days = view.daily
    .filter((d) => d.hourCount >= MIN_DAY_HOURS)
    .map((d) => sceneDay(d, lat))
  return {
    today: view.hourly[0]?.date,
    days: days.filter((d) => !d.extended),
    extended: days.filter((d) => d.extended),
    hours: view.hourly
      .filter((h) => !h.extended)
      .slice(0, RIBBON_HOURS)
      .map((h) => sceneHour(h, lat, lon)),
  }
}
