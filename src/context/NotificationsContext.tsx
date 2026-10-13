import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '@/lib/api'

export type Section = 'alerts' | 'incidents' | 'community' | 'payments' | 'finances' | 'repairs' | 'visitor_passes' | 'welfare'
type Counts = { new: Partial<Record<Section, number>>; urgent: Partial<Record<Section, number>> }

// Which page clears which red dot.
export const SECTION_FOR_PATH: { prefix: string; section: Section }[] = [
  { prefix: '/app/alerts', section: 'alerts' },
  { prefix: '/app/incidents', section: 'incidents' },
  { prefix: '/app/community', section: 'community' },
  { prefix: '/app/payments', section: 'payments' },
  { prefix: '/app/finances', section: 'finances' },
  { prefix: '/app/repairs', section: 'repairs' },
  { prefix: '/app/visitor-passes', section: 'visitor_passes' },
  { prefix: '/app/welfare', section: 'welfare' },
]

const Ctx = createContext<{ counts: Counts; badgeFor: (s: Section) => { n: number; urgent: boolean } }>({
  counts: { new: {}, urgent: {} },
  badgeFor: () => ({ n: 0, urgent: false }),
})

const POLL_MS = 45_000

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<Counts>({ new: {}, urgent: {} })
  const location = useLocation()
  const baseTitle = useRef(document.title)

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/api/notifications/counts')
      setCounts(data as Counts)
    } catch {
      /* offline or old backend: no dots */
    }
  }, [])

  // Opening a page marks that section as seen, then refreshes the dots.
  useEffect(() => {
    const match = SECTION_FOR_PATH.find((m) => location.pathname.startsWith(m.prefix))
    if (match) {
      setCounts((c) => ({ ...c, new: { ...c.new, [match.section]: 0 } }))
      api.post('/api/notifications/seen', { section: match.section }).catch(() => {}).finally(refresh)
    } else {
      refresh()
    }
  }, [location.pathname, refresh])

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, POLL_MS)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(t)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  const badgeFor = useCallback(
    (s: Section) => {
      const urgent = counts.urgent[s] ?? 0
      const fresh = counts.new[s] ?? 0
      return urgent > 0 ? { n: urgent, urgent: true } : { n: fresh, urgent: false }
    },
    [counts],
  )

  // Show the total in the browser tab, e.g. "(3) NexHood".
  useEffect(() => {
    const total = SECTION_FOR_PATH.reduce((sum, m) => sum + badgeFor(m.section).n, 0)
    document.title = total > 0 ? `(${total}) ${baseTitle.current}` : baseTitle.current
  }, [badgeFor])

  return <Ctx.Provider value={{ counts, badgeFor }}>{children}</Ctx.Provider>
}

export function useNotifications() {
  return useContext(Ctx)
}
