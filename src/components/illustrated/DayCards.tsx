import type { Confidence } from '#/lib/aggregate'
import { formatDegrees, formatLocalDate } from '#/lib/format'
import type { SceneDay } from '#/lib/illustrated-view'
import { wetText } from '#/lib/illustrated-view'
import { AGREEMENT_BG, DropIcon } from './ModelAgreement'
import { Scene } from './Scene'

const CONFIDENCE_TAG: Record<Confidence, string> = {
  elevee: 'Sûr',
  moyenne: 'Assez sûr',
  faible: 'Incertain',
}

type DayCardsProps = {
  days: SceneDay[]
  selected: string
  today: string | undefined
  onSelect: (date: string) => void
}

export function DayCards({ days, selected, today, onSelect }: DayCardsProps) {
  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 font-display text-[26px] font-semibold">
          Les {days.length} prochains jours
        </h2>
        <p className="m-0 text-sm text-ink-soft">
          Touchez un jour pour l’afficher en grand.
        </p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
        {days.map((day) => {
          const isSelected = day.date === selected
          return (
            <button
              key={day.date}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(day.date)}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-[28px] border-3 bg-white px-2.5 pt-3.5 pb-4 text-center text-ink transition-colors focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-drop ${
                isSelected
                  ? 'border-ink'
                  : 'border-white hover:border-slate-300'
              }`}
            >
              <span className="text-base font-extrabold">
                {day.date === today
                  ? 'Aujourd’hui'
                  : formatLocalDate(day.date, 'short')}
              </span>
              <Scene kind={day.kind} mood={day.mood} size={92} />
              <span className="font-display text-[22px] font-semibold">
                {formatDegrees(day.tempMax)}{' '}
                <span className="text-[17px] text-ink-soft">
                  {formatDegrees(day.tempMin)}
                </span>
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${AGREEMENT_BG[day.confidence]}`}
              >
                {CONFIDENCE_TAG[day.confidence]}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-drop-text">
                <DropIcon filled={day.wetCount > 0} size={12} />
                <span aria-hidden="true">
                  {day.wetCount}/{day.precipModelCount} modèles
                </span>
                <span className="sr-only">
                  {wetText(day.wetCount, day.precipModelCount)}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
