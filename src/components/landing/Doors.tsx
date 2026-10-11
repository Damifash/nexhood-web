// The brand's "doors" motif: each tall narrow shape is a home. In the hero
// they light up one by one, like a street coming alive at night. One lit
// house becomes many, which is the whole brand story in one picture.

const DOORS = [
  { h: 70, w: 18 }, { h: 110, w: 22 }, { h: 86, w: 18 }, { h: 132, w: 26 },
  { h: 96, w: 20 }, { h: 148, w: 28 }, { h: 104, w: 20 }, { h: 124, w: 24 },
  { h: 80, w: 18 }, { h: 140, w: 26 }, { h: 92, w: 20 }, { h: 118, w: 22 },
  { h: 74, w: 18 }, { h: 128, w: 24 }, { h: 100, w: 20 }, { h: 84, w: 18 },
]
// Order the lights come on in, so it reads as spreading, not left-to-right.
const ORDER = [5, 4, 6, 3, 7, 9, 2, 8, 11, 1, 10, 13, 0, 12, 14, 15]

export function DoorsSkyline({ className = '', animate = true }: { className?: string; animate?: boolean }) {
  // animate=false: a quiet, static version (some doors softly lit) for
  // places like the footer where motion would just be noise.
  const gap = 10
  let x = 0
  const placed = DOORS.map((d) => {
    const p = { ...d, x }
    x += d.w + gap
    return p
  })
  const width = x - gap
  const height = 150
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="doorHalo" cx="50%" cy="100%" r="80%">
          <stop offset="0%" stopColor="#FFF8F8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FFF8F8" stopOpacity="0" />
        </radialGradient>
      </defs>
      {placed.map((d, i) => {
        const delay = ORDER.indexOf(i) * 0.14 + 0.2
        const lit = animate
        const softlyLit = !animate && ORDER.indexOf(i) < 6
        return (
          <g key={i}>
            <path
              d={`M${d.x},${height} V${height - d.h + d.w / 2} A${d.w / 2},${d.w / 2} 0 0 1 ${d.x + d.w},${height - d.h + d.w / 2} V${height} Z`}
              className={`door ${lit ? 'door-lit' : ''}`}
              style={softlyLit ? { fill: '#A3B5CB', opacity: 0.35 } : { animationDelay: `${delay}s` }}
            />
            <rect
              className="door-halo"
              x={d.x - 14}
              y={height - d.h - 18}
              width={d.w + 28}
              height={d.h + 18}
              fill="url(#doorHalo)"
              style={{ animationDelay: `${delay}s` }}
            />
          </g>
        )
      })}
      <rect x="0" y={height - 2} width={width} height="2" fill="#2c3c9e" opacity="0.6" />
    </svg>
  )
}

/** Small static door-row illustration used as a section accent. */
export function DoorRow({ count = 5, lit = 1, className = '' }: { count?: number; lit?: number; className?: string }) {
  return (
    <div className={`flex items-end gap-1.5 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`block w-2.5 rounded-t-full ${i < lit ? 'bg-royal' : 'bg-midnight-100'}`}
          style={{ height: `${18 + ((i * 7) % 14)}px` }}
        />
      ))}
    </div>
  )
}
