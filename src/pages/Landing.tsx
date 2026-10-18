import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  BellDot,
  Landmark,
  Receipt,
  Wallet,
  Wrench,
  ShieldCheck,
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
// We don't name live estates on the public site, for their residents' privacy.
const PROOF: {
  testimonial: { quote: string; name: string; role: string } | null
  stats: { label: string; value: string }[] | null
  photos: { src: string; alt: string }[]
} = {
  testimonial: null, // e.g. { quote: '…', name: 'Mrs. A.', role: 'Resident, Abuja' } (no estate names)
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
  { icon: Wallet, text: 'House 14 · Service charge paid · ₦150,000', tone: 'text-emerald-300' },
  { icon: MessagesSquare, text: 'Estate meeting posted · Saturday 10am', tone: 'text-steel-200' },
]

const STEPS = [
  { title: 'Resident creates a pass', body: 'Add your visitor’s name and time. NexHood makes a QR pass you send on WhatsApp.', icon: QrCode },
  { title: 'Guard scans at the gate', body: 'One scan shows who they are, who they’re visiting and when they’re expected.', icon: ScanLine },
  { title: 'Everyone’s on record', body: 'Every entry is logged, so the estate knows who came in and when. No more guesswork.', icon: ClipboardCheck },
]

// The small cards under the big feature tiles. Only things that are live.
const MORE_FEATURES = [
  { icon: ClipboardCheck, title: 'Incident reports', body: 'Photos, status and follow-up until it’s resolved.' },
  { icon: Wrench, title: 'Repairs board', body: 'Report a leak or dead street light. Neighbours tap “me too”.' },
  { icon: MessagesSquare, title: 'Notices and events', body: 'Meetings and announcements, emailed to everyone.' },
  { icon: HeartHandshake, title: 'Guard welfare fund', body: 'Residents support the guards who keep them safe.' },
  { icon: PhoneCall, title: 'One-tap directory', body: 'The gate, the admin and emergency numbers.' },
  { icon: BellDot, title: 'Nothing missed', body: 'A red dot the moment something new happens.' },
  { icon: BarChart3, title: 'Admin analytics', body: 'Visitors, incidents and response times at a glance.' },
  { icon: ShieldCheck, title: 'Each role sees its part', body: 'Guards never see the estate’s money.' },
]

const ROLES: { key: string; label: string; screen: { title: string; rows: string[] }; points: string[] }[] = [
  {
    key: 'resident',
    label: 'Resident',
    screen: { title: 'Home', rows: ['Chidi · Today 4:00–6:00pm', 'Service charge · ₦150,000', 'Panic button'] },
    points: ['Create a visitor pass in seconds and send it on WhatsApp', 'Hit the panic button and every guard on shift knows', 'See your bills, pay the estate account and see where the money went'],
  },
  {
    key: 'guard',
    label: 'Guard',
    screen: { title: 'Scan pass', rows: ['Expected · House 14', 'Alert: Block C', 'Contacts directory'] },
    points: ['Scan a QR pass instead of calling round the estate', 'See and acknowledge alerts the moment they come in', 'Get recognised for the work through the welfare fund'],
  },
  {
    key: 'admin',
    label: 'Admin / manager',
    screen: { title: 'Overview', rows: ['Visitors today · 38', 'Payments to confirm · 3', 'Collected this month · ₦3.1m'] },
    points: ['Invite residents and guards with one link each', 'Bill every house, confirm payments and remind those who owe', 'Record spending with receipts so the monthly statement writes itself'],
  },
  {
    key: 'emergency',
    label: 'Emergency help',
    screen: { title: 'Emergency numbers', rows: ['Emergency · 112', 'Police · 199', 'Fire service · Abuja'] },
    points: ['Call 112, the police or the fire service in one tap, from the Alerts page', 'Your estate’s own police contact shows first, if your admin adds one', 'Guards see the house number before they call, so help goes to the right door'],
  },
]

const FAQS = [
  { q: 'Does every resident need a smartphone?', a: 'No. Guards and admins need one to scan passes and handle alerts. Residents without a smartphone can still be on the estate’s list, and someone in the household can create passes for them.' },
  { q: 'What does it cost?', a: 'We’re onboarding estates from the waitlist and agreeing pricing with each one based on its size. Join the list and we’ll talk you through it. No payment is needed to join.' },
  { q: 'How do we move our estate onto NexHood?', a: 'The estate admin or exco sets the estate up, then invites residents and guards, and adds the estate’s police contact if it has one. We help with the setup and with training your guards at the gate.' },
  { q: 'Is our data safe?', a: 'Each estate only sees its own data, and access depends on your role. Joining an existing estate is invite-only, so strangers can’t add themselves to your estate.' },
  { q: 'Can we collect service charge and dues on NexHood?', a: 'Yes. The admin sets the charges, NexHood bills each unit, and residents pay online with Paystack or by bank transfer. Everyone can see a monthly statement of what was collected and what was spent.' },
  { q: 'Does NexHood hold our money?', a: 'No. Residents pay into your estate’s own bank account. NexHood only keeps the records. When online card payments are switched on, the money goes straight from Paystack to the estate’s account and the resident sees any small fee before paying.' },
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
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-6 grid grid-cols-1 lg:grid-cols-[1.15fr_.85fr] gap-10 lg:gap-14 items-center">
            <div>
              <span className="rise inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-semibold text-steel-100" style={{ animationDelay: '.1s' }}>
                <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400" /> Live in estates across Abuja
              </span>
              <h1 className="rise mt-5 font-display text-[2.4rem] leading-[1.02] sm:text-6xl font-semibold tracking-tight" style={{ animationDelay: '.25s' }}>
                {headline}
              </h1>
              <p className="rise mt-5 text-base sm:text-lg text-steel-200 max-w-xl leading-relaxed" style={{ animationDelay: '.4s' }}>
                QR visitor passes, a panic button that rings your guards and admin, one-tap emergency numbers, and service charge with accounts every resident can see. One app for residents, guards and the estate admin.
              </p>
              <div className="rise mt-8 flex flex-col sm:flex-row gap-3" style={{ animationDelay: '.55s' }}>
                <button type="button" onClick={() => goToWaitlist()} className="btn-alert press alert-once text-base px-7 py-3">
                  Join the waitlist <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => goToWaitlist('estate_admin')} className="btn press border border-white/25 text-warm hover:bg-white/10 text-base px-7 py-3">
                  I manage an estate
                </button>
              </div>
              <ul className="rise mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-steel-200" style={{ animationDelay: '.65s' }}>
                {['Works with your current guards', 'Invite-only for each estate', 'Money goes to the estate account'].map((t) => (
                  <li key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> {t}</li>
                ))}
              </ul>
              <p className="rise mt-4 text-xs text-steel-300" style={{ animationDelay: '.75s' }}>
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

        <FeaturesSection />

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
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold">Already protecting estates in Abuja.</h2>
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
            <Link to="/terms" className="hover:text-warm">Terms</Link>
            <Link to="/privacy" className="hover:text-warm">Privacy</Link>
          </div>
        </div>
        <p className="max-w-6xl mx-auto px-4 sm:px-6 pb-8 text-xs text-steel-400">© {new Date().getFullYear()} NexHood. NexHood helps neighbours reach each other fast; it is not an emergency service. In an emergency, also call 112.</p>
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
    <div className="rise relative mx-auto w-full max-w-sm min-w-0" style={{ animationDelay: '.6s' }} aria-hidden="true">
      {/* Sits above the card in normal flow, overlapping only the frame's padding, never the pass itself. */}
      <div className="relative z-10 -mb-3 ml-auto mr-3 flex w-fit items-center gap-2.5 rounded-2xl bg-white text-midnight-900 shadow-xl px-3.5 py-2.5">
        <span className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><Wallet className="h-4 w-4" /></span>
        <span className="text-xs leading-tight"><span className="block font-semibold">₦150,000 received</span><span className="text-midnight-400">House 14 · service charge</span></span>
      </div>
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 pt-6 shadow-2xl backdrop-blur">
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

export function FeaturesSection() {
  return (
    <section id="features" className="bg-midnight-900 text-warm py-16 sm:py-24 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <SectionLabel dark>Features</SectionLabel>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold leading-tight">Everything your estate runs on, in one place.</h2>
          <p className="mt-4 text-steel-200 leading-relaxed">
            The gate, emergencies, service charge and the estate’s accounts. No more scattered WhatsApp groups, phone calls and Excel sheets.
          </p>
        </Reveal>

        <div className="mt-10 grid lg:grid-cols-3 gap-4">
          {/* Panic + alerts */}
          <Reveal className="lg:col-span-2 rounded-3xl border border-alert/30 bg-alert/10 p-6 sm:p-8 grid sm:grid-cols-2 gap-6 items-center">
            <div>
              <span className="h-11 w-11 rounded-xl bg-alert text-warm flex items-center justify-center"><Siren className="h-5 w-5" /></span>
              <h3 className="mt-4 font-display text-xl sm:text-2xl font-semibold">Panic button that reaches everyone</h3>
              <p className="mt-2 text-sm text-steel-200 leading-relaxed">One tap alerts every guard on shift and the admin. A guard acknowledges so you know help is coming, and 112, the police or the fire service are one more tap away.</p>
            </div>
            <AlertFeedMock />
          </Reveal>

          {/* Visitor passes */}
          <Reveal className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <span className="h-11 w-11 rounded-xl bg-white/10 text-steel-100 flex items-center justify-center"><QrCode className="h-5 w-5" /></span>
            <h3 className="mt-4 font-display text-xl font-semibold">QR visitor passes</h3>
            <p className="mt-2 text-sm text-steel-200 leading-relaxed">Create a pass, send it on WhatsApp, and the guard scans it at the gate. Every entry is on record.</p>
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/[0.06] border border-white/10 p-3">
              <span className="h-10 w-10 rounded-lg bg-warm p-1.5"><span className="block h-full w-full rounded-sm bg-[repeating-linear-gradient(90deg,#071456_0_3px,transparent_3px_6px),repeating-linear-gradient(0deg,#071456_0_3px,transparent_3px_6px)]" /></span>
              <span className="text-sm"><span className="block font-semibold">Chidi · House 14</span><span className="text-emerald-300 text-xs">Verified at Gate 1 · 4:32pm</span></span>
            </div>
          </Reveal>

          {/* Bills */}
          <Reveal className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <span className="h-11 w-11 rounded-xl bg-white/10 text-steel-100 flex items-center justify-center"><Receipt className="h-5 w-5" /></span>
            <h3 className="mt-4 font-display text-xl font-semibold">Service charge and dues</h3>
            <p className="mt-2 text-sm text-steel-200 leading-relaxed">Bill every house in one go. Residents pay the estate account, tap “I paid”, and the admin confirms. No chasing screenshots.</p>
            <BillMock />
          </Reveal>

          {/* Accounts */}
          <Reveal className="lg:col-span-2 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8 grid sm:grid-cols-[.9fr_1.1fr] gap-6 items-center">
            <div>
              <span className="h-11 w-11 rounded-xl bg-white/10 text-steel-100 flex items-center justify-center"><Landmark className="h-5 w-5" /></span>
              <h3 className="mt-4 font-display text-xl sm:text-2xl font-semibold">Accounts every resident can see</h3>
              <p className="mt-2 text-sm text-steel-200 leading-relaxed">Every expense is recorded with its receipt, and big spends need the approver’s OK. Each month residents see what came in, what went out and what’s left.</p>
              <p className="mt-3 text-xs text-steel-300">NexHood never holds your money. It goes to the estate’s own account.</p>
            </div>
            <StatementMock />
          </Reveal>
        </div>

        <ul className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {MORE_FEATURES.map((f) => (
            <li key={f.title}>
              <Reveal className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                <f.icon className="h-5 w-5 text-steel-100" />
                <h3 className="mt-3 font-display text-sm sm:text-base font-semibold">{f.title}</h3>
                <p className="mt-1 text-xs sm:text-sm text-steel-300 leading-relaxed">{f.body}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// Illustrative only: a live alert as guards see it.
function AlertFeedMock() {
  const rows = [
    { t: '9:41pm', text: 'Panic alert · House 9', tone: 'bg-alert text-warm' },
    { t: '+12s', text: 'Mike (Gate 1) acknowledged', tone: 'bg-white/10 text-warm' },
    { t: '+40s', text: 'Guard calls 112 from the alert', tone: 'bg-white/10 text-warm' },
    { t: '+6m', text: 'Resolved · resident safe', tone: 'bg-emerald-500/15 text-emerald-300' },
  ]
  return (
    <ol className="space-y-2" aria-label="Example alert timeline">
      {rows.map((r) => (
        <li key={r.text} className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm ${r.tone}`}>
          <span className="w-12 shrink-0 text-xs tabular-nums opacity-80">{r.t}</span>
          <span className="font-medium">{r.text}</span>
        </li>
      ))}
    </ol>
  )
}

// Illustrative only: mirrors the resident's Bills screen in the app.
function BillMock() {
  return (
    <div className="mt-5 rounded-2xl bg-warm text-midnight-900 p-4" aria-label="Example of a resident's bill">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-midnight-400">You owe</p>
          <p className="font-display text-2xl font-semibold tabular-nums">₦150,000</p>
          <p className="text-xs text-midnight-400">House 14 · Service charge Q4</p>
        </div>
        <span className="badge bg-amber-50 text-amber-700">Due 31 Dec</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-midnight-50 px-3 py-2 text-xs">
        <span className="text-midnight-600 truncate">Estate account · <span className="font-mono font-semibold text-midnight-900">0123456789</span></span>
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
      </div>
    </div>
  )
}

// Illustrative only: the numbers are an example, not a real estate's accounts.
function StatementMock() {
  const rows = [
    { label: 'Diesel and power', value: 1_240_000, w: 46, color: '#2a78d6' },
    { label: 'Security salaries', value: 960_000, w: 36, color: '#eb6834' },
    { label: 'Repairs', value: 310_000, w: 12, color: '#1baf7a' },
    { label: 'Waste and cleaning', value: 160_000, w: 6, color: '#eda100' },
  ]
  return (
    <figure className="rounded-2xl bg-warm text-midnight-900 p-4 sm:p-5" aria-label="Example monthly statement">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-midnight-400">October statement · example</p>
        <span className="badge bg-emerald-50 text-emerald-700">All residents</span>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        <div><dt className="text-midnight-400 text-[11px]">Collected</dt><dd className="font-display text-base sm:text-lg font-semibold tabular-nums">₦3.1m</dd></div>
        <div><dt className="text-midnight-400 text-[11px]">Spent</dt><dd className="font-display text-base sm:text-lg font-semibold tabular-nums">₦2.67m</dd></div>
        <div><dt className="text-midnight-400 text-[11px]">Balance</dt><dd className="font-display text-base sm:text-lg font-semibold tabular-nums text-emerald-700">₦430k</dd></div>
      </dl>
      <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full gap-0.5" aria-hidden="true">
        {rows.map((r) => <span key={r.label} style={{ width: `${r.w}%`, background: r.color }} />)}
      </div>
      <ul className="mt-3 space-y-1.5 text-xs sm:text-sm">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-midnight-600"><span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: r.color }} />{r.label}</span>
            <span className="tabular-nums font-medium">₦{r.value.toLocaleString('en-NG')}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-midnight-400 flex items-center gap-1.5"><Receipt className="h-3.5 w-3.5 shrink-0" /> Receipt on every line</p>
    </figure>
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
