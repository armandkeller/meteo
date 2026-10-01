import { Fragment } from 'react'
import type { DailyField, ForecastField } from '#/lib/aggregate'
import { DAILY_FIELDS, FORECAST_FIELDS } from '#/lib/aggregate'
import type { FieldMeta } from '#/lib/fields'
import {
  CONFIDENCE_LABELS,
  DAILY_FIELD_META,
  HOURLY_FIELD_META,
} from '#/lib/fields'
import type { DailyPoint, HourlyPoint, RatedValue } from '#/lib/forecast-view'
import {
  formatHour,
  formatLocalDate,
  formatValue,
  formatWithUnit,
} from '#/lib/format'
import { ConfidenceDot } from './Confidence'

const HOURLY_WET_LABEL = "au moins 0,1 mm dans l'heure"
const DAILY_WET_LABEL = 'au moins 1 mm sur la journée'

function describe(value: RatedValue, meta: FieldMeta): string {
  const parts = [CONFIDENCE_LABELS[value.confidence]]
  if (value.modelCount > 0) {
    parts.push(
      `écart ${formatWithUnit(value.min, meta)} à ${formatWithUnit(value.max, meta)}`,
    )
  }
  parts.push(`${value.modelCount} modèle${value.modelCount > 1 ? 's' : ''}`)
  return parts.join(' · ')
}

function ValueCell({ value, meta }: { value: RatedValue; meta: FieldMeta }) {
  return (
    <td
      className="px-2 py-1.5 text-right tabular-nums"
      title={describe(value, meta)}
    >
      <span className="inline-flex items-center justify-end gap-1.5">
        {formatValue(value.median, meta)}
        {value.modelCount > 0 && <ConfidenceDot level={value.confidence} />}
      </span>
    </td>
  )
}

// Part des modèles qui prévoient de la pluie : la médiane horaire tombe
// à 0 dès que les modèles se décalent de quelques heures.
function WetCell({ value, label }: { value: RatedValue; label: string }) {
  if (value.wetCount === undefined || value.modelCount === 0) {
    return <td className="px-2 py-1.5 text-right text-slate-400">–</td>
  }
  const share = value.wetCount / value.modelCount
  const tone =
    value.wetCount === 0
      ? 'text-slate-400'
      : share >= 0.5
        ? 'font-medium text-sky-700'
        : 'text-sky-600'
  return (
    <td
      className={`px-2 py-1.5 text-right tabular-nums ${tone}`}
      title={`${value.wetCount} modèle${value.wetCount > 1 ? 's' : ''} sur ${value.modelCount} prévoi${value.wetCount > 1 ? 'ent' : 't'} ${label}`}
    >
      {value.wetCount}/{value.modelCount}
    </td>
  )
}

function WetHeaderCell({ label }: { label: string }) {
  return (
    <th
      scope="col"
      className="px-2 py-2 text-right font-medium whitespace-nowrap"
      title={`Nombre de modèles qui prévoient ${label}`}
    >
      Pluie ?
      <span className="block text-[10px] font-normal text-slate-400">
        modèles
      </span>
    </th>
  )
}

function HeaderCell({ meta }: { meta: FieldMeta }) {
  return (
    <th
      scope="col"
      className="px-2 py-2 text-right font-medium whitespace-nowrap"
      title={meta.hint ? `${meta.label} – ${meta.hint}` : meta.label}
    >
      {meta.short}
      <span className="block text-[10px] font-normal text-slate-400">
        {meta.unit}
      </span>
    </th>
  )
}

function groupByDate(hourly: HourlyPoint[]): [string, HourlyPoint[]][] {
  const groups = new Map<string, HourlyPoint[]>()
  for (const point of hourly) {
    const list = groups.get(point.date) ?? []
    list.push(point)
    groups.set(point.date, list)
  }
  return [...groups]
}

export function HourlyTable({
  hourly,
  timeZone,
}: {
  hourly: HourlyPoint[]
  timeZone: string
}) {
  const days = groupByDate(hourly)
  return (
    <div className="space-y-2">
      {days.map(([date, points], i) => (
        <details
          key={date}
          open={i === 0}
          className="group rounded-lg border border-slate-200 bg-white"
        >
          <summary className="flex cursor-pointer items-center justify-between px-4 py-2.5 font-medium text-slate-800 select-none">
            <span className="first-letter:uppercase">
              {formatLocalDate(date)}
            </span>
            <span className="text-xs font-normal text-slate-500 group-open:hidden">
              Afficher les heures
            </span>
          </summary>
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    Heure
                  </th>
                  {FORECAST_FIELDS.map((field) => (
                    <Fragment key={field}>
                      <HeaderCell meta={HOURLY_FIELD_META[field]} />
                      {field === 'precip' && (
                        <WetHeaderCell label={HOURLY_WET_LABEL} />
                      )}
                    </Fragment>
                  ))}
                  <th scope="col" className="px-2 py-2 text-right font-medium">
                    Modèles
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {points.map((point) => (
                  <tr key={point.time} className="hover:bg-slate-50">
                    <th
                      scope="row"
                      className="px-3 py-1.5 text-left font-normal text-slate-600 tabular-nums whitespace-nowrap"
                    >
                      {formatHour(point.time, timeZone)}
                    </th>
                    {FORECAST_FIELDS.map((field: ForecastField) => (
                      <Fragment key={field}>
                        <ValueCell
                          value={point.values[field]}
                          meta={HOURLY_FIELD_META[field]}
                        />
                        {field === 'precip' && (
                          <WetCell
                            value={point.values.precip}
                            label={HOURLY_WET_LABEL}
                          />
                        )}
                      </Fragment>
                    ))}
                    <td className="px-2 py-1.5 text-right text-slate-500 tabular-nums">
                      {point.values.temp.modelCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </div>
  )
}

export function DailyTable({ daily }: { daily: DailyPoint[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs text-slate-600">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Jour
            </th>
            {DAILY_FIELDS.map((field: DailyField) => (
              <Fragment key={field}>
                <HeaderCell meta={DAILY_FIELD_META[field]} />
                {field === 'precip' && (
                  <WetHeaderCell label={DAILY_WET_LABEL} />
                )}
              </Fragment>
            ))}
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Modèles
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {daily.map((day) => (
            <tr key={day.date} className="hover:bg-slate-50">
              <th
                scope="row"
                className="px-3 py-1.5 text-left font-normal whitespace-nowrap text-slate-700"
              >
                <span className="first-letter:uppercase">
                  {formatLocalDate(day.date, 'short')}
                </span>
                {day.hourCount < 24 && (
                  <span
                    className="ml-1 text-xs text-slate-400"
                    title={`Journée partielle : ${day.hourCount} h de prévision`}
                  >
                    ({day.hourCount} h)
                  </span>
                )}
              </th>
              {DAILY_FIELDS.map((field) => (
                <Fragment key={field}>
                  <ValueCell
                    value={day.values[field]}
                    meta={DAILY_FIELD_META[field]}
                  />
                  {field === 'precip' && (
                    <WetCell
                      value={day.values.precip}
                      label={DAILY_WET_LABEL}
                    />
                  )}
                </Fragment>
              ))}
              <td className="px-2 py-1.5 text-right text-slate-500 tabular-nums">
                {day.values.tempMax.modelCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
