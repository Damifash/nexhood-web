// Android/Chrome offer a one-tap "Install app" prompt, but only for a moment
// after the page loads. We catch it early (imported in main.tsx) so the
// "Add NexHood to your home screen" card can use it later.
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: BIPEvent | null = null
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BIPEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((l) => l())
  })
}

export const canPromptInstall = () => !!deferred
export function onInstallChange(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  const ev = deferred
  deferred = null
  await ev.prompt()
  const choice = await ev.userChoice.catch(() => ({ outcome: 'dismissed' as const }))
  return choice.outcome === 'accepted'
}
