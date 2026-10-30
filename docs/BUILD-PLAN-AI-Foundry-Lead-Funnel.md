# Build Plan — Icreatit AI Foundry Lead Funnel

| | |
|---|---|
| **Source** | `docs/PRD-AI-Foundry-Lead-Funnel.md` (v1.2) |
| **Stack** | Next.js/React + Tailwind on Vercel, Convex backend, Brevo, Telegram bot |
| **Status** | Draft (v1) — no dates; sequence may shift if external dependencies slip |

Phases are ordered by dependency, not by calendar. A phase is considered done only when its exit criteria are met.

---

## Phase 1: Foundations & Setup

**Goal:** Everything scaffolded and every external account ready, so no later phase is blocked.

- Scaffold repo (GitHub) with Next.js + Tailwind + Convex; connect CI to Vercel (`dev` + `prod` Convex deployments, preview deploys from branches).
- Convex schema for all 5 tables (`users`, `referrals`, `events`, `callBookings`, `settings`) with the required indexes: `users.by_email`, `users.by_phone`, `users.by_referralCode`, `referrals.by_referrer`.
- Environment variables scaffolded: Brevo API key, Telegram bot token, WhatsApp number, app URL.
- External setup: subdomain + DNS/CNAME, WhatsApp number + approved prefilled message copy, Telegram group + bot created, Brevo account/plan confirmed for 2,000+ contacts, teaser video uploaded to YouTube (get the `youtube-nocookie` link), PDF guide file, CEO photo/bio, evidence assets with permissions, brand colours and fonts, level names confirmed.
- Placeholder deploy of `/` and `/auth` routes so the funnel is testable in-app browsers early.

**Exit criteria:** Empty site deployed on the subdomain; Convex dev/prod syncing; all assets/accounts in hand or with owners assigned.

---

## Phase 2: Auth, Signup & Referral Capture

**Goal:** A verified lead exists in the database with a referral code and correct attribution.

- Convex Auth: email OTP (magic code), optional Google sign-in with incomplete-profile handling (PRD 6.1).
- Two-step mobile signup form: Step 1 (First Name, Surname, Phone with +234 default, Email) → Step 2 (Gender, Business Description with live counter, NDPA consent checkbox) — animated step transition, correct keyboards/`autocomplete`, inline validation, no blocking alerts.
- Uniqueness enforcement (email, phone as E.164), disposable-domain blocklist, self-referral block, consent timestamp stored.
- `?ref=CODE` capture: persisted to cookie + localStorage on first visit (30-day retention), validated and attached at signup.
- Generate unique short referral code (6–8 characters) per user; trigger `signup` event.
- Abuse guards v1: rate-limit OTP and signup per IP/device (soft-flag only, no hard block for shared campus Wi-Fi), `ipHash` stored on referrals.

**Exit criteria (PRD 16):** A visitor can sign up, verify via OTP, and land on a stub dashboard; referral attribution works; duplicate/self-referrals are rejected.

---

## Phase 3: Core Engine — Dashboard, Referrals & Unlock Logic

**Goal:** The entire reward engine working end-to-end, server-enforced. Built before the landing page is polished, because the landing page's CTAs and gamification depend on real dashboard/unlock behaviour.

- Convex mutations/queries for: WhatsApp click recording (`whatsappClickedAt`), valid-referral validation (linked + email verified + unique phone), denormalized `validReferralCount` recalculation.
- Idempotent milestone processing at 1 / 3 / 10 valid referrals — fires the Brevo event once and sets `pdfUnlockedAt`, `ceoCallUnlockedAt`, etc.
- Telegram gate: unlock only when `whatsappClickedAt` is set AND `validReferralCount >= 1`; enforced server-side only.
- Referral invalidation mutation that recalculates counts and re-locks rewards if the count falls below a threshold.
- One-page `/dashboard`: welcome header + level badge, unlock checklist (WhatsApp step, refer 1, locked→live Telegram button), referral link card with copy + WhatsApp/Telegram/X/Facebook/SMS share + ready-made plain-text share messages, liquid-fill progress tracker, locked/unlocked reward cards (PDF, CEO call), masked referrals list ("Chidi O.", Verified/Pending), footer with logout.
- Convex reactive real-time updates (no refresh), live "just joined your network" toasts, milestone celebration + level-up logic (Explorer/Connector/Builder/Scaler), locked-card "melt open" states.
- Mobile-first dashboard: sticky bottom action area, thumb zone, safe-area insets, 44px touch targets.
- Settings table for the WhatsApp number/message template so changes need no code deploy.

**Exit criteria:** Full unlock path (signup → verify → WhatsApp click → 1 referral → Telegram locked→unlocked; 3 → PDF; 10 → CEO call) passes against PRD Section 16, enforced server-side.

---

## Phase 4: Landing Page

**Goal:** Full conversion surface per PRD Section 5, CTA redistribution exactly as specified.

- Built at 360px first, then scaled up. Sections in order: hero (exact headline "It's time to build and scale your business with grants and AI", **no CTA**, logo-only header, scroll cue, animated liquid background + headline reveal) → video section (tap-to-load `youtube-nocookie` facade) → 3 module cards (no CTA) → Meet the CEO (**CTA 2**) → About + four offers (no prices) → Evidence with count-up numbers (**CTA 3**) → How-it-works 3-step level-up path → animated FAQ accordion → final CTA band + footer (**CTA 4**). CTA 1 sits directly below the video.
- Sticky mobile bottom CTA appears **only after the hero scrolls out of view**.
- Motion system: GSAP + ScrollTrigger lazy-loaded after first paint; scroll reveals, wave dividers, liquid buttons, count-ups; transform/opacity-only animation; static gradient fallback for heavy goo filters; `prefers-reduced-motion` honoured; ~80KB gzipped animation budget on the landing route.
- Meta/OG tags for WhatsApp link previews; analytics: page views, scroll depth, per-CTA clicks (1–4 + sticky bar), video facade taps and YouTube player events.
- **No emojis anywhere**, including share text and form messages.

**Exit criteria:** All PRD Section 5 rules verified; LCP under 2.5s on 4G mid-range Android.

---

## Phase 5: Integrations

**Goal:** Every external system wired and automations firing exactly once. Built on the Phase 2–3 schemas; can start once those stabilise.

- **Brevo:** contact sync with the full attribute set; automations for signup, each valid referral ("someone joined your link"), 3-referral PDF email, 10-referral CEO-call email, telegram-unlocked email, plus the 24h WhatsApp nudge and 48h referral nudge. All emails: no emojis, unsubscribe link, company address.
- **CEO call-booking notification (required):** when a user books a call, a Convex action sends the CEO (via Brevo transactional email) the user's name, email, referral stats and booking time; matched notifications on reschedule/cancellation. Confirmed on top of the scheduler's own reminders.
- **Telegram bot:** Convex action issuing single-use invite links via `createChatInviteLink` (member_limit=1); `telegramUnlockedAt`/`telegramJoinedAt` recorded via the member-update webhook. Static-link fallback only as contingency.
- **PDF delivery:** private Convex file storage / signed URL, never public pre-unlock; download event tracked.
- **CEO call:** Cal.com or Calendly embed behind unlock; weekly capacity cap in `settings`, "slots available / waitlist" states, bookings written to `callBookings`.
- **Operations tooling (no admin UI in v1):** saved Convex dashboard queries for funnel counts and top referrers; the referral-invalidation mutation runnable from the Convex dashboard; a Convex action that exports leads (with referral stats) as CSV for follow-up.

**Exit criteria:** All emails fire once only (verified with test events); invite links are single-use; gated URLs are unrecoverable pre-unlock; CEO receives booking notifications end-to-end.

---

## Phase 6: QA, Hardening & Legal

**Goal:** Ship-ready per PRD Sections 9–11 and 16.

- End-to-end test of **every** unlock path, including returning logins via OTP, and referral-then-invalidate re-locking.
- Abuse testing: fake referral attempts, disposable emails, repeated IPs, sequential email patterns.
- Device/browser matrix: Safari iOS, Chrome on low/mid Android, WhatsApp/Instagram/Facebook in-app browsers.
- Performance pass: LCP, animation jank on low-end devices, off-screen animation teardown, load testing for campaign traffic spikes.
- Accessibility: contrast over animated backgrounds, keyboard-navigable forms, alt text, reduced motion.
- Legal: Privacy Policy, Terms (referral rules, invalidation right, call capacity disclaimer), "learn how to apply / results vary" claim language, unsubscribes.
- Final no-emoji sweep across UI, emails, share messages, prefilled WhatsApp text.

**Exit criteria:** Every PRD Section 16 checkbox verified.

---

## Phase 7: Soft Launch → Public Launch → Optimize

- **Soft launch:** release to 50–100 users (team, friends, campus ambassadors using their own referral links). Monitor funnel metrics (PRD 3.3), fix bugs, tune the valid-referral decision with real data, verify Brevo deliverability/sending limits.
- **Public launch:** full push — CEO and company socials, WhatsApp statuses, campus ambassadors, paid ads, all tracked via referral links and the top-referrers query.
- **Optimize (ongoing):** weekly review of signup conversion (target 20%), form completion (70%), referral rate (35% / viral coefficient 0.8), Telegram joins (25%); adjust copy, CTA placement, nudges and the referral definition from data.
