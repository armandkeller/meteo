import { createFileRoute } from '@tanstack/react-router'
import { CitySearch } from '#/components/CitySearch'
import { ConfidenceLegend } from '#/components/Confidence'
import { MODEL_LABELS } from '#/lib/fields'
import { MODELS } from '#/providers/open-meteo'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Météo multi-modèles</h1>
        <p className="mt-3 text-slate-600">
          Compare {MODELS.length} modèles météo mondiaux, affiche la valeur la
          plus probable (médiane) et, surtout, un indice de confiance : plus
          les modèles divergent, moins la prévision est sûre.
        </p>
      </div>
      <CitySearch autoFocus />
      <ConfidenceLegend />
      <p className="text-sm text-slate-500">
        Modèles : {MODELS.map((m) => MODEL_LABELS[m] ?? m).join(', ')}. Données{' '}
        <a
          href="https://open-meteo.com/"
          className="underline hover:text-slate-700"
          target="_blank"
          rel="noreferrer"
        >
          Open-Meteo
        </a>
        .
      </p>
    </main>
  )
}
