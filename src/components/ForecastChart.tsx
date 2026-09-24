import { useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ForecastField } from '#/lib/aggregate'
import { CONFIDENCE_LABELS, HOURLY_FIELD_META } from '#/lib/fields'
import type { HourlyPoint } from '#/lib/forecast-view'
import {
  formatDateTimeDay,
  formatHour,
  formatValue,
  formatWithUnit,
} from '#/lib/format'

type ChartDatum = {
  t: number
  median: number | null
  range: [number, number] | null
  point: HourlyPoint
}

type Props = {
  hourly: HourlyPoint[]
  field: ForecastField
  timeZone: string
}

export function ForecastChart({ hourly, field, timeZone }: Props) {
  const meta = HOURLY_FIELD_META[field]
  const scale = meta.scale ?? 1

  const data = useMemo(
    () =>
      hourly.map((point): ChartDatum => {
        const v = point.values[field]
        return {
          t: Date.parse(point.time),
          median: v.median === null ? null : v.median * scale,
          range:
            v.min === null || v.max === null
              ? null
              : [v.min * scale, v.max * scale],
          point,
        }
      }),
    [hourly, field, scale],
  )

  // Un repère à chaque minuit local
  const dayTicks = useMemo(() => {
    const ticks: number[] = []
    let previous = ''
    for (const d of data) {
      if (d.point.date !== previous) {
        if (previous !== '') ticks.push(d.t)
        previous = d.point.date
      }
    }
    return ticks
  }, [data])

  const extendedStart = data.find((d) => d.point.extended)?.t
  const lastT = data.at(-1)?.t

  if (data.length === 0) return null

  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          {extendedStart !== undefined && lastT !== undefined && (
            <ReferenceArea
              x1={extendedStart}
              x2={lastT}
              fill="#94a3b8"
              fillOpacity={0.12}
              label={{
                value: 'Au-delà de 7 jours : confiance réduite',
                position: 'insideTopLeft',
                fontSize: 11,
                fill: '#475569',
              }}
            />
          )}
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={dayTicks}
            tickFormatter={(t: number) =>
              formatDateTimeDay(new Date(t).toISOString(), timeZone)
            }
            tick={{ fontSize: 11, fill: '#64748b' }}
            minTickGap={16}
          />
          <YAxis
            width={44}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={(v: number) => formatValue(v / scale, meta)}
            domain={
              meta.cumulative || meta.unit === '%'
                ? [0, 'auto']
                : ['auto', 'auto']
            }
            unit={meta.unit === '%' ? '%' : undefined}
          />
          <Tooltip
            content={({ active, payload }) => {
              const datum = payload?.[0]?.payload as ChartDatum | undefined
              if (!active || !datum) return null
              const v = datum.point.values[field]
              return (
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                  <div className="font-medium text-slate-900">
                    {formatDateTimeDay(datum.point.time, timeZone)},{' '}
                    {formatHour(datum.point.time, timeZone)}
                  </div>
                  <div className="mt-1 text-slate-700">
                    Médiane : <strong>{formatWithUnit(v.median, meta)}</strong>
                  </div>
                  <div className="text-slate-600">
                    Écart : {formatWithUnit(v.min, meta)} à{' '}
                    {formatWithUnit(v.max, meta)}
                  </div>
                  <div className="text-slate-600">
                    {v.modelCount} modèle{v.modelCount > 1 ? 's' : ''} ·{' '}
                    {CONFIDENCE_LABELS[v.confidence]}
                  </div>
                </div>
              )
            }}
          />
          <Area
            dataKey="range"
            type={meta.cumulative ? 'stepBefore' : 'monotone'}
            stroke="none"
            fill="#0ea5e9"
            fillOpacity={0.18}
            isAnimationActive={false}
            connectNulls={false}
            name="Écart entre modèles"
          />
          <Line
            dataKey="median"
            type={meta.cumulative ? 'stepBefore' : 'monotone'}
            stroke="#0369a1"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
            name="Médiane"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
