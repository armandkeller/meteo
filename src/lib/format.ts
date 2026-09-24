import type { FieldMeta } from './fields'

const LOCALE = 'fr-FR'
const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${timeZone}|${JSON.stringify(options)}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(LOCALE, { timeZone, ...options })
    formatters.set(key, f)
  }
  return f
}

// Heure locale de la ville (jamais celle du navigateur), ex. "14 h".
export function formatHour(isoTime: string, timeZone: string): string {
  const hour = formatter(timeZone, { hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(isoTime))
    .find((p) => p.type === 'hour')?.value
  return `${hour ?? '??'} h`
}

// "mer. 23 sept." à partir d'une heure UTC, dans le fuseau de la ville.
export function formatDateTimeDay(isoTime: string, timeZone: string): string {
  return formatter(timeZone, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(isoTime))
}

// "mercredi 23 septembre" à partir d'une date locale AAAA-MM-JJ.
export function formatLocalDate(
  date: string,
  style: 'long' | 'short' = 'long',
): string {
  // Midi UTC : la date affichée ne dépend d'aucun fuseau.
  return formatter('UTC', {
    weekday: style,
    day: 'numeric',
    month: style,
  }).format(new Date(`${date}T12:00:00Z`))
}

export function formatValue(value: number | null, meta: FieldMeta): string {
  if (value === null) return '–'
  const factor = 10 ** meta.decimals
  // "+ 0" évite l'affichage de "-0" pour une valeur négative arrondie à 0
  const rounded = Math.round(value * (meta.scale ?? 1) * factor) / factor + 0
  return rounded.toLocaleString(LOCALE, {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  })
}

export function formatWithUnit(value: number | null, meta: FieldMeta): string {
  if (value === null) return '–'
  const sep = meta.unit === '%' || meta.unit === '°C' ? '' : ' '
  return `${formatValue(value, meta)}${sep}${meta.unit}`
}
