import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { LEGAL_UPDATED } from '@/lib/legal'

/** Shared layout for the Terms and Privacy pages: readable on a phone,
 *  with a contents list so people can jump to what they care about. */
export function LegalPage({ title, intro, sections }: { title: string; intro: ReactNode; sections: { id: string; title: string; body: ReactNode }[] }) {
  useEffect(() => {
    document.title = `${title} · NexHood`
    window.scrollTo(0, 0)
  }, [title])

  return (
    <div className="min-h-screen bg-warm">
      <header className="bg-midnight-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" aria-label="NexHood home">
            <Logo variant="white" size="md" />
          </Link>
          <nav className="flex gap-4 text-sm text-steel-200">
            <Link to="/terms" className="hover:text-warm">Terms</Link>
            <Link to="/privacy" className="hover:text-warm">Privacy</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-midnight-900">{title}</h1>
        <p className="text-sm text-midnight-400 mt-2">Last updated {LEGAL_UPDATED}</p>
        <div className="mt-6 text-midnight-700 leading-relaxed space-y-3">{intro}</div>

        <nav aria-label="Contents" className="mt-8 rounded-2xl border border-midnight-100 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-midnight-400 mb-3">Contents</p>
          <ol className="grid gap-1.5 sm:grid-cols-2 text-sm list-decimal list-inside">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-royal hover:underline">{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-6">
              <h2 className="font-display text-xl font-semibold text-midnight-900">
                {i + 1}. {s.title}
              </h2>
              <div className="mt-3 text-midnight-700 leading-relaxed space-y-3 legal-body">{s.body}</div>
            </section>
          ))}
        </div>
      </main>

      <footer className="border-t border-midnight-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 text-xs text-midnight-400 flex flex-wrap gap-x-6 gap-y-2">
          <span>© {new Date().getFullYear()} NexHood</span>
          <Link to="/terms" className="hover:text-midnight-700">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-midnight-700">Privacy Policy</Link>
          <Link to="/" className="hover:text-midnight-700">Home</Link>
        </div>
      </footer>
    </div>
  )
}
