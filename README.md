# Icreatit AI Foundry Lead Funnel

Referral-driven lead generation funnel for the free **AI Foundry and Grant Winning Course**
(Icreatit Brand Limited). Leads land on the marketing page, sign up, complete unlock steps
on a one-page dashboard and reach a gated Telegram group where the course and paid offers live.

- PRD: `docs/PRD-AI-Foundry-Lead-Funnel.md`
- Build plan: `docs/BUILD-PLAN-AI-Foundry-Lead-Funnel.md`

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + Tailwind CSS v4 |
| Backend / DB | Convex (queries, mutations, actions, file storage, cron) |
| Auth | Convex Auth (email OTP; Google optional) |
| Hosting | Vercel (frontend) |
| Email | Brevo (API from Convex actions) |
| Community gate | Telegram bot, single-use invite links |
| Domain | `techhub.icreatitbrandagency.com` |

## Quick start

```bash
npm install         # on Windows with locked-down PowerShell: use npm.cmd
npx convex dev      # first run: creates/links a Convex deployment, pushes the schema,
                    # writes .env.local with CONVEX_DEPLOYMENT + NEXT_PUBLIC_CONVEX_URL
npm run dev         # http://localhost:3000
```

## Environment variables

Copy `.env.example` to `.env.local`. Secrets (Brevo, Telegram bot token) also belong in
Convex env vars (`npx convex env set KEY value`) since server actions read them there.

| Variable | Used for |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Canonical site URL (`https://techhub.icreatitbrandagency.com`), used by metadata and referral links |
| `NEXT_PUBLIC_CONVEX_URL` | Auto-written by `convex dev` |
| `CONVEX_DEPLOYMENT` | Auto-written by `convex dev` |
| `BREVO_API_KEY` | Transactional email + automations (Convex actions) |
| `TELEGRAM_BOT_TOKEN` | Single-use invite links via `createChatInviteLink` |
| `CEO_NOTIFICATION_EMAIL` | CEO alert emails when a call is booked |

## Git / deploy flow

- `main` → production deploys on Vercel.
- Feature branches → Vercel preview deployments.
- Domain: CNAME `techhub` on the company DNS → `cname.vercel-dns.com` (Vercel gives the
  exact instructions when adding the domain).

## Brand assets

Brand colours, typefaces and the logo are **placeholders** in `app/globals.css` and the
pages until the real Icreatit Brand assets arrive. Replace them in one place (`@theme`
block in `globals.css`) — do not hardcode hex values in components.

## Rules from the PRD worth remembering during implementation

- No emojis anywhere (UI, emails, share text, WhatsApp message).
- No hero CTA on the landing page; CTAs after the video, CEO and evidence sections + final band.
- Unlock logic is enforced server-side in Convex, never only in the UI.
- No pricing appears anywhere in the funnel.
- Motion: GSAP + ScrollTrigger, lazy-loaded, `prefers-reduced-motion` respected.

## Status

Phase 1 (foundations) scaffolded. Next up: Phase 2 — auth, signup form, referral capture.
