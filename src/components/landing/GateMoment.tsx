import { useEffect, useState } from 'react'
import { CheckCircle2, Pause, Phone, Play, ScanLine } from 'lucide-react'
import { usePrefersReducedMotion } from './useReveal'

// A fake but plausible QR grid, generated once so it doesn't jitter.
const QR = (() => {
  const n = 13
  const cells: boolean[] = []
  let seed = 7
  for (let i = 0; i < n * n; i++) {
    seed = (seed * 9301 + 49297) % 233280
    cells.push(seed / 233280 > 0.52)
  }
  const finder = (r: number, c: number) =>
    (r < 4 && c < 4) || (r < 4 && c > n - 5) || (r > n - 5 && c < 4)
  return { n, on: (r: number, c: number) => (finder(r, c) ? (r % 3 === 0 || c % 3 === 0 || (r % 3 === 1 && c % 3 === 1)) : cells[r * n + c]) }
})()

function QrGlyph() {
  const s = 6
  return (
    <svg viewBox={`0 0 ${QR.n * s} ${QR.n * s}`} className="w-full h-full" aria-hidden="true">
      {Array.from({ length: QR.n }).flatMap((_, r) =>
        Array.from({ length: QR.n }).map((__, c) =>
          QR.on(r, c) ? <rect key={`${r}-${c}`} x={c * s} y={r * s} width={s} height={s} fill="#071456" /> : null,
        ),
      )}
    </svg>
  )
}

type Step = 0 | 1 | 2

export function GateMoment({ compact = false }: { compact?: boolean }) {
  const reduced = usePrefersReducedMotion()
  const [paused, setPaused] = useState(false)
  const [step, setStep] = useState<Step>(0)

  useEffect(() => {
    if (reduced) {
      setStep(2)
      return
    }
    if (paused) return
    const durations: Record<Step, number> = { 0: 900, 1: 1500, 2: 2600 }
    const t = setTimeout(() => setStep((s) => ((s + 1) % 3) as Step), durations[step])
    return () => clearTimeout(t)
  }, [step, paused, reduced])

  return (
    <div className={`grid gap-4 ${compact ? '' : 'md:grid-cols-2'} ${paused ? 'paused' : ''}`}>
      {/* The old way */}
      <figure className="rounded-2xl border border-midnight-100 bg-white p-5 sm:p-6">
        <figcaption className="text-xs font-semibold uppercase tracking-wide text-midnight-400">The old way</figcaption>
        <div className="mt-4 flex items-start gap-3">
          <span className="h-10 w-10 shrink-0 rounded-full bg-midnight-50 text-midnight-500 flex items-center justify-center">
            <Phone className="h-5 w-5 ring" />
          </span>
          <div className="space-y-2 text-sm">
            <p className="rounded-2xl rounded-tl-sm bg-midnight-50 px-3.5 py-2 text-midnight-700">
              Hello? Madam, someone is here for you…
            </p>
            <p className="rounded-2xl rounded-tl-sm bg-midnight-50 px-3.5 py-2 text-midnight-700">Who sent you? Wait, let me call again.</p>
            <p className="text-xs text-midnight-400">No answer · 3rd call · visitor still waiting</p>
          </div>
        </div>
      </figure>

      {/* With NexHood */}
      <figure className="rounded-2xl bg-midnight-900 p-5 sm:p-6 text-warm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <figcaption className="text-xs font-semibold uppercase tracking-wide text-steel-300">With NexHood</figcaption>
          {!reduced && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="rounded-full p-1.5 text-steel-300 hover:text-warm hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-steel-300"
              aria-label={paused ? 'Play animation' : 'Pause animation'}
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
          )}
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-28 w-28 shrink-0 rounded-xl bg-warm p-2.5">
            <QrGlyph />
            {step === 1 && <span className="scan-line absolute left-1 right-1 top-2 h-0.5 rounded bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,.7)]" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-steel-300 flex items-center gap-1.5">
              <ScanLine className="h-4 w-4" /> {step === 0 ? 'Visitor shows pass' : step === 1 ? 'Guard scanning…' : 'Scanned at Gate 1'}
            </p>
            <div className="mt-2 min-h-[64px]" aria-live="polite">
              {step === 2 && (
                <div className="slide-check rounded-xl bg-emerald-500/15 border border-emerald-400/30 px-3.5 py-2.5">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" /> Expected
                  </p>
                  <p className="text-sm text-warm mt-0.5">Chidi, visiting House 14 · 4:32pm</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </figure>
    </div>
  )
}
