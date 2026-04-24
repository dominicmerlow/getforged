// Server component — pure SVG + CSS animations, no client JS needed

const C   = '#fbf6ec'
const A   = '#b97314'
const DIM = 'rgba(251,246,236,0.12)'
const MED = 'rgba(251,246,236,0.32)'
const HLF = 'rgba(251,246,236,0.55)'
const AMB = 'rgba(185,115,20,0.25)'

const KEYFRAMES = `
@keyframes gf-draw   { from{stroke-dashoffset:var(--dl,500)} to{stroke-dashoffset:0} }
@keyframes gf-fadeIn { from{opacity:0} to{opacity:1} }
@keyframes gf-rise   { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
@keyframes gf-pulse  { 0%,100%{opacity:.55} 50%{opacity:1} }
@keyframes gf-slideR {
  0%,12%  { transform:translateX(0);    opacity:1 }
  40%,50% { transform:translateX(125px);opacity:1 }
  62%,100%{ transform:translateX(125px);opacity:0 }
}
@keyframes gf-flyUp {
  0%   { opacity:1; transform:translate(0,0) scale(1) }
  100% { opacity:0; transform:translate(55px,-55px) scale(.3) }
}
@keyframes gf-blink { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes gf-wobble {
  0%,100%{ transform:rotate(0deg) }
  25%    { transform:rotate(-3deg) }
  75%    { transform:rotate(3deg) }
}
`

// ─── Shared helpers ─────────────────────────────────────────────────────────

function Grid({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={id} width="32" height="32" patternUnits="userSpaceOnUse">
        <path d="M32 0L0 0 0 32" fill="none" stroke="rgba(251,246,236,0.05)" strokeWidth=".5" />
      </pattern>
    </defs>
  )
}

function Label({ text }: { text: string }) {
  return (
    <text x="12" y="232" fill="rgba(251,246,236,0.35)" fontSize="10" fontFamily="DM Mono,monospace">
      {text}
    </text>
  )
}

// ─── 1. AI Automation ────────────────────────────────────────────────────────
// Animated workflow pipeline — amber dots flow along paths between nodes

function AIAutomation() {
  // Node positions
  const nodes = [
    { cx: 48,  cy: 125, label: 'INPUT', amber: false },
    { cx: 148, cy: 65,  label: 'PARSE', amber: false },
    { cx: 235, cy: 125, label: 'ROUTE', amber: true  },
    { cx: 328, cy: 65,  label: 'DB',    amber: false },
    { cx: 328, cy: 185, label: 'EMAIL', amber: false },
  ]
  // Dot paths (animateMotion)
  const flows = [
    { path: 'M 68 118 L 128 72',   dur: '2s',   begin: '0s'    },
    { path: 'M 168 68 L 213 118',  dur: '2s',   begin: '0.65s' },
    { path: 'M 257 118 L 308 72',  dur: '1.8s', begin: '1.3s'  },
    { path: 'M 257 130 L 308 178', dur: '1.8s', begin: '1.55s' },
  ]
  return (
    <svg viewBox="0 0 380 245" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%">
      <Grid id="g-ai" />
      <rect width="380" height="245" fill="url(#g-ai)" />

      {/* Connection lines */}
      <line x1="68"  y1="118" x2="128" y2="72"  stroke={MED} strokeWidth="1.5" />
      <line x1="168" y1="68"  x2="213" y2="118" stroke={MED} strokeWidth="1.5" />
      <line x1="257" y1="118" x2="308" y2="72"  stroke={MED} strokeWidth="1.5" />
      <line x1="257" y1="130" x2="308" y2="178" stroke={MED} strokeWidth="1.5" />

      {/* Flowing amber dots */}
      {flows.map((f, i) => (
        <circle key={i} r="5" fill={A} opacity=".9">
          <animateMotion dur={f.dur} repeatCount="indefinite" begin={f.begin} path={f.path} />
        </circle>
      ))}

      {/* Nodes */}
      {nodes.map(n => (
        <g key={n.label}>
          <circle
            cx={n.cx} cy={n.cy} r={n.amber ? 24 : 20}
            fill={n.amber ? AMB : DIM}
            stroke={n.amber ? A : C}
            strokeWidth={n.amber ? 2 : 1.5}
          >
            {n.amber && (
              <animate attributeName="r" values="24;26;24" dur="3s" repeatCount="indefinite" />
            )}
          </circle>
          <text
            x={n.cx} y={n.cy + 4}
            textAnchor="middle"
            fill={n.amber ? A : C}
            fontSize="9"
            fontFamily="DM Mono,monospace"
            fontWeight={n.amber ? '600' : '400'}
          >
            {n.label}
          </text>
        </g>
      ))}

      <Label text="live automation pipeline" />
    </svg>
  )
}

// ─── 2. Web Apps & Internal Tools ────────────────────────────────────────────
// Browser chrome with animated bar chart growing inside

function WebApps() {
  const BASE = 205
  // bars: [x, targetHeight, delay]
  const bars: [number, number, string][] = [
    [108, 55,  '0.1s'],
    [148, 95,  '0.3s'],
    [188, 70,  '0.5s'],
    [228, 125, '0.7s'],
    [268, 85,  '0.9s'],
  ]
  return (
    <svg viewBox="0 0 380 245" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%">
      <Grid id="g-web" />
      <rect width="380" height="245" fill="url(#g-web)" />

      {/* Browser outer */}
      <rect x="14" y="14" width="352" height="215" rx="5" fill={DIM} stroke={MED} strokeWidth="1.5" />
      {/* Chrome bar */}
      <rect x="14" y="14" width="352" height="32" rx="5" fill="rgba(251,246,236,0.07)" stroke={MED} strokeWidth="1.5" />
      {/* 3 window dots */}
      {[34, 50, 66].map((cx, i) => (
        <circle key={i} cx={cx} cy={30} r="5"
          fill={i === 0 ? '#e06c75' : i === 1 ? '#e5c07b' : '#98c379'}
          opacity=".7"
        />
      ))}
      {/* URL bar */}
      <rect x="82" y="21" width="210" height="18" rx="3" fill="rgba(251,246,236,0.06)" stroke="rgba(251,246,236,0.15)" strokeWidth="1" />
      <text x="187" y="34" textAnchor="middle" fill="rgba(251,246,236,0.4)" fontSize="9" fontFamily="DM Mono,monospace">myapp.getforged.app</text>

      {/* Left sidebar */}
      <rect x="14" y="46" width="82" height="183" fill="rgba(251,246,236,0.04)" />
      <line x1="96" y1="46" x2="96" y2="229" stroke={MED} strokeWidth=".5" />
      {[65, 88, 111, 134, 157].map((y, i) => (
        <g key={i}>
          <rect x="24" y={y} width="28" height="7" rx="2" fill={i === 0 ? A : 'rgba(251,246,236,0.12)'} />
          <rect x="58" y={y} width="22" height="7" rx="2" fill="rgba(251,246,236,0.08)" />
        </g>
      ))}

      {/* Chart title */}
      <text x="108" y="65" fill={HLF} fontSize="11" fontFamily="DM Mono,monospace">Revenue</text>

      {/* Horizontal grid lines */}
      {[90, 120, 150, 180, BASE].map(y => (
        <line key={y} x1="104" y1={y} x2="360" y2={y} stroke="rgba(251,246,236,0.07)" strokeWidth="1" />
      ))}

      {/* Bars — SMIL animates height and y for grow-from-bottom */}
      {bars.map(([x, h, delay], i) => (
        <rect key={i} x={x} y={BASE} width="28" height="0" fill={i === 3 ? A : HLF} rx="2">
          <animate attributeName="height"
            values={`0;${h};${h};0`}
            keyTimes="0;0.35;0.85;1"
            dur="5s" begin={delay} repeatCount="indefinite"
            calcMode="spline" keySplines=".4 0 .2 1;0 0 0 0;.4 0 .2 1"
          />
          <animate attributeName="y"
            values={`${BASE};${BASE - h};${BASE - h};${BASE}`}
            keyTimes="0;0.35;0.85;1"
            dur="5s" begin={delay} repeatCount="indefinite"
            calcMode="spline" keySplines=".4 0 .2 1;0 0 0 0;.4 0 .2 1"
          />
        </rect>
      ))}

      <Label text="live dashboard" />
    </svg>
  )
}

// ─── 3. CRM & Sales ──────────────────────────────────────────────────────────
// Kanban pipeline — a card slides from LEADS → QUALIFIED with a pulsing win counter

function CRMSales() {
  const cols = ['LEADS', 'QUALIFIED', 'CLOSED']
  const colX = [22, 147, 272]

  return (
    <svg viewBox="0 0 380 245" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%">
      <Grid id="g-crm" />
      <rect width="380" height="245" fill="url(#g-crm)" />

      {/* Column headers */}
      {cols.map((label, i) => (
        <g key={label}>
          <rect x={colX[i]} y="18" width="108" height="26" rx="3"
            fill={i === 2 ? AMB : DIM} stroke={i === 2 ? A : MED} strokeWidth="1.5" />
          <text x={colX[i] + 54} y="35" textAnchor="middle"
            fill={i === 2 ? A : C} fontSize="10" fontFamily="DM Mono,monospace" fontWeight="600">
            {label}
          </text>
        </g>
      ))}

      {/* Static cards — col 1 (LEADS) top card */}
      <rect x="22" y="56" width="108" height="48" rx="3" fill={DIM} stroke={MED} strokeWidth="1.5" />
      <text x="76" y="76" textAnchor="middle" fill={C} fontSize="10" fontFamily="DM Mono,monospace">Deal A</text>
      <text x="76" y="93" textAnchor="middle" fill={HLF} fontSize="9" fontFamily="DM Mono,monospace">£4,200</text>

      {/* Static cards — col 2 (QUALIFIED) */}
      <rect x="147" y="56" width="108" height="48" rx="3" fill={DIM} stroke={MED} strokeWidth="1.5" />
      <text x="201" y="76" textAnchor="middle" fill={C} fontSize="10" fontFamily="DM Mono,monospace">Deal B</text>
      <text x="201" y="93" textAnchor="middle" fill={HLF} fontSize="9" fontFamily="DM Mono,monospace">£9,800</text>

      <rect x="147" y="116" width="108" height="48" rx="3" fill={DIM} stroke={MED} strokeWidth="1.5" />
      <text x="201" y="136" textAnchor="middle" fill={C} fontSize="10" fontFamily="DM Mono,monospace">Deal D</text>
      <text x="201" y="153" textAnchor="middle" fill={HLF} fontSize="9" fontFamily="DM Mono,monospace">£2,600</text>

      {/* Static card — col 3 (CLOSED) */}
      <rect x="272" y="56" width="108" height="48" rx="3" fill={AMB} stroke={A} strokeWidth="1.5" />
      <text x="326" y="76" textAnchor="middle" fill={A} fontSize="10" fontFamily="DM Mono,monospace" fontWeight="600">Deal E</text>
      <text x="326" y="93" textAnchor="middle" fill={A} fontSize="11" fontFamily="DM Mono,monospace" fontWeight="600">£12,400</text>

      {/* Animated card sliding LEADS → QUALIFIED */}
      <g style={{ animation: 'gf-slideR 5s ease-in-out infinite' }}>
        <rect x="22" y="116" width="108" height="48" rx="3" fill={DIM} stroke={A} strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="76" y="136" textAnchor="middle" fill={C} fontSize="10" fontFamily="DM Mono,monospace">Deal C</text>
        <text x="76" y="153" textAnchor="middle" fill={HLF} fontSize="9" fontFamily="DM Mono,monospace">£6,750</text>
      </g>

      {/* Pulsing win total */}
      <g style={{ animation: 'gf-pulse 2.5s ease-in-out infinite' }}>
        <text x="326" y="140" textAnchor="middle" fill={A} fontSize="22" fontFamily="Bebas Neue,sans-serif">£24.8k</text>
        <text x="326" y="158" textAnchor="middle" fill={A} fontSize="9" fontFamily="DM Mono,monospace">won this month</text>
      </g>

      {/* Divider lines */}
      <line x1="138" y1="18" x2="138" y2="220" stroke={MED} strokeWidth=".5" strokeDasharray="4 4" />
      <line x1="263" y1="18" x2="263" y2="220" stroke={MED} strokeWidth=".5" strokeDasharray="4 4" />

      <Label text="sales pipeline" />
    </svg>
  )
}

// ─── 4. Marketing & Growth ────────────────────────────────────────────────────
// Line chart draws itself, then a +41% badge rises in

function Marketing() {
  // Chart path — hand-crafted cubic bezier from (30,185) to (340,42)
  const chartPath = 'M 30 185 C 80 170, 100 155, 140 135 C 180 115, 210 95, 255 72 C 285 55, 310 48, 340 42'
  // Approx total length ~360

  return (
    <svg viewBox="0 0 380 245" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%">
      <Grid id="g-mkt" />
      <rect width="380" height="245" fill="url(#g-mkt)" />

      {/* Axes */}
      <line x1="30" y1="20" x2="30" y2="195" stroke={MED} strokeWidth="1.5" />
      <line x1="25" y1="195" x2="360" y2="195" stroke={MED} strokeWidth="1.5" />

      {/* Horizontal guide lines */}
      {[60, 100, 140, 170].map(y => (
        <line key={y} x1="30" y1={y} x2="360" y2={y} stroke="rgba(251,246,236,0.07)" strokeWidth="1" />
      ))}

      {/* Axis tick labels */}
      {['Jan','Mar','May','Jul','Sep'].map((m, i) => (
        <text key={m} x={30 + i * 82} y="210" fill={HLF} fontSize="9" fontFamily="DM Mono,monospace">{m}</text>
      ))}

      {/* Gradient fill under chart */}
      <defs>
        <linearGradient id="mkt-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={A} stopOpacity=".25" />
          <stop offset="100%" stopColor={A} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={chartPath + ' L 340 195 L 30 195 Z'}
        fill="url(#mkt-fill)"
        style={{ animation: 'gf-fadeIn 2.5s 1.5s both', animationIterationCount: 'infinite', animationDuration: '6s', animationDelay: '1s' }}
      />

      {/* The chart line drawing itself */}
      <path
        d={chartPath}
        stroke={A}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="380"
        strokeDashoffset="380"
        fill="none"
      >
        <animate
          attributeName="stroke-dashoffset"
          values="380;0;0;380"
          keyTimes="0;0.45;0.85;1"
          dur="5s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines=".4 0 .2 1;0 0 0 0;.4 0 .2 1"
        />
      </path>

      {/* Dots on key inflection points */}
      {[[30,185],[140,135],[255,72],[340,42]].map(([cx,cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="5" fill={A} stroke="var(--ink, #2a2217)" strokeWidth="2">
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.5;0.85;1" dur="5s" begin={`${0.4 + i*0.15}s`} repeatCount="indefinite"/>
        </circle>
      ))}

      {/* +41% badge */}
      <g style={{ animation: 'gf-rise 1s 2.2s both' }}>
        <rect x="290" y="22" width="68" height="32" rx="4" fill={AMB} stroke={A} strokeWidth="1.5">
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.45;0.85;1" dur="5s" repeatCount="indefinite"/>
        </rect>
        <text x="324" y="34" textAnchor="middle" fill={A} fontSize="13" fontFamily="Bebas Neue,sans-serif">
          +41%
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.45;0.85;1" dur="5s" repeatCount="indefinite"/>
        </text>
        <text x="324" y="46" textAnchor="middle" fill={A} fontSize="8" fontFamily="DM Mono,monospace">
          growth
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.45;0.85;1" dur="5s" repeatCount="indefinite"/>
        </text>
      </g>

      <Label text="revenue growth chart" />
    </svg>
  )
}

// ─── 5. E-Commerce ───────────────────────────────────────────────────────────
// 3 product cards, items fly to cart, badge counter increments

function Ecommerce() {
  // Product cards at x=18, 138, 258 — width 100, height 125
  const cards = [
    { x: 18,  emoji: '👕', label: 'Apparel',  price: '£24' },
    { x: 138, emoji: '📦', label: 'Packaging', price: '£12' },
    { x: 258, emoji: '💻', label: 'Tech',      price: '£89' },
  ]

  return (
    <svg viewBox="0 0 380 245" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%">
      <Grid id="g-eco" />
      <rect width="380" height="245" fill="url(#g-eco)" />

      {/* Cart */}
      <g>
        <rect x="285" y="155" width="80" height="65" rx="4" fill={AMB} stroke={A} strokeWidth="2" />
        <text x="325" y="182" textAnchor="middle" fill={A} fontSize="22">🛒</text>
        {/* Animated badge counter */}
        <circle cx="358" cy="153" r="12" fill={A}>
          <animate attributeName="r" values="12;14;12" dur="2s" repeatCount="indefinite"/>
        </circle>
        <text x="358" y="158" textAnchor="middle" fill={C} fontSize="12" fontFamily="Bebas Neue,sans-serif">
          3
          <animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.6;0.7;1" dur="4s" repeatCount="indefinite"/>
        </text>
        <text x="325" y="207" textAnchor="middle" fill={A} fontSize="10" fontFamily="DM Mono,monospace">£125.00</text>
      </g>

      {/* Product cards */}
      {cards.map((c, i) => (
        <g key={i}>
          <rect x={c.x} y="20" width="105" height="125" rx="4" fill={DIM} stroke={MED} strokeWidth="1.5" />
          {/* Thumbnail area */}
          <rect x={c.x + 8} y="28" width="89" height="66" rx="3" fill="rgba(251,246,236,0.06)" />
          <text x={c.x + 52} y="68" textAnchor="middle" fontSize="28">{c.emoji}</text>
          {/* Label + price */}
          <text x={c.x + 52} y="112" textAnchor="middle" fill={C} fontSize="11" fontFamily="DM Mono,monospace">{c.label}</text>
          <text x={c.x + 52} y="130" textAnchor="middle" fill={A} fontSize="13" fontFamily="Bebas Neue,sans-serif">{c.price}</text>

          {/* Animated + badge flying to cart */}
          <g style={{ animation: `gf-flyUp 1.4s ${i * 1.3}s ease-in infinite` }}>
            <circle cx={c.x + 52} cy="148" r="10" fill={A} opacity="0" />
            <text x={c.x + 52} y="153" textAnchor="middle" fill={C} fontSize="12" fontFamily="DM Mono,monospace" opacity="0">+1</text>
          </g>
        </g>
      ))}

      {/* "Add to cart" button on first card — pulsing */}
      <rect x="18" y="155" width="105" height="26" rx="3" fill={A} style={{ animation: 'gf-pulse 2s ease-in-out infinite' }} />
      <text x="70" y="172" textAnchor="middle" fill={C} fontSize="10" fontFamily="DM Mono,monospace">Add to cart</text>

      <Label text="e-commerce storefront" />
    </svg>
  )
}

// ─── 6. Operations & Workflows ────────────────────────────────────────────────
// Checklist with checkmarks drawing in staggered, progress bar fills

function Operations() {
  const tasks = [
    'Route inbound enquiries',
    'Generate weekly report',
    'Send invoice reminders',
    'Review new submissions',
  ]
  // Checkmark path within 20×20 box: M4 10 L8 15 L16 5 — approx length 20
  const CHECK = 'M 4 10 L 8 15 L 16 5'

  return (
    <svg viewBox="0 0 380 245" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%">
      <Grid id="g-ops" />
      <rect width="380" height="245" fill="url(#g-ops)" />

      {/* Title */}
      <text x="20" y="38" fill={C} fontSize="14" fontFamily="DM Mono,monospace" fontWeight="600" opacity=".8">Automation tasks</text>

      {/* Task rows */}
      {tasks.map((task, i) => {
        const y = 58 + i * 42
        const delay = `${i * 0.9}s`
        const checkDelay = `${0.4 + i * 0.9}s`
        // First 3 always checked, last one animates
        const isDone = i < 3

        return (
          <g key={i} style={{ animation: `gf-rise .5s ${delay} both`, animationIterationCount: '1' }}>
            {/* Row background */}
            <rect x="18" y={y - 2} width="340" height="32" rx="3"
              fill={isDone ? 'rgba(185,115,20,0.12)' : DIM}
              stroke={isDone ? 'rgba(185,115,20,0.4)' : MED}
              strokeWidth="1"
            />

            {/* Checkbox */}
            <rect x="28" y={y + 6} width="20" height="20" rx="3"
              fill={isDone ? AMB : DIM}
              stroke={isDone ? A : MED}
              strokeWidth="1.5"
            />

            {/* Checkmark — draws in with stroke-dashoffset */}
            {isDone && (
              <path
                d={CHECK}
                transform={`translate(28, ${y + 6})`}
                stroke={A} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                fill="none"
                strokeDasharray="24"
                strokeDashoffset="24"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="24" to="0"
                  dur="0.5s" begin={checkDelay}
                  fill="freeze"
                />
              </path>
            )}

            {/* Animated check for last item — loops */}
            {!isDone && (
              <path
                d={CHECK}
                transform={`translate(28, ${y + 6})`}
                stroke={A} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                fill="none"
                strokeDasharray="24"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  values="24;0;0;24"
                  keyTimes="0;0.3;0.8;1"
                  dur="4s"
                  repeatCount="indefinite"
                />
              </path>
            )}

            {/* Task label */}
            <text
              x="60" y={y + 20}
              fill={isDone ? HLF : C}
              fontSize="12"
              fontFamily="DM Mono,monospace"
              textDecoration={isDone ? 'line-through' : 'none'}
            >
              {task}
            </text>

            {/* Timestamp badge for completed tasks */}
            {isDone && (
              <text x="345" y={y + 20} textAnchor="end" fill="rgba(185,115,20,0.6)" fontSize="10" fontFamily="DM Mono,monospace">
                ✓
              </text>
            )}
          </g>
        )
      })}

      {/* Progress bar */}
      <rect x="18" y="225" width="340" height="6" rx="3" fill={DIM} />
      <rect x="18" y="225" width="0" height="6" rx="3" fill={A}>
        <animate attributeName="width" values="0;255;255;0" keyTimes="0;0.7;0.85;1" dur="4.5s" repeatCount="indefinite"
          calcMode="spline" keySplines=".4 0 .2 1;0 0 0 0;.4 0 .2 1"
        />
      </rect>
      <text x="20" y="222" fill="rgba(185,115,20,0.6)" fontSize="9" fontFamily="DM Mono,monospace">75% complete</text>
    </svg>
  )
}

// ─── Map slugs → components ──────────────────────────────────────────────────

const ILLUSTRATIONS: Record<string, React.FC> = {
  'ai-automation': AIAutomation,
  'web-apps':      WebApps,
  'crm-sales':     CRMSales,
  'marketing':     Marketing,
  'ecommerce':     Ecommerce,
  'operations':    Operations,
}

// ─── Export ──────────────────────────────────────────────────────────────────

export default function CategoryHeroIllustration({ slug }: { slug: string }) {
  const Illustration = ILLUSTRATIONS[slug]
  if (!Illustration) return null

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 420,
        flexShrink: 0,
        opacity: 0.92,
        filter: 'drop-shadow(0 0 40px rgba(185,115,20,0.15))',
      }}
    >
      <style>{KEYFRAMES}</style>
      <Illustration />
    </div>
  )
}
