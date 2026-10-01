import type { SceneKind, SceneMood } from '#/lib/scene'

// Dessins des scènes, dans un repère de 200 × 200. Les groupes animés
// (classes `scene-*` de styles.css) n'ont jamais d'attribut `transform` :
// le positionnement se fait sur un groupe parent.

const INK = '#23304f'
const CHEEK = '#ff8a8a'
const SUN = '#ffc93c'
const SUN_RAY = '#ffb020'
const SUN_LIGHT = '#ffe08a'
const DROP = '#3d86f0'

const stroke = {
  fill: 'none',
  stroke: INK,
  strokeWidth: 3.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

type Expression = 'smile' | 'sleepy' | 'pout' | 'open' | 'puff' | 'oh'

function OpenEyes() {
  return (
    <>
      <ellipse cx={-15} cy={0} rx={4.5} ry={6} fill={INK} />
      <ellipse cx={15} cy={0} rx={4.5} ry={6} fill={INK} />
      <circle cx={-13.5} cy={-2.5} r={1.7} fill="#fff" />
      <circle cx={16.5} cy={-2.5} r={1.7} fill="#fff" />
    </>
  )
}

function SureFace({ expression }: { expression: Expression }) {
  switch (expression) {
    case 'sleepy':
      return (
        <>
          <path d="M-20 0 q5 5 10 0" {...stroke} />
          <path d="M10 0 q5 5 10 0" {...stroke} />
          <path d="M-6 10 Q0 15 6 10" {...stroke} />
        </>
      )
    case 'pout':
      return (
        <>
          <path d="M-20 1 q5 -5 10 0" {...stroke} />
          <path d="M10 1 q5 -5 10 0" {...stroke} />
          <path d="M-6 13 Q0 8 6 13" {...stroke} />
        </>
      )
    case 'open':
      return (
        <>
          <OpenEyes />
          <path d="M-8 8 Q0 18 8 8 Z" fill={INK} />
        </>
      )
    case 'puff':
      return (
        <>
          <path d="M-20 -2 L-10 2 L-20 6" {...stroke} />
          <path d="M20 -2 L10 2 L20 6" {...stroke} />
          <circle cx={0} cy={12} r={4.5} {...stroke} strokeWidth={3} />
        </>
      )
    case 'oh':
      return (
        <>
          <OpenEyes />
          <ellipse cx={0} cy={11} rx={4} ry={3.5} fill={INK} />
        </>
      )
    default:
      return (
        <>
          <OpenEyes />
          <path d="M-7 9 Q0 17 7 9" {...stroke} />
        </>
      )
  }
}

// Confiance faible : sourcils froncés et bouche ondulée.
function DoubtFace() {
  return (
    <>
      <ellipse cx={-15} cy={1} rx={4.5} ry={5.5} fill={INK} />
      <ellipse cx={15} cy={1} rx={4.5} ry={5.5} fill={INK} />
      <circle cx={-13.5} cy={-1} r={1.6} fill="#fff" />
      <circle cx={16.5} cy={-1} r={1.6} fill="#fff" />
      <path d="M-21 -11 L-9 -13" {...stroke} strokeWidth={3} />
      <path d="M9 -15 L21 -10" {...stroke} strokeWidth={3} />
      <path d="M-9 12 q4.5 -4 9 0 t9 0" {...stroke} strokeWidth={3} />
    </>
  )
}

function Face({
  x,
  y,
  scale = 1,
  mood,
  expression = 'smile',
}: {
  x: number
  y: number
  scale?: number
  mood: SceneMood
  expression?: Expression
}) {
  const puffed = expression === 'puff' && mood === 'sure'
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse
        cx={puffed ? -24 : -26}
        cy={9}
        rx={puffed ? 9 : 7}
        ry={puffed ? 6 : 4.5}
        fill={CHEEK}
        opacity={0.6}
      />
      <ellipse
        cx={puffed ? 24 : 26}
        cy={9}
        rx={puffed ? 9 : 7}
        ry={puffed ? 6 : 4.5}
        fill={CHEEK}
        opacity={0.6}
      />
      {mood === 'hesite' ? <DoubtFace /> : <SureFace expression={expression} />}
    </g>
  )
}

// Nuage de base : environ x 46 → 158, y 76 → 160 (ombre comprise).
function Cloud({ fill, shade }: { fill: string; shade?: string }) {
  const shape = (
    <>
      <circle cx={70} cy={128} r={24} />
      <circle cx={100} cy={110} r={34} />
      <circle cx={132} cy={126} r={26} />
      <rect x={46} y={124} width={112} height={30} rx={15} />
    </>
  )
  return (
    <>
      {shade && (
        <g fill={shade} transform="translate(0 6)">
          {shape}
        </g>
      )}
      <g fill={fill}>{shape}</g>
    </>
  )
}

// Directions des 12 rayons (cos, sin tous les 30°), en constantes : Math.cos
// ne donne pas les mêmes dernières décimales sur le serveur et le navigateur,
// ce qui casserait l'hydratation.
const RAYS = [
  [1, 0],
  [0.866, 0.5],
  [0.5, 0.866],
  [0, 1],
  [-0.5, 0.866],
  [-0.866, 0.5],
  [-1, 0],
  [-0.866, -0.5],
  [-0.5, -0.866],
  [0, -1],
  [0.5, -0.866],
  [0.866, -0.5],
] as const

function Sun({
  x,
  y,
  r,
  ray,
  rayWidth,
}: {
  x: number
  y: number
  r: number
  ray: number // longueur des rayons
  rayWidth: number
}) {
  const r1 = r + rayWidth + 2
  const r2 = r1 + ray
  return (
    <g transform={`translate(${x} ${y})`}>
      <g
        className="scene-spin"
        stroke={SUN_RAY}
        strokeWidth={rayWidth}
        strokeLinecap="round"
      >
        {RAYS.map(([cos, sin]) => (
          <line
            key={`${cos},${sin}`}
            x1={r1 * cos}
            y1={r1 * sin}
            x2={r2 * cos}
            y2={r2 * sin}
          />
        ))}
      </g>
      <circle r={r} fill={SUN} />
      <circle cx={-r * 0.38} cy={-r * 0.44} r={r * 0.18} fill={SUN_LIGHT} />
    </g>
  )
}

function SmallMoon({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill={SUN_LIGHT} />
      <circle cx={-r * 0.35} cy={-r * 0.25} r={r * 0.2} fill="#f4cd6a" />
      <circle cx={r * 0.3} cy={r * 0.35} r={r * 0.14} fill="#f4cd6a" />
    </g>
  )
}

function Drop({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="scene-fall" style={{ animationDelay: `${delay}s` }}>
        <path
          d="M0 -9 C3 -4 6 0 6 4 A6 6 0 0 1 -6 4 C-6 0 -3 -4 0 -9 Z"
          fill={DROP}
        />
      </g>
    </g>
  )
}

function Flake({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g
        className="scene-fall-slow"
        style={{ animationDelay: `${delay}s` }}
        stroke="#5e8fd0"
        strokeWidth={3.5}
        strokeLinecap="round"
      >
        <line x1={0} y1={-8} x2={0} y2={8} />
        <line x1={-7} y1={-4} x2={7} y2={4} />
        <line x1={-7} y1={4} x2={7} y2={-4} />
      </g>
    </g>
  )
}

function Star({
  x,
  y,
  scale = 1,
  delay,
}: {
  x: number
  y: number
  scale?: number
  delay: number
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        className="scene-twinkle"
        style={{ animationDelay: `${delay}s` }}
        d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z"
        fill="#fff0b8"
      />
    </g>
  )
}

// Bulle « ? » des scènes dont la confiance est faible.
export function DoubtBubble() {
  return (
    <g transform="translate(166 36)">
      <g className="scene-bob">
        <circle r={17} fill="#fff" stroke={INK} strokeWidth={3} />
        <text
          y={8}
          textAnchor="middle"
          fontSize={24}
          fontWeight={600}
          fontFamily="Fredoka, ui-rounded, sans-serif"
          fill={INK}
        >
          ?
        </text>
      </g>
    </g>
  )
}

type ArtProps = { mood: SceneMood; night: boolean }

function SoleilArt({ mood }: ArtProps) {
  return (
    <>
      <Sun x={100} y={100} r={52} ray={18} rayWidth={10} />
      <Face x={100} y={108} scale={1.25} mood={mood} />
    </>
  )
}

function EclairciesArt({ mood }: ArtProps) {
  return (
    <>
      <Sun x={126} y={74} r={34} ray={12} rayWidth={8} />
      <g transform="translate(-12 18)">
        <g className="scene-drift">
          <Cloud fill="#fff" shade="#c9d6e8" />
          <Face x={100} y={130} mood={mood} />
        </g>
      </g>
    </>
  )
}

function NuageuxArt({ mood }: ArtProps) {
  return (
    <>
      <g transform="translate(70 22) scale(0.66)">
        <g
          className="scene-drift"
          style={{ animationDuration: '8s', animationDirection: 'reverse' }}
        >
          <Cloud fill="#bfcadb" />
        </g>
      </g>
      <g transform="translate(-14 18)">
        <g className="scene-drift">
          <Cloud fill="#fff" shade="#c9d3e2" />
          <Face x={100} y={130} mood={mood} expression="sleepy" />
        </g>
      </g>
    </>
  )
}

function AversesArt({ mood, night }: ArtProps) {
  return (
    <>
      {night ? (
        <SmallMoon x={62} y={66} r={28} />
      ) : (
        <Sun x={62} y={66} r={28} ray={10} rayWidth={7} />
      )}
      <g transform="translate(12 0)">
        <Cloud fill="#f4f7fb" shade="#c3cedf" />
        <Face x={100} y={130} mood={mood} expression="oh" />
      </g>
      <Drop x={86} y={172} delay={0} />
      <Drop x={116} y={176} delay={0.45} />
    </>
  )
}

function PluieArt({ mood }: ArtProps) {
  return (
    <>
      <g transform="translate(0 -10)">
        <Cloud fill="#b7c4d9" shade="#93a2bc" />
        <Face x={100} y={130} mood={mood} expression="pout" />
      </g>
      <Drop x={66} y={166} delay={0} />
      <Drop x={90} y={172} delay={0.5} />
      <Drop x={114} y={166} delay={0.25} />
      <Drop x={138} y={172} delay={0.75} />
    </>
  )
}

function NeigeArt({ mood }: ArtProps) {
  return (
    <>
      <g transform="translate(0 -12)">
        <Cloud fill="#fff" shade="#c3d3e8" />
        <Face x={100} y={130} mood={mood} expression="open" />
      </g>
      <Flake x={70} y={160} delay={0} />
      <Flake x={100} y={168} delay={0.8} />
      <Flake x={130} y={160} delay={1.6} />
    </>
  )
}

function VentArt({ mood }: ArtProps) {
  return (
    <>
      <g transform="translate(-24 -4)">
        <Cloud fill="#fff" shade="#bfdccf" />
        <Face x={104} y={130} mood={mood} expression="puff" />
      </g>
      <g
        className="scene-drift"
        style={{ animationDuration: '1.4s' }}
        fill="none"
        stroke="#2f9c7a"
        strokeWidth={7}
        strokeLinecap="round"
      >
        <path d="M146 92 H172 a10 10 0 1 0 -10 -10" />
        <path d="M150 122 H186" />
        <path d="M144 152 H168 a9 9 0 1 1 -9 9" />
      </g>
    </>
  )
}

function NuitArt({ mood }: ArtProps) {
  return (
    <>
      <Star x={138} y={30} delay={0} />
      <Star x={174} y={120} scale={0.8} delay={0.6} />
      <Star x={34} y={44} scale={0.9} delay={1.1} />
      <Star x={38} y={160} scale={0.7} delay={0.3} />
      <Star x={152} y={172} scale={0.6} delay={1.4} />
      <circle cx={96} cy={104} r={50} fill={SUN_LIGHT} />
      <circle cx={70} cy={82} r={8} fill="#f4cd6a" />
      <circle cx={124} cy={128} r={7} fill="#f4cd6a" />
      <circle cx={122} cy={78} r={5} fill="#f4cd6a" />
      <Face x={96} y={112} scale={1.1} mood={mood} expression="sleepy" />
    </>
  )
}

export const SCENE_ART: Record<
  SceneKind,
  (props: ArtProps) => React.ReactNode
> = {
  soleil: SoleilArt,
  eclaircies: EclairciesArt,
  nuageux: NuageuxArt,
  averses: AversesArt,
  pluie: PluieArt,
  neige: NeigeArt,
  vent: VentArt,
  nuit: NuitArt,
}
