import { formatDegrees, formatHour } from '#/lib/format'
import type { SceneHour } from '#/lib/illustrated-view'
import { wetText } from '#/lib/illustrated-view'
import { DropIcon } from './ModelAgreement'
import { Scene } from './Scene'

export function HourRibbon({
  hours,
  timeZone,
}: {
  hours: SceneHour[]
  timeZone: string
}) {
  return (
    <section className="flex flex-col gap-3.5">
      <h2 className="m-0 font-display text-[26px] font-semibold">
        Les prochaines heures
      </h2>
      <ol className="m-0 flex list-none gap-2.5 overflow-x-auto p-0.5 pb-2">
        {hours.map((hour) => (
          <li
            key={hour.time}
            className="relative flex w-21 shrink-0 flex-col items-center gap-2 rounded-3xl bg-white pt-3 pb-2.5"
          >
            <span className="text-[13px] font-extrabold">
              {formatHour(hour.time, timeZone)}
            </span>
            <Scene
              kind={hour.kind}
              mood={hour.mood}
              night={hour.night}
              size={56}
            />
            <span className="font-display text-[22px] font-semibold">
              {formatDegrees(hour.temp)}
            </span>
            <span className="inline-flex min-h-4 items-center gap-1 text-xs font-bold text-drop-text">
              {hour.wetCount > 0 && (
                <>
                  <DropIcon filled size={12} />
                  <span aria-hidden="true">
                    {hour.wetCount}/{hour.precipModelCount}
                  </span>
                  <span className="sr-only">
                    {wetText(hour.wetCount, hour.precipModelCount)}
                  </span>
                </>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
