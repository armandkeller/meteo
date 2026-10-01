import type { Confidence } from '#/lib/aggregate'
import { wetText } from '#/lib/illustrated-view'
import { AGREEMENT_LABELS } from '#/lib/scene'

const AGREEMENT_BG: Record<Confidence, string> = {
  elevee: 'bg-agree-high',
  moyenne: 'bg-agree-mid',
  faible: 'bg-agree-low',
}

export function DropIcon({
  filled,
  size = 22,
}: {
  filled: boolean
  size?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"
        fill={filled ? '#3d86f0' : 'none'}
        stroke={filled ? '#3d86f0' : '#7d8aa3'}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Une goutte par modèle disponible, pleine s'il prévoit des précipitations.
export function WetDrops({
  wetCount,
  modelCount,
}: {
  wetCount: number
  modelCount: number
}) {
  const drops = Array.from({ length: modelCount }, (_, i) => ({
    id: i,
    filled: i < wetCount,
  }))
  return (
    <span className="flex gap-1" aria-hidden="true">
      {drops.map((drop) => (
        <DropIcon key={drop.id} filled={drop.filled} />
      ))}
    </span>
  )
}

type ModelAgreementProps = {
  confidence: Confidence
  tempModelCount: number
  tempMaxSpread: number | null
  wetCount: number
  precipModelCount: number
}

export function ModelAgreement({
  confidence,
  tempModelCount,
  tempMaxSpread,
  wetCount,
  precipModelCount,
}: ModelAgreementProps) {
  const models = `${tempModelCount} modèle${tempModelCount > 1 ? 's' : ''}`
  const spread =
    tempMaxSpread === null
      ? ''
      : ` · écart de ${Math.round(tempMaxSpread)}° sur le max`
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-[22px] px-4.5 py-4 ${AGREEMENT_BG[confidence]}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <strong className="font-display text-xl font-semibold">
          {AGREEMENT_LABELS[confidence]}
        </strong>
        <span className="text-sm font-semibold">
          {models}
          {spread}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <WetDrops wetCount={wetCount} modelCount={precipModelCount} />
        <span className="text-[15px]">
          {wetText(wetCount, precipModelCount)}
        </span>
      </div>
    </div>
  )
}
