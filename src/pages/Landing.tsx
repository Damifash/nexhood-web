import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  QrCode,
  Siren,
  Users2,
  BarChart3,
  HeartHandshake,
  Menu,
  X,
  ArrowRight,
  MapPin,
  Bell,
  Trophy,
  Zap,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Logo, ShieldMark } from '@/components/Logo'
import { submitContact } from '@/lib/api'
import { Spinner } from '@/components/ui/Spinner'
const FEATURES = [
  {
    icon: QrCode,
    title: 'Visitor passes, done right',
    body: 'Generate expiring QR passes in seconds, notify visitors by SMS, and let guards validate at the gate with a single scan.',
  },
  {
    icon: Siren,
    title: 'Incidents, tracked end to end',
    body: 'Report with photos and GPS, track status from open to resolved, and keep a full audit trail your estate can trust.',
  },
  {
    icon: Bell,
    title: 'Real-time emergency alerts',
    body: 'One tap sends a priority alert to guards and admins instantly, with optional escalation straight to the police.',
  },
  {
    icon: Users2,
    title: 'A community, not just a system',
    body: 'Event forums, appreciation posts, and a welfare fund tracker that lets neighbors support the guards who protect them.',
  },
  {
    icon: Trophy,
    title: 'Gamified, on purpose',
    body: 'Badges like "Vigilant Neighbor" and "Hero Resolver" turn everyday participation into something worth showing up for.',
  },
  {
    icon: BarChart3,
    title: 'Analytics admins can act on',
    body: 'Incident trends, visitor volume, and engagement visualized so estate managers can spot patterns before they become problems.',
  },
]
const PERSONAS = [
  { name: 'Resident', desc: 'Report, request passes for guests, and get instant alerts on anything nearby.' },
  { name: 'Guard', desc: 'Validate visitor passes, acknowledge alerts, and get recognized for the job you do.' },
  { name: 'Admin', desc: 'Oversee incidents, manage residents, and track your estate’s security in one dashboard.' },
  { name: 'Police', desc: 'Receive escalated alerts with full context location, severity, and reporter.' },
]
export default function Landing() {
  const [navOpen, setNavOpen] = useState(false)
  return (
    <div className="bg-warm text-midnight-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur bg-warm/85 border-b border-midnight-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="lg" />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-midnight-600">
            <a href="#features" className="hover:text-royal transition">Features</a>
            <a href="#how" className="hover:text-royal transition">How it works</a>
            <a href="#community" className="hover:text-royal transition">Community</a>
            <a href="#contact" className="hover:text-royal transition">Contact</a>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="btn-ghost">Log in</Link>
            <Link to="/register" className="btn-primary">Get started</Link>
          </div>
          <button className="md:hidden text-midnight-700" onClick={() => setNavOpen((o) => !o)}>
            {navOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {navOpen && (
          <div className="md:hidden border-t border-midnight-100 px-6 py-4 flex flex-col gap-4 text-sm font-medium">
            <a href="#features" onClick={() => setNavOpen(false)}>Features</a>
            <a href="#how" onClick={() => setNavOpen(false)}>How it works</a>
            <a href="#community" onClick={() => setNavOpen(false)}>Community</a>
            <a href="#contact" onClick={() => setNavOpen(false)}>Contact</a>
            <div className="flex gap-3 pt-2">
              <Link to="/login" className="btn-outline flex-1">Log in</Link>
              <Link to="/register" className="btn-primary flex-1">Get started</Link>
            </div>
          </div>
        )}
      </header>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{ background: 'linear-gradient(180deg, #FFF8F8 0%, #FFF8F8 60%, #eef0f9 100%)' }}
        />
        <div className="absolute -top-24 right-0 w-[36rem] h-[36rem] rounded-full bg-royal-100/50 blur-3xl -z-10" />
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="badge bg-alert-50 text-alert-600 mb-6">
              <MapPin className="h-3 w-3" /> Built for Abuja estates, ready for Africa
            </span>
            <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.05] text-midnight-900">
              Security is stronger<br /> when it is <span className="text-alert">shared.</span>
            </h1>
            <p className="mt-6 text-lg text-midnight-500 max-w-lg leading-relaxed">
              Nexhood turns neighbors, guards, and police into one connected support
              system trading fear-driven, isolated security for a community you can actually rely on.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/register" className="btn-primary text-base px-7 py-3">
                Secure your estate <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className="btn-outline text-base px-7 py-3">
                Log in
              </Link>
            </div>
            <div className="mt-12 flex items-center gap-8 text-sm text-midnight-400">
              <div><span className="font-display text-2xl font-semibold text-midnight-900">10,000+</span><br />residents targeted, Yr 1</div>
              <div className="w-px h-10 bg-midnight-100" />
              <div><span className="font-display text-2xl font-semibold text-midnight-900">30%</span><br />faster incident response</div>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-[2rem] overflow-hidden shadow-2xl relative aspect-[4/5] lg:aspect-[3/4]">
              <img
                src="/brand/guard-portrait.jpg"
                alt="A Nexhood-uniformed estate guard on duty at a residential gate"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-midnight-950/85 via-midnight-950/10 to-transparent" />
              <div className="absolute top-6 left-6">
                <ShieldMark className="h-10 w-10 drop-shadow" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2.5">
                {[
                  { icon: QrCode, label: 'Visitor pass validated', sub: 'Gate 2 · 08:42 AM', tone: 'text-emerald-400' },
                  { icon: Bell, label: 'Emergency alert acknowledged', sub: '3 responders · 12s', tone: 'text-alert-400' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3">
                    <row.icon className={`h-5 w-5 shrink-0 ${row.tone}`} />
                    <div className="min-w-0">
                      <p className="text-sm text-warm font-medium truncate">{row.label}</p>
                      <p className="text-xs text-steel-300 truncate">{row.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Brand belief */}
      <section className="bg-midnight-900 text-warm py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <ShieldMark className="h-10 w-10 mx-auto mb-6" />
          <p className="font-display text-2xl sm:text-3xl leading-snug font-medium">
            "Nexhood exists to transform neighborhood security from a fear-driven, isolated system
            into a collaborative community experience built on trust, participation, and mutual support."
          </p>
          <p className="mt-6 text-steel-400 text-sm uppercase tracking-widest">Security as social infrastructure not surveillance</p>
        </div>
      </section>
      {/* Real estates, real signage */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="rounded-[2rem] overflow-hidden shadow-xl order-2 lg:order-1">
            <img
              src="/brand/estate-signage.jpg"
              alt="Nexhood signage and estate map at a residential entrance"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="order-1 lg:order-2">
            <span className="text-alert font-semibold text-sm tracking-wide">On the ground, not just in the app</span>
            <h2 className="font-display text-3xl font-semibold mt-2 text-midnight-900">
              Built inside real Abuja estates not a lab.
            </h2>
            <p className="text-midnight-500 mt-4 leading-relaxed">
              Nexhood is designed with the estates that pilot it: signage residents actually see at the gate,
              guards who already know the drill, and workflows shaped by how Nigerian neighborhoods really
              run not a generic template dropped in from somewhere else.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-midnight-600">
              <li className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-royal mt-2 shrink-0" />
                Piloted in 5 Abuja estates before wider rollout
              </li>
              <li className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-royal mt-2 shrink-0" />
                Works with the guards and gates you already have
              </li>
              <li className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-royal mt-2 shrink-0" />
                Nexhood AI Guard coming soon, QR access, AI cameras, Voice assitance, and automatic gate control
              </li>
            </ul>
          </div>
        </div>
      </section>
      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="max-w-xl mb-14">
          <span className="text-alert font-semibold text-sm tracking-wide">What's inside</span>
          <h2 className="font-display text-3xl font-semibold mt-2 text-midnight-900">
            Everything an estate needs to feel safer, together.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="h-11 w-11 rounded-xl bg-royal-50 text-royal-600 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display font-semibold text-lg text-midnight-900">{f.title}</h3>
              <p className="text-sm text-midnight-500 mt-2 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
      {/* How it works / personas */}
      <section id="how" className="bg-midnight-50/60 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-xl mb-14">
            <span className="text-alert font-semibold text-sm tracking-wide">Built for everyone in the loop</span>
            <h2 className="font-display text-3xl font-semibold mt-2 text-midnight-900">
              One app, four roles, zero silos.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PERSONAS.map((p, i) => (
              <div key={p.name} className="card p-6">
                <span className="text-xs font-semibold text-royal-400">0{i + 1}</span>
                <h3 className="font-display font-semibold text-lg text-midnight-900 mt-2">{p.name}</h3>
                <p className="text-sm text-midnight-500 mt-2 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Rapid response, used sparingly and heavily toned down */}
      <section className="relative overflow-hidden">
        <img
          src="/brand/response-team.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-midnight-950/80" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 flex flex-col items-start">
          <div className="h-11 w-11 rounded-xl bg-alert/15 text-alert-400 flex items-center justify-center mb-5">
            <Zap className="h-5 w-5" />
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-warm max-w-lg">
            When something's wrong, escalation shouldn't take five phone calls.
          </h2>
          <p className="text-steel-300 mt-4 max-w-lg leading-relaxed">
            Critical alerts reach every guard and admin on shift at once, with a direct line to police
            escalation built in so response stays fast without anyone feeling like they're under watch.
          </p>
        </div>
      </section>
      {/* Community / welfare */}
      <section id="community" className="max-w-6xl mx-auto px-6 py-24">
        <div className="card overflow-hidden grid lg:grid-cols-2">
          <div className="p-10 sm:p-14 flex flex-col justify-center">
            <div className="h-11 w-11 rounded-xl bg-alert-50 text-alert-600 flex items-center justify-center mb-5">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-midnight-900">
              Support the people who keep you safe.
            </h2>
            <p className="text-midnight-500 mt-4 leading-relaxed">
              Underpaid guards and overstretched police are the backbone of estate security. Nexhood's
              welfare fund lets residents contribute directly with every donation building trust, one
              estate at a time.
            </p>
            <Link to="/register" className="btn-primary mt-8 w-fit">
              Join the movement <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="bg-royal p-10 sm:p-14 flex flex-col justify-center text-warm">
            <ShieldCheck className="h-10 w-10 mb-5" />
            <p className="font-display text-xl font-semibold">Our promise</p>
            <p className="text-royal-100/90 mt-3 text-sm leading-relaxed">
              Protection without fear, access without chaos, and unity without rigidity for every home
              in the neighborhood.
            </p>
          </div>
        </div>
      </section>
      {/* Contact */}
      <section id="contact" className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <span className="text-alert font-semibold text-sm tracking-wide">Get in touch</span>
            <h2 className="font-display text-3xl font-semibold mt-2 text-midnight-900">
              Questions, feedback, or want to pilot Nexhood at your estate?
            </h2>
            <p className="text-midnight-500 mt-4 leading-relaxed max-w-md">
              Whether you're an estate chairman exploring Nexhood for your community, or a resident with feedback
              on the app, we read every message and respond directly.
            </p>
            <a href="mailto:fasoro@nexhoodapp.com" className="mt-6 inline-flex items-center gap-2 text-royal font-medium hover:underline">
              <Mail className="h-4 w-4" /> fasoro@nexhoodapp.com
            </a>
          </div>
          <ContactForm />
        </div>
      </section>
      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-[2rem] bg-midnight-900 text-warm px-8 sm:px-16 py-16 text-center relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-32 flex opacity-60">
            <div className="w-8 h-full bg-royal-600/40" />
            <div className="w-6 h-full bg-royal/70 mx-3" />
            <div className="w-8 h-full bg-midnight-700/40" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold relative z-10">
            Bring your estate onto Nexhood.
          </h2>
          <p className="text-steel-300 mt-4 max-w-md mx-auto relative z-10">
            Free to get started. The first resident to register becomes the estate admin.
          </p>
          <Link to="/register" className="btn-alert mt-8 text-base px-8 py-3 relative z-10 inline-flex">
            Create your estate <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
      {/* Footer */}
      <footer className="border-t border-midnight-100 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Logo size="md" />
          <p className="text-xs text-midnight-300">© {new Date().getFullYear()} Nexhood. Protecting homes, connecting neighbors, building safer communities together.</p>
        </div>
      </footer>
    </div>
  )
}

function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await submitContact(form)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="card p-8 flex flex-col items-center text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3" />
        <p className="font-display font-semibold text-midnight-900">Message sent.</p>
        <p className="text-sm text-midnight-500 mt-1">We'll get back to you at {form.email} soon.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      <div>
        <label className="label">Name</label>
        <input required minLength={2} className="input" placeholder="Your name" value={form.name} onChange={(e) => update('name', e.target.value)} />
      </div>
      <div>
        <label className="label">Email</label>
        <input type="email" required className="input" placeholder="you@example.com" value={form.email} onChange={(e) => update('email', e.target.value)} />
      </div>
      <div>
        <label className="label">Message</label>
        <textarea required minLength={10} rows={4} className="input" placeholder="Tell us what's on your mind, a question, feedback, or interest in piloting Nexhood at your estate." value={form.message} onChange={(e) => update('message', e.target.value)} />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? <Spinner className="h-4 w-4" /> : <>Send message <Send className="h-4 w-4" /></>}
      </button>
    </form>
  )
}
