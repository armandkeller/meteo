import type { SceneKind, SceneMood } from '#/lib/scene'
import { SCENE_LABELS } from '#/lib/scene'
import { DoubtBubble, SCENE_ART } from './scene-parts'

const SCENE_BG: Record<SceneKind, string> = {
  soleil: '#ffedb3',
  eclaircies: '#dcebff',
  nuageux: '#e4e9f1',
  averses: '#dce7f7',
  pluie: '#c9d8f0',
  neige: '#e9f1fb',
  vent: '#d8f1e7',
  nuit: '#2e3a6e',
}

// Fond des heures de nuit (nuages, averses…) : ciel sombre.
const NIGHT_BG = '#3a4677'

type SceneProps = {
  kind: SceneKind
  mood?: SceneMood
  night?: boolean
  size?: number // px
  // Le libellé est déjà écrit à côté : masquée aux lecteurs d'écran
  decorative?: boolean
  className?: string
}

export function Scene({
  kind,
  mood = 'sure',
  night = false,
  size = 96,
  decorative = false,
  className = '',
}: SceneProps) {
  const Art = SCENE_ART[kind]
  const label =
    mood === 'hesite'
      ? `${SCENE_LABELS[kind]} (les modèles hésitent)`
      : SCENE_LABELS[kind]
  const background = night && kind !== 'nuit' ? NIGHT_BG : SCENE_BG[kind]
  const a11y = decorative
    ? { 'aria-hidden': true }
    : { role: 'img', 'aria-label': label }
  return (
    <span
      {...a11y}
      className={`inline-flex shrink-0 overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        background,
        borderRadius: Math.round(size * 0.24),
      }}
    >
      <svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
        <Art mood={mood} night={night} />
        {mood === 'hesite' && <DoubtBubble />}
      </svg>
    </span>
  )
}
