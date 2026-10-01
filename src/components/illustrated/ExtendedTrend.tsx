import { MAIN_FORECAST_DAYS } from '#/lib/forecast-view'
import { formatDegrees, formatLocalDate } from '#/lib/format'
import type { SceneDay } from '#/lib/illustrated-view'
import { Scene } from './Scene'

export function ExtendedTrend({ days }: { days: SceneDay[] }) {
  return (
    <section className="flex flex-col gap-3.5 rounded-[32px] border-2 border-dashed border-[#a9b6cc] bg-[#e3eaf5] p-5">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 font-display text-[22px] font-semibold">
          Au-delà de {MAIN_FORECAST_DAYS} jours : une simple tendance
        </h2>
        <p className="m-0 text-[15px] text-[#3e4a66]">
          Il ne reste que quelques modèles, qui divergent souvent. Les
          personnages restent prudents.
        </p>
      </div>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2.5 p-0">
        {days.map((day) => (
          <li
            key={day.date}
            className="flex flex-col items-center gap-1.5 rounded-[22px] bg-[#f6f9fd] px-1.5 py-3 text-center"
          >
            <span className="text-[13px] font-extrabold">
              {formatLocalDate(day.date, 'short')}
            </span>
            <Scene
              kind={day.kind}
              mood={day.mood}
              size={64}
              className="opacity-80"
            />
            <span className="font-display text-[17px] font-medium">
              {formatDegrees(day.tempMax)}{' '}
              <span className="text-ink-soft">
                {formatDegrees(day.tempMin)}
              </span>
            </span>
            <span className="text-xs text-[#4a5672]">
              {day.tempModelCount} modèle{day.tempModelCount > 1 ? 's' : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
