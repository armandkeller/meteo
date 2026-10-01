import { useState } from 'react'
import type { IllustratedView as IllustratedViewData } from '#/lib/illustrated-view'
import { DayCards } from './DayCards'
import { ExtendedTrend } from './ExtendedTrend'
import { HeroCard } from './HeroCard'
import { HourRibbon } from './HourRibbon'

type IllustratedViewProps = {
  illustrated: IllustratedViewData // calculée côté serveur
  timeZone: string
}

export function IllustratedView({
  illustrated,
  timeZone,
}: IllustratedViewProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const { days, extended, hours, today } = illustrated
  const hero = days.find((d) => d.date === selected) ?? days[0]

  return (
    <div className="flex flex-col gap-7 rounded-[36px] bg-ground p-3 font-rounded text-ink sm:p-6">
      {hero ? (
        <HeroCard day={hero} isToday={hero.date === today} />
      ) : (
        <p className="m-0 rounded-[32px] bg-white p-6">
          Pas assez de données pour illustrer cette prévision.
        </p>
      )}
      {hours.length > 0 && <HourRibbon hours={hours} timeZone={timeZone} />}
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
