import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  HeartHandshake,
  Mail,
  Menu,
  MessagesSquare,
  PhoneCall,
  QrCode,
  ScanLine,
  Send,
  Siren,
  X,
} from 'lucide-react'
import { Logo, ShieldMark } from '@/components/Logo'
import { submitContact, type WaitlistRole } from '@/lib/api'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/context/AuthContext'
import { DoorRow, DoorsSkyline } from '@/components/landing/Doors'
import { GateMoment } from '@/components/landing/GateMoment'
import { Waitlist } from '@/components/landing/Waitlist'
import { useReveal, usePrefersReducedMotion } from '@/components/landing/useReveal'

// ---------------------------------------------------------------------------
// Content you can edit without touching layout.
// PROOF: anything left as null is simply not rendered. Never put made-up
// numbers or quotes here — only real ones from live estates.
// ---------------------------------------------------------------------------
const PROOF: {
  estate: string
  city: string
  testimonial: { quote: string; name: string; role: string } | null
  stats: { label: string; value: string }[] | null
  photos: { src: string; alt: string }[]
} = {
  estate: 'Maraba Estate',
  city: 'Abuja',
  testimonial: null, // e.g. { quote: '…', name: 'Mrs. A.', role: 'Resident, Maraba Estate' }
  stats: null, // e.g. [{ label: 'Visitor passes issued', value: '1,240' }]
  photos: [
    { src: '/brand/guard-portrait.jpg', alt: 'An estate guard in a NexHood uniform on duty at the gate' },
    { src: '/brand/estate-signage.jpg', alt: 'NexHood signage and estate map at a residential entrance' },
  ],
}

// Fill in the real profile URLs (e.g. 'https://www.instagram.com/<handle>').
// Links with a null href are hidden.
const SOCIAL = ([
  { label: 'Instagram', href: null },
  { label: 'TikTok', href: null },
] as { label: string; href: string | null }[]).filter((s): s is { label: string; href: string } => !!s.href)

const HEADLINES = {
  a: 'Know who’s at your gate before they get there.',
  b: 'Your estate, looking out for each other.',
} as const

const TICKER = [
  { icon: QrCode, text: 'Gate 1 · 4:32pm · Visitor verified', tone: 'text-emerald-300' },
  { icon: ClipboardCheck, text: 'House 9 · Delivery pass created', tone: 'text-steel-200' },
  { icon: Bell, text: 'Alert acknowledged · 3 guards · 14s', tone: 'text-amber-300' },
  { icon: MessagesSquare, text: 'Estate meeting posted · Saturday 10am', tone: 'text-steel-200' },
]

const STEPS = [
  { title: 'Resident creates a pass', body: 'Add your visitor’s name and time. NexHood makes a QR pass you send on WhatsApp.', icon: QrCode },
  { title: 'Guard scans at the gate', body: 'One scan shows who they are, who they’re visiting and when they’re expected.', icon: ScanLine },
  { title: 'Everyone’s on record', body: 'Every entry is logged, so the estate knows who came in and when. No more guesswork.', icon: ClipboardCheck },
]

const FEATURES = [
  { icon: Siren, title: 'Panic button and alerts', body: 'One tap reaches every guard on shift and the estate admin, with police escalation built in.', tags: ['Resident', 'Guard', 'Police'], urgent: true },
  { icon: ClipboardCheck, title: 'Incident reports', body: 'Report what happened with up to four photos, then follow it from open to resolved.', tags: ['Resident', 'Admin'] },
  { icon: MessagesSquare, title: 'Estate forum and events', body: 'Meetings, notices and events in one place, emailed to everyone who needs them.', tags: ['Resident', 'Admin'] },
  { icon: HeartHandshake, title: 'Welfare fund', body: 'Residents support the guards who look after them, with every contribution on record.', tags: ['Resident', 'Guard'] },
  { icon: PhoneCall, title: 'Guard and emergency directory', body: 'The right number for the gate, the admin and emergencies, one tap away.', tags: ['Resident', 'Guard'] },
  { icon: BarChart3, title: 'Admin analytics', body: 'Visitor volume, incident trends and response times, so you can act early.', tags: ['Admin'] },
]

const ROLES: { key: string; label: string; screen: { title: string; rows: string[] }; points: string[] }[] = [
  {
    key: 'resident',
    label: 'Resident',
    screen: { title: 'Visitor pass', rows: ['Chidi · Today 4:00–6:00pm', 'Share on WhatsApp', 'Panic button'] },
    points: ['Create a visitor pass in seconds and send it on WhatsApp', 'Hit the panic button and every guard on shift knows', 'Report incidents with photos and follow them to resolution'],
  },
  {
    key: 'guard',
    label: 'Guard',
    screen: { title: 'Scan pass', rows: ['Expected · House 14', 'Alert: Block C', 'Contacts directory'] },
    points: ['Scan a QR pass instead of calling round the estate', 'See and acknowledge alerts the moment they come in', 'Get recognised for the work through the welfare fund'],
  },
  {
    key: 'admin',
    label: 'Estate admin',
    screen: { title: 'Estate overview', rows: ['Visitors today · 38', 'Open incidents · 2', 'Invite residents'] },
    points: ['Invite residents, guards and police with one link each', 'See every incident, alert and visitor in one dashboard', 'Spot patterns early with simple analytics'],
  },
  {
    key: 'police',
    label: 'Police',
    screen: { title: 'Escalated alert', rows: ['Severity · High', 'Location · Block C', 'Reporter details'] },
    points: ['Receive escalated alerts with location and severity', 'Get the full context before you arrive', 'Only the alerts that need you, not every gate log'],
  },
]

const FAQS = [
  { q: 'Does every resident need a smartphone?', a: 'No. Guards and admins need one to scan passes and handle alerts. Residents without a smartphone can still be on the estate’s list, and someone in the household can create passes for them.' },
  { q: 'What does it cost?', a: 'We’re onboarding estates from the waitlist and agreeing pricing with each one based on its size. Join the list and we’ll talk you through it. No payment is needed to join.' },
  { q: 'How do we move our estate onto NexHood?', a: 'The estate admin or exco sets the estate up, then invites residents, guards and police. We help with the setup and with training your guards at the gate.' },
  { q: 'Is our data safe?', a: 'Each estate only sees its own data, and access depends on your role. Joining an existing estate is invite-only, so strangers can’t add themselves to your estate.' },
  { q: 'Does it work with our existing guards?', a: 'Yes. NexHood is built around the guards and gates you already have. Guards just need a phone to scan passes and receive alerts.' },
]

// ---------------------------------------------------------------------------

function Reveal({ children, className = '', as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' }) {
  const ref = useReveal<HTMLDivElement>()
  return (
    <Tag ref={ref as never} className={`reveal ${className}`}>
      {children}
    </Tag>
  )
}

function SectionLabel({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <span className={`text-sm font-semibold tracking-wide ${dark ? 'text-steel-300' : 'text-royal'}`}>{children}</span>
}

export default function Landing() {
  const { user } = useAuth()
  const [navOpen, setNavOpen] = useState(false)
  const [presetRole, setPresetRole] = useState<WaitlistRole | null>(null)
  const [showBar, setShowBar] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()

  const headline = (() => {
    try {
      return new URLSearchParams(window.location.search).get('h') === 'b' ? HEADLINES.b : HEADLINES.a
    } catch {
      return HEADLINES.a
    }
  })()

  // Sticky mobile "Join waitlist" bar once the hero is out of view.
  useEffect(() => {
    const el = heroRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Arriving from a shared link (…/#waitlist) should land on the form.
  useEffect(() => {
    if (window.location.hash === '#waitlist') {
      setTimeout(() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'auto' }), 50)
    }
  }, [])

  function goToWaitlist(role: WaitlistRole | null = null) {
    setNavOpen(false)
    if (role) setPresetRole(role)
    document.getElementById('waitlist')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }

  const navLinks = [
    { href: '#how', label: 'How it works' },
    { href: '#features', label: 'Features' },
    { href: '#roles', label: 'For every role' },
    { href: '#faq', label: 'FAQ' },
  ]

  return (
    <div className="bg-warm text-midnight-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-midnight-900/95 backdrop-blur border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[4.5rem] flex items-center justify-between">
          <Link to="/" aria-label="NexHood home">
            <Logo variant="white" size="lg" />
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-steel-200" aria-label="Main">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-warm transition">{l.label}</a>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <Link to="/app" className="btn text-warm hover:bg-white/10">Open app</Link>
            ) : (
              <Link to="/login" className="btn text-warm hover:bg-white/10">Log in</Link>
            )}
            <button type="button" onClick={() => goToWaitlist()} className="btn-alert press">Join waitlist</button>
          </div>
          <button
            type="button"
            className="md:hidden text-warm p-2 -mr-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-steel-300"
            onClick={() => setNavOpen((o) => !o)}
            aria-expanded={navOpen}
            aria-controls="mobile-nav"
            aria-label={navOpen ? 'Close menu' : 'Open menu'}
          >
            {navOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {navOpen && (
          <div id="mobile-nav" className="md:hidden border-t border-white/10 px-4 py-4 flex flex-col gap-4 text-sm font-medium text-steel-100">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setNavOpen(false)}>{l.label}</a>
            ))}
            <div className="flex gap-3 pt-2">
              <Link to={user ? '/app' : '/login'} className="btn flex-1 border border-white/20 text-warm">{user ? 'Open app' : 'Log in'}</Link>
              <button type="button" onClick={() => goToWaitlist()} className="btn-alert flex-1">Join waitlist</button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section ref={heroRef} className="relative overflow-hidden bg-midnight-900 text-warm">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ background: 'radial-gradient(60rem 30rem at 70% 110%, rgba(0,19,158,.55), transparent 60%)' }} />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-6 grid lg:grid-cols-[1.15fr_.85fr] gap-10 lg:gap-14 items-center">
            <div>
              <span className="rise inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-semibold text-steel-100" style={{ animationDelay: '.1s' }}>
                <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400" /> Live at {PROOF.estate}, {PROOF.city}
              </span>
              <h1 className="rise mt-5 font-display text-[2.4rem] leading-[1.02] sm:text-6xl font-semibold tracking-tight" style={{ animationDelay: '.25s' }}>
                {headline}
              </h1>
              <p className="rise mt-5 text-base sm:text-lg text-steel-200 max-w-xl leading-relaxed" style={{ animationDelay: '.4s' }}>
                QR visitor passes, a panic button that reaches estate security and the police, and one place for residents, guards and admins. Live in Abuja today.
              </p>
              <div className="rise mt-8 flex flex-col sm:flex-row gap-3" style={{ animationDelay: '.55s' }}>
                <button type="button" onClick={() => goToWaitlist()} className="btn-alert press alert-once text-base px-7 py-3">
                  Join the waitlist <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => goToWaitlist('estate_admin')} className="btn press border border-white/25 text-warm hover:bg-white/10 text-base px-7 py-3">
                  I manage an estate
                </button>
              </div>
              <p className="rise mt-4 text-xs text-steel-300" style={{ animationDelay: '.7s' }}>
                Already on NexHood? <Link to="/login" className="underline hover:text-warm">Log in</Link>
              </p>
            </div>
            <HeroCard />
          </div>
          <DoorsSkyline className="relative block w-full h-28 sm:h-40 mt-4" />
        </section>

        {/* Problem + gate moment */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <Reveal className="max-w-2xl">
            <SectionLabel>The gate problem</SectionLabel>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold leading-tight">
              No more “who sent you?” at the gate.
            </h2>
            <p className="mt-4 text-midnight-500 leading-relaxed">
              Most Abuja estates still run on a guard calling around to check who’s expected, or getting tired and letting everyone through.
            </p>
          </Reveal>
          <Reveal className="mt-10">
            <GateMoment />
          </Reveal>
        </section>

        {/* How it works */}
        <section id="how" className="bg-midnight-50/70 py-16 sm:py-24 scroll-mt-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Reveal className="max-w-2xl">
              <SectionLabel>How it works</SectionLabel>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold">Three steps. No phone calls.</h2>
            </Reveal>
            <ol className="mt-10 grid md:grid-cols-3 gap-4 sm:gap-6">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <Reveal className="card p-6 h-full">
                    <div className="flex items-end justify-between">
                      <span className="h-11 w-11 rounded-xl bg-royal text-warm flex items-center justify-center">
                        <s.icon className="h-5 w-5" />
                      </span>
                      <DoorRow count={5} lit={i + 1} />
                    </div>
                    <p className="mt-5 text-xs font-semibold text-royal-400">Step {i + 1}</p>
                    <h3 className="mt-1 font-display text-xl font-semibold">{s.title}</h3>
                    <p className="mt-2 text-sm text-midnight-500 leading-relaxed">{s.body}</p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-midnight-900 text-warm py-16 sm:py-24 scroll-mt-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Reveal className="max-w-2xl">
              <SectionLabel dark>More than a gate</SectionLabel>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold">Everything your estate needs to look out for each other.</h2>
            </Reveal>
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((f) => (
                <Reveal key={f.title} className={`rounded-2xl p-6 border ${f.urgent ? 'bg-alert/10 border-alert/30' : 'bg-white/[0.04] border-white/10'}`}>
                  <span className={`h-11 w-11 rounded-xl flex items-center justify-center ${f.urgent ? 'bg-alert text-warm' : 'bg-white/10 text-steel-100'}`}>
                    <f.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-steel-200 leading-relaxed">{f.body}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {f.tags.map((t) => (
                      <span key={t} className="badge bg-white/10 text-steel-100 font-medium">{t}</span>
                    ))}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Roles */}
        <section id="roles" className="py-16 sm:py-24 scroll-mt-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Reveal className="max-w-2xl">
              <SectionLabel>Built for every role</SectionLabel>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold">One app. Everyone at the gate on the same page.</h2>
            </Reveal>
            <Reveal className="mt-10">
              <RoleTabs />
            </Reveal>
          </div>
        </section>

        {/* Proof */}
        <section className="bg-midnight-50/70 py-16 sm:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 items-center">
            <Reveal>
              <SectionLabel>Not a prototype</SectionLabel>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold">Live at {PROOF.estate}, {PROOF.city}.</h2>
              <p className="mt-4 text-midnight-500 leading-relaxed max-w-lg">
                Residents, guards and the estate admin use NexHood every day: passes at the gate, alerts, incident reports and the welfare fund.
              </p>
              {PROOF.testimonial && (
                <blockquote className="mt-8 border-l-4 border-royal pl-5">
                  <p className="font-display text-xl leading-snug">“{PROOF.testimonial.quote}”</p>
                  <footer className="mt-3 text-sm text-midnight-500">{PROOF.testimonial.name} · {PROOF.testimonial.role}</footer>
                </blockquote>
              )}
              {PROOF.stats && PROOF.stats.length > 0 && (
                <dl className="mt-8 grid grid-cols-2 gap-6">
                  {PROOF.stats.map((s) => (
                    <div key={s.label}>
                      <dt className="text-sm text-midnight-500">{s.label}</dt>
                      <dd className="font-display text-3xl font-semibold">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Reveal>
            {PROOF.photos.length > 0 && (
              <Reveal className="grid grid-cols-2 gap-3 sm:gap-4">
                {PROOF.photos.map((p, i) => (
                  <img
                    key={p.src}
                    src={p.src}
                    alt={p.alt}
                    loading="lazy"
                    decoding="async"
                    className={`w-full rounded-2xl object-cover aspect-[3/4] shadow-card ${i % 2 ? 'mt-8' : ''}`}
                  />
                ))}
              </Reveal>
            )}
          </div>
        </section>

        {/* Waitlist */}
        <section id="waitlist" className="relative py-16 sm:py-24 scroll-mt-20 overflow-hidden">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <ShieldMark className="h-10 w-10 mx-auto" />
            <h2 className="mt-4 font-display text-3xl sm:text-5xl font-semibold leading-tight">Bring NexHood to your estate.</h2>
            <p className="mt-4 text-midnight-500 max-w-xl mx-auto leading-relaxed">
              We’re opening NexHood estate by estate. Join the waitlist and tell us where you live. Estates with the most neighbours on the list go first.
            </p>
            <div className="mt-10">
              <Waitlist presetRole={presetRole} />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-midnight-50/70 py-16 sm:py-24 scroll-mt-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold">Questions estates ask us</h2>
            <div className="mt-8 divide-y divide-midnight-100 card">
              {FAQS.map((f) => (
                <details key={f.q} className="group px-5 sm:px-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-semibold text-midnight-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-400 rounded-lg [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="h-5 w-5 shrink-0 text-midnight-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="pb-5 -mt-1 text-sm text-midnight-500 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 scroll-mt-20">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <SectionLabel>Get in touch</SectionLabel>
              <h2 className="mt-2 font-display text-3xl font-semibold">Questions, feedback, or want to pilot NexHood at your estate?</h2>
              <p className="text-midnight-500 mt-4 leading-relaxed max-w-md">
                Whether you chair an estate or you’re a resident with feedback on the app, we read every message and reply directly.
              </p>
              <a href="mailto:fasoro@nexhoodapp.com" className="mt-6 inline-flex items-center gap-2 text-royal font-medium hover:underline">
                <Mail className="h-4 w-4" /> fasoro@nexhoodapp.com
              </a>
            </div>
            <ContactForm />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-midnight-900 text-steel-200 pb-24 md:pb-0">
        <DoorsSkyline className="block w-full h-16" animate={false} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-[1fr_auto] items-start">
          <div>
            <Logo variant="white" size="lg" />
            <p className="mt-3 font-display text-lg text-warm">Security is stronger when it is shared.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {SOCIAL.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-warm">{s.label}</a>
            ))}
            <a href="mailto:fasoro@nexhoodapp.com" className="hover:text-warm">fasoro@nexhoodapp.com</a>
            <Link to="/login" className="hover:text-warm">Log in</Link>
          </div>
        </div>
        <p className="max-w-6xl mx-auto px-4 sm:px-6 pb-8 text-xs text-steel-400">© {new Date().getFullYear()} Nexhood. Protecting homes, connecting neighbours.</p>
      </footer>

      {/* Sticky mobile CTA */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-40 p-3 bg-warm/95 backdrop-blur border-t border-midnight-100 transition-transform duration-300 ${showBar ? 'translate-y-0' : 'translate-y-full'}`}
        aria-hidden={!showBar}
      >
        <button type="button" tabIndex={showBar ? 0 : -1} onClick={() => goToWaitlist()} className="btn-alert press w-full py-3 text-base">
          Join the waitlist <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function HeroCard() {
  const reduced = usePrefersReducedMotion()
  const [i, setI] = useState(0)
  useEffect(() => {
    if (reduced) return
    const t = setInterval(() => setI((n) => (n + 1) % TICKER.length), 2600)
    return () => clearInterval(t)
  }, [reduced])
  const item = TICKER[i]
  return (
    <div className="rise relative mx-auto w-full max-w-sm" style={{ animationDelay: '.6s' }} aria-hidden="true">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur">
        <div className="rounded-3xl bg-warm text-midnight-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-midnight-400">Visitor pass</p>
            <span className="badge bg-emerald-50 text-emerald-700">Active</span>
          </div>
          <p className="mt-2 font-display text-2xl font-semibold">Chidi Okeke</p>
          <p className="text-sm text-midnight-500">Visiting House 14 · Today, 4–6pm</p>
          <div className="mt-4 grid grid-cols-[auto_1fr] gap-4 items-center">
            <div className="h-20 w-20 rounded-xl bg-midnight-900 p-2">
              <div className="h-full w-full rounded-md bg-[repeating-linear-gradient(90deg,#FFF8F8_0_4px,transparent_4px_8px),repeating-linear-gradient(0deg,#FFF8F8_0_4px,transparent_4px_8px)] opacity-90" />
            </div>
            <div className="text-xs text-midnight-500 leading-relaxed">
              Show this at the gate.<br />Code <span className="font-mono font-semibold text-midnight-900">K7QM</span>
            </div>
          </div>
        </div>
        <div key={i} className="ticker-in mt-3 flex items-center gap-2.5 rounded-2xl bg-midnight-900/70 border border-white/10 px-4 py-3">
          <item.icon className={`h-4 w-4 shrink-0 ${item.tone}`} />
          <p className="text-sm text-warm truncate">{item.text}</p>
          <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-400 shrink-0" />
        </div>
      </div>
    </div>
  )
}

function RoleTabs() {
  const [active, setActive] = useState(0)
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([])
  const role = ROLES[active]

  function onKey(e: KeyboardEvent, i: number) {
    let next = i
    if (e.key === 'ArrowRight') next = (i + 1) % ROLES.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + ROLES.length) % ROLES.length
    else return
    e.preventDefault()
    setActive(next)
    tabsRef.current[next]?.focus()
  }

  return (
    <div>
      <div role="tablist" aria-label="Roles" className="no-scrollbar -mx-4 px-4 flex gap-2 overflow-x-auto snap-x">
        {ROLES.map((r, i) => (
          <button
            key={r.key}
            ref={(el) => {
              tabsRef.current[i] = el
            }}
            role="tab"
            id={`tab-${r.key}`}
            aria-selected={active === i}
            aria-controls={`panel-${r.key}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKey(e, i)}
            className={`press snap-start shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-400 ${
              active === i ? 'bg-midnight-900 text-warm' : 'bg-white border border-midnight-200 text-midnight-600 hover:border-midnight-300'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`panel-${role.key}`}
        aria-labelledby={`tab-${role.key}`}
        className="mt-6 grid md:grid-cols-[auto_1fr] gap-8 items-center card p-6 sm:p-10"
      >
        <PhoneMock title={role.screen.title} rows={role.screen.rows} />
        <ul className="space-y-4">
          {role.points.map((p) => (
            <li key={p} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-royal shrink-0 mt-0.5" />
              <span className="text-midnight-700 leading-relaxed">{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function PhoneMock({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="mx-auto w-52 rounded-[2rem] bg-midnight-900 p-2.5 shadow-xl" aria-hidden="true">
      <div className="rounded-[1.6rem] bg-warm overflow-hidden">
        <div className="bg-royal px-4 pt-5 pb-4 text-warm">
          <p className="text-[10px] uppercase tracking-wide text-royal-100">NexHood</p>
          <p className="font-display font-semibold">{title}</p>
        </div>
        <div className="p-3 space-y-2">
          {rows.map((r, i) => (
            <div key={r} className={`rounded-xl px-3 py-2.5 text-xs font-medium ${i === rows.length - 1 && r.toLowerCase().includes('panic') ? 'bg-alert text-warm' : 'bg-white border border-midnight-100 text-midnight-700'}`}>
              {r}
            </div>
          ))}
          <div className="h-10" />
        </div>
      </div>
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
      <div className="card p-8 flex flex-col items-center text-center" role="status">
        <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3" />
        <p className="font-display font-semibold text-midnight-900">Message sent.</p>
        <p className="text-sm text-midnight-500 mt-1">We'll get back to you at {form.email} soon.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-4">
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      <div>
        <label htmlFor="c-name" className="label">Name</label>
        <input id="c-name" required minLength={2} className="input" placeholder="Your name" value={form.name} onChange={(e) => update('name', e.target.value)} />
      </div>
      <div>
        <label htmlFor="c-email" className="label">Email</label>
        <input id="c-email" type="email" required className="input" placeholder="you@example.com" value={form.email} onChange={(e) => update('email', e.target.value)} />
      </div>
      <div>
        <label htmlFor="c-message" className="label">Message</label>
        <textarea id="c-message" required minLength={10} rows={4} className="input" placeholder="A question, feedback, or interest in piloting NexHood at your estate." value={form.message} onChange={(e) => update('message', e.target.value)} />
      </div>
      <button type="submit" disabled={loading} className="btn-primary press w-full">
        {loading ? <Spinner className="h-4 w-4" /> : <>Send message <Send className="h-4 w-4" /></>}
      </button>
    </form>
  )
}
