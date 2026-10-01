// Position du soleil (approximation de la NOAA, précise à la minute près),
// pour savoir s'il fait jour et combien de temps dure la journée. Calculé
// plutôt que demandé à l'API (`is_day`) : rien ne change côté providers.

const DEG = Math.PI / 180

// Hauteur du soleil au lever et au coucher : réfraction et rayon du disque.
export const SUNRISE_ELEVATION = -0.833 // degrés

type SolarAngles = { declination: number; eqTimeMinutes: number }

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1)
  return Math.floor((date.getTime() - start) / 86_400_000) + 1
}

function solarAngles(date: Date): SolarAngles {
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60
  const g = ((2 * Math.PI) / 365) * (dayOfYear(date) - 1 + (hours - 12) / 24)
  const eqTimeMinutes =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g))
  const declination =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g)
  return { declination, eqTimeMinutes }
}

// Hauteur du soleil au-dessus de l'horizon (degrés) à un instant donné.
export function solarElevation(lat: number, lon: number, date: Date): number {
  const { declination, eqTimeMinutes } = solarAngles(date)
  const minutes =
    date.getUTCHours() * 60 +
    date.getUTCMinutes() +
    date.getUTCSeconds() / 60 +
    eqTimeMinutes +
    4 * lon
  const hourAngle = (minutes / 4 - 180) * DEG
  const phi = lat * DEG
  const cosZenith =
    Math.sin(phi) * Math.sin(declination) +
    Math.cos(phi) * Math.cos(declination) * Math.cos(hourAngle)
  return 90 - Math.acos(Math.min(1, Math.max(-1, cosZenith))) / DEG
}

export function isDaytime(lat: number, lon: number, isoTime: string): boolean {
  return solarElevation(lat, lon, new Date(isoTime)) > SUNRISE_ELEVATION
}

// Durée du jour (secondes) pour une date locale AAAA-MM-JJ.
// 0 pendant la nuit polaire, 86 400 pendant le jour polaire.
export function dayLengthSeconds(lat: number, date: string): number {
  const { declination } = solarAngles(new Date(`${date}T12:00:00Z`))
  const phi = lat * DEG
  const cosOmega =
    (Math.sin(SUNRISE_ELEVATION * DEG) -
      Math.sin(phi) * Math.sin(declination)) /
    (Math.cos(phi) * Math.cos(declination))
  if (cosOmega >= 1) return 0
  if (cosOmega <= -1) return 86_400
  // Angle horaire du coucher (degrés) : 15° par heure, de part et d'autre de midi
  const omega = Math.acos(cosOmega) / DEG
  return Math.round(((2 * omega) / 15) * 3600)
}
