import type { Confidence } from '#/lib/aggregate'
import { CONFIDENCE_LABELS } from '#/lib/fields'

const DOT_CLASS: Record<Confidence, string> = {
  elevee: 'bg-emerald-500',
  moyenne: 'bg-amber-400',
  faible: 'bg-rose-500',
}

const BADGE_CLASS: Record<Confidence, string> = {
  elevee: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  moyenne: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  faible: 'bg-rose-50 text-rose-800 ring-rose-600/20',
}

export function ConfidenceDot({ level }: { level: Confidence }) {
  return (
    <span
      className={`inline-block size-2 shrink-0 rounded-full ${DOT_CLASS[level]}`}
      aria-label={CONFIDENCE_LABELS[level]}
      role="img"
    />
  )
}

export function ConfidenceBadge({ level }: { level: Confidence }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE_CLASS[level]}`}
    >
      <ConfidenceDot level={level} />
      {CONFIDENCE_LABELS[level]}
    </span>
  )
}

export function ConfidenceLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
      {(['elevee', 'moyenne', 'faible'] as const).map((level) => (
        <span key={level} className="inline-flex items-center gap-1.5">
          <ConfidenceDot level={level} />
          {CONFIDENCE_LABELS[level]}
        </span>
      ))}
      <span className="text-slate-500">
        Selon l'écart entre modèles. Moins de 3 modèles : confiance faible.
      </span>
    </div>
  )
}
