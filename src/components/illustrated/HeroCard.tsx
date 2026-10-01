import { DAILY_FIELD_META } from '#/lib/fields'
import { formatDegrees, formatLocalDate, formatWithUnit } from '#/lib/format'
import type { SceneDay } from '#/lib/illustrated-view'
import { ModelAgreement } from './ModelAgreement'
import { Scene } from './Scene'

const SUNSHINE_HOURS = { ...DAILY_FIELD_META.sunshine, decimals: 0 }

function Chip({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-chip px-3.5 py-2 text-[15px] font-bold">
      {icon}
      {children}
    </span>
  )
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const SunIcon = (
  <svg {...iconProps} stroke="#c27c00" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)

const DropIconSmall = (
  <svg {...iconProps} stroke="#3d86f0" aria-hidden="true">
    <path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z" />
  </svg>
)

const SnowIcon = (
  <svg {...iconProps} stroke="#5e8fd0" aria-hidden="true">
    <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
  </svg>
)

const WindIcon = (
  <svg {...iconProps} stroke="#2f9c7a" aria-hidden="true">
    <path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8" />
  </svg>
)

export function HeroCard({
  day,
  isToday,
}: {
  day: SceneDay
  isToday: boolean
}) {
  const date = formatLocalDate(day.date)
  const when = isToday
    ? `Aujourd’hui · ${date}`
    : date.charAt(0).toUpperCase() + date.slice(1)
  return (
    <section className="grid items-center gap-8 rounded-[32px] bg-white p-5 sm:p-7 md:grid-cols-[auto_minmax(0,1fr)]">
      <div className="flex justify-center">
        <Scene kind={day.kind} mood={day.mood} size={260} decorative />
      </div>
      <div className="flex flex-col gap-4">
        <p className="m-0 text-[15px] font-bold text-ink-soft">{when}</p>
        <div className="flex flex-wrap items-baseline gap-4">
          <span className="font-display text-8xl leading-[0.9] font-semibold">
            {formatDegrees(day.tempMax)}
          </span>
          <span className="text-[22px] font-bold text-ink-soft">
            min {formatDegrees(day.tempMin)}
          </span>
        </div>
        <h2 className="m-0 font-display text-[34px] font-semibold">
          {day.label}
        </h2>
        <p className="m-0 max-w-[46ch] text-lg leading-normal">
          {day.sentence}
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip icon={SunIcon}>
            Soleil {formatWithUnit(day.sunshine, SUNSHINE_HOURS)}
          </Chip>
          <Chip icon={DropIconSmall}>
            Précip. {formatWithUnit(day.precip, DAILY_FIELD_META.precip)}
          </Chip>
          {(day.snowfall ?? 0) >= 0.1 && (
            <Chip icon={SnowIcon}>
              Neige {formatWithUnit(day.snowfall, DAILY_FIELD_META.snowfall)}
            </Chip>
          )}
          <Chip icon={WindIcon}>
            Rafales{' '}
            {formatWithUnit(day.windGustsMax, DAILY_FIELD_META.windGustsMax)}
          </Chip>
        </div>
        <ModelAgreement
          confidence={day.confidence}
          tempModelCount={day.tempModelCount}
          tempMaxSpread={day.tempMaxSpread}
          wetCount={day.wetCount}
          precipModelCount={day.precipModelCount}
        />
      </div>
    </section>
  )
}
