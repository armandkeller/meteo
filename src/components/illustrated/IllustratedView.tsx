import { useMemo, useState } from 'react'
import type { ForecastView } from '#/lib/forecast-view'
import { buildIllustratedView } from '#/lib/illustrated-view'
import { DayCards } from './DayCards'
import { ExtendedTrend } from './ExtendedTrend'
import { HeroCard } from './HeroCard'
import { HourRibbon } from './HourRibbon'

type IllustratedViewProps = {
  view: ForecastView
  lat: number
  lon: number
}

export function IllustratedView({ view, lat, lon }: IllustratedViewProps) {
  const illustrated = useMemo(
    () => buildIllustratedView(view, lat, lon),
    [view, lat, lon],
  )
  const [selected, setSelected] = useState<string | null>(null)
  const { days, extended, hours } = illustrated
  const hero = days.find((d) => d.date === selected) ?? days[0]
  // Date locale de l'heure en cours (le détail horaire commence là)
  const today = view.hourly[0]?.date

  return (
    <div className="flex flex-col gap-7 rounded-[36px] bg-ground p-3 font-rounded text-ink sm:p-6">
      {hero ? (
        <HeroCard day={hero} isToday={hero.date === today} />
      ) : (
        <p className="m-0 rounded-[32px] bg-white p-6">
          Pas assez de données pour illustrer cette prévision.
        </p>
      )}
      {hours.length > 0 && (
        <HourRibbon hours={hours} timeZone={view.timeZone} />
      )}
      {hero && (
        <DayCards
          days={days}
          selected={hero.date}
          today={today}
          onSelect={setSelected}
        />
      )}
      {extended.length > 0 && <ExtendedTrend days={extended} />}
    </div>
  )
}
