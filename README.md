# Nexhood Web

The Nexhood frontend — a public marketing site plus a role-aware web app (resident /
guard / admin / police) built on the brand identity (shield + open-door mark, Deep
Midnight Blue / Royal Blue / Alert Red / Soft Steel Blue, Clash Grotesk) and wired to
your existing FastAPI backend (`main.py`).

Stack: React 18 + TypeScript + Vite + Tailwind CSS + React Router + Recharts + Axios.

## What's included

- **Public site** (`/`) — hero, brand story, features, personas, welfare CTA.
- **Auth** (`/login`, `/register`) — resident self-registration (first user per estate
  becomes admin), JWT stored client-side.
- **App** (`/app/*`, behind login):
  - Dashboard — role-aware summary (admin sees estate-wide stats + activity, others see
    their own).
  - Visitor Passes — create QR passes, guard/admin gate validation.
  - Incidents — report, filter, detail view, status updates, resolve.
  - Alerts — send emergency alerts, acknowledge, escalate to police.
  - Community — posts, replies, likes.
  - Welfare Fund — donation flow (Paystack link, per `main.py`'s current mock).
  - Analytics (admin only) — incident/visitor trend charts, incident type breakdown,
    activity log.
  - Users (admin only) — invite (single + CSV bulk), change role, activate/deactivate,
    delete.
  - Settings — profile, badges, change password.

## 1. Local setup

```bash
npm install
cp .env.example .env   # point VITE_API_URL at your backend
npm run dev
```

Your backend (`main.py`) needs to be running and reachable at `VITE_API_URL`
(defaults to `http://localhost:8000`). Start it with:

```bash
uvicorn main:app --reload --port 8000
```

## 2. Before you deploy: get the backend hosted somewhere real

Vercel is a great fit for this frontend, but **it cannot host `main.py` as-is** — it's a
long-running FastAPI process with Socket.IO (persistent websockets) and an in-memory
rate limiter, which doesn't fit Vercel's serverless model. Deploy the backend to a
persistent host instead, for example:

- **Render** or **Railway** — easiest, both support FastAPI + a `Procfile`/start command
  directly (`uvicorn main:app --host 0.0.0.0 --port $PORT`), free/cheap tiers.
- **Fly.io** — great if you want it geographically close to Abuja/Lagos.

You'll also need:

- **MongoDB Atlas** (free tier is fine to start) instead of local MongoDB — set
  `MONGODB_URI` on whichever host you pick.
- Real values for `JWT_SECRET`, and `TWILIO_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE`
  if you want SMS notifications to actually send.
- Update the CORS `allow_origins` list in `main.py` to include your real Vercel domain
  once you have it (it currently allows `*`, which works but is worth tightening before
  a public launch).

## 3. Deploy the frontend to Vercel

**Option A — Vercel dashboard (fastest):**

1. Push this `nexhood-web` folder to a GitHub repo.
2. In Vercel: **New Project** → import the repo → framework preset auto-detects Vite.
3. Add an environment variable: `VITE_API_URL` = your deployed backend URL
   (e.g. `https://nexhood-api.onrender.com`).
4. Deploy. `vercel.json` is already set up with the SPA rewrite so client-side routing
   (`/app/incidents/:id`, etc.) works on refresh.

**Option B — Vercel CLI:**

```bash
npm i -g vercel
vercel          # first deploy, follow prompts
vercel env add VITE_API_URL production
vercel --prod
```

## 4. Custom domain

Once deployed, add your domain under Project → Settings → Domains in Vercel, and point
your DNS (CNAME to `cname.vercel-dns.com`, or the A record Vercel gives you).

## Notes on the brand system

Brand tokens live in `tailwind.config.js` (`midnight`, `royal`, `alert`, `steel`, `warm`)
and mirror the Brand Identity Presentation v1.0 exactly:

| Token | Hex | Use |
|---|---|---|
| `midnight` | `#071456` | Primary dark, headers, sidebar |
| `royal` | `#00139E` | Primary action color |
| `alert` | `#FE1513` | Alerts, emergencies, logo mark |
| `steel` | `#A3B5CB` | Muted/support accents |
| `warm` | `#FFF8F8` | App background |

Typeface is Clash Grotesk (loaded free from Fontshare in `index.html`) for headings,
falling back to Manrope for body text. The logo (`src/components/Logo.tsx`) is an SVG
recreation of the shield + open-door + neighboring-homes mark from the brand deck —
swap in the official exported SVG/PNG assets there if you have them.
