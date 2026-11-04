# Build Plan — Icreatit AI Foundry Lead Funnel

| | |
|---|---|
| **Source** | `docs/PRD-AI-Foundry-Lead-Funnel.md` (**v1.3** — dashboard course + payments) |
| **Stack** | Next.js/React + Tailwind on Vercel, Convex backend, Brevo, Paystack, Telegram bot |
| **Status** | Draft (v2) — no dates; sequence may shift if external dependencies slip |

Phases are ordered by dependency, not by calendar. A phase is considered done only when its exit criteria are met.

### Progress (as of 3 November 2026)

| Phase | State |
|---|---|
| 1 Foundations | Done (scaffold, schema v1, Convex dev deployment live) |
| 2 Auth / signup / referral capture | Built; server-side auth fix verified live — **awaiting user's browser login confirmation** (see Phase 2 note) |
| 3 Core engine | **Done** — v1.3 rework built, pushed, committed (`a9d06a5`); payments engine + webhook live |
| 4 Landing page | **Built** (all 9 sections, CTA rules, sticky bar, analytics; content placeholders pending client assets) |
| 5 Integrations | **Built in code** (email engine + automations, nudges cron, call booking, Telegram invites, PDF delivery, ops tooling); **needs env keys** (BREVO_API_KEY, TELEGRAM_BOT_TOKEN, PAYSTACK_SECRET_KEY, CEO_NOTIFICATION_EMAIL) before live E2E verification |

---

## Phase 2 note (before anything else): resolve the auth "provider discovery" failure

The browser login currently fails with:
`Failed to authenticate: "Auth provider discovery of https://giddy-retriever-670.eu-west-1.convex.site failed", check your server auth config`.

- Reproduce, capture the failing request and the Convex function logs for the moment of failure.
- Candidate causes to check in order: JWKS/JWT key env values (format/rotation mismatch), `SITE_URL` vs `CONVEX_SITE_URL` expectations, the auth component's http routes registration (`auth.addHttpRoutes`), and whether a stale component bundle or env var is signed into the deployment.
- **Exit criteria:** browser login (both fresh OTP signup and returning login) works end-to-end on the dev deployment without this error.

### Confirmed decisions baked into v1.3 (no reopening)

1. Video-2 engagement fires at **~50% playback** (IFrame Player API).
2. Payments via **Paystack**; nothing in the paid section unlocks until the webhook is verified server-side.
3. **No upgrade path** PDF-only → bundle in v1.
4. **Avatar = preset/initials picker** (no uploads in v1).
5. Free course guide is a **reward card under the videos** (3 referrals).
6. CEO call booking **unchanged** (10 referrals, capacity-capped).
7. Level tiers stay mapped to 1/3/10 with rewards renamed (videos / free guide / CEO call).

---

## Phase 1: Foundations & Setup

**Goal:** Everything scaffolded and every external account ready, so no later phase is blocked.

- Scaffold repo (GitHub) with Next.js + Tailwind + Convex; connect CI to Vercel (`dev` + `prod` Convex deployments, preview deploys from branches). **Done.**
- Convex schema for all tables with the required indexes. **Done (v1 schema).**
- Environment variables scaffolded: Brevo API key, Paystack secret/public keys, Telegram bot token, CEO WhatsApp number, app URL.
- External setup: subdomain + DNS/CNAME (**`techhub.icreatitbrandagency.com`**), CEO's WhatsApp number + approved prefilled copy, paid WhatsApp group + Telegram group + bot created, Brevo account/plan confirmed for 2,000+ contacts, 2 dashboard course videos + landing teaser uploaded to YouTube (`youtube-nocookie` IDs), guide and book PDF files, CEO photo/bio, evidence assets with permissions, brand colours and fonts, Paystack account and keys.
- Placeholder deploy of `/` and `/auth` routes. **Done.**

**Exit criteria:** Empty site deployed on the subdomain; Convex dev/prod syncing; all assets/accounts in hand or with owners assigned.

---

## Phase 2: Auth, Signup & Referral Capture

**Goal:** A verified lead exists in the database with a referral code and correct attribution.

- Convex Auth: **email OTP (magic code) only** — google sign-in is out (PRD 6.1, v1.3).
- Two-step mobile signup form: Step 1 (First Name, Surname, Phone with +234 default, Email) → Step 2 (Gender, Business Description with live counter, NDPA consent checkbox) — animated step transition, correct keyboards/`autocomplete`, inline validation, no blocking alerts.
- Uniqueness enforcement (email, phone as E.164), disposable-domain blocklist, self-referral block, consent timestamp stored.
- `?ref=CODE` capture: persisted to cookie + localStorage on first visit (30-day retention), validated and attached at signup.
- Generate unique short referral code (6–8 characters) per user; trigger `signup` event.
- Abuse guards v1: rate-limit OTP and signup per IP/device (soft-flag only, no hard block for shared campus Wi-Fi), `ipHash` stored on referrals.
- Fix the Phase 2 note auth bug above.

**Exit criteria (PRD 16):** A visitor can sign up, verify via OTP, and land on the dashboard; referral attribution works; duplicate/self-referrals are rejected; returning OTP login works in the browser.

---

## Phase 3: Core Engine — Dashboard, Referrals, Videos, Payments & Unlock Logic

**Goal:** The entire reward and payment engine working end-to-end, server-enforced. Built before the landing page is polished, because the landing page's CTAs and gamification depend on real dashboard/unlock behaviour.

**Engine rework (from v1.2 build toward v1.3):**

- Replace the Telegram-at-1 unlock with the **video unlock**: `whatsappClickedAt` **AND** `validReferralCount >= 1` → `videoUnlockedAt`.
- Free **course guide** PDF stays at 3 referrals → `pdfUnlockedAt` (reward card **under the videos**).
- CEO call stays at 10 referrals → `ceoCallUnlockedAt` (unchanged clock).
- **Payment engine (new):**
  - `payments` table + `payments.by_user/by_reference/by_status` indexes (PRD 8).
  - Mutation to initialize a plan (`pdf` 7,500 / `bundle` 20,500): record `payment_initialized`, create the Paystack transaction with a unique reference.
  - Http route for the **Paystack webhook**: verify the paystack signature header, verify the amount and currency, set `confirmed`, then set `paidPdfUnlockedAt` (both plans) and `whatsappGroupUnlockedAt` + `telegramGroupUnlockedAt` (bundle only). Failure paths write `failed`, unlock nothing.
  - Ops-secret mutation for **manual confirmation** (edge cases), runnable from the Convex dashboard.
  - Idempotency: repeated webhooks/confirmations never double-unlock; reconciliation query by payment status.
- **Video engagement:** mutations to record `video1StartedAt` (analytics) and **`video2EngagedAt`** (once, ~50% of module 2 playback); the paid section visibility derives from this timestamp server-side.
- Referral invalidation: recalculates counts; re-locks `videoUnlockedAt`/`pdfUnlockedAt`/`ceoCallUnlockedAt` when below thresholds — **never touches payment unlocks**.
- Settings keys reset for v1.3 (`ceoWhatsappNumber`, `whatsappMessageTemplate`, `paidWhatsappGroupLink`, `paidTelegramGroupLink`, `paidTelegramInviteMode`, `video1YoutubeUrl`, `video2YoutubeUrl`, `pdfPriceNaira`, `bundlePriceNaira`, `maxCeoCallsPerWeek`) with the ops `setSetting` runner.

**Dashboard UI (v1.3):**

- One-page `/dashboard` per PRD 6.2: welcome header (avatar + level badge + next step), unlock checklist (WhatsApp-to-CEO step, refer 1), referral link card (copy + WA/TG/X/FB/SMS share + ready-made plain-text messages), **video course section** (locked frosted placeholders that inject the `youtube-nocookie` IFrame Player embeds only when unlocked; module-2 ~50% engagement recorded), free guide reward card under the videos, liquid-fill progress to 1/3/10, **payment section** (appears only after video-2 engagement: prominent button + hidden section with the PDF book, WhatsApp group and Telegram group — each gated, one-sentence explanations), rewards (CEO call), masked referrals list, **avatar picker (presets/initials)**, footer.
- Payment modal: 2 choices with prices; opens Paystack checkout; reactive unlock on confirmation.
- Convex reactive real-time updates, live "just joined" toasts, milestone celebrations (Explorer/Connector/Builder/Scaler), locked-card "melt open" states.
- Mobile-first: sticky bottom action area, thumb zone, safe-area insets, 44px touch targets.
- The WhatsApp prefilled template now includes `{surname}` (the client has the user's own data).

**Exit criteria:** On the dev deployment: signup → verify → WhatsApp click + 1 referral → videos unlocked and playable; module-2 engagement flips the paid section; a test Paystack payment (dev/public test key) confirmed by webhook unlocks exactly the chosen plan's items; 3 → guide; 10 → CEO call; referral invalidation re-locks free rewards only — all enforced server-side.

---

## Phase 4: Landing Page

**Goal:** Full conversion surface per PRD Section 5, CTA redistribution exactly as specified.

- Built at 360px first, then scaled up. Sections in order: hero (exact headline "It's time to build and scale your business with grants and AI", **no CTA**, logo-only header, scroll cue, animated liquid background + headline reveal) → video section (tap-to-load `youtube-nocookie` facade) → **2 module cards** (no CTA) → Meet the CEO (**CTA 2**) → About + four offers (no prices) → Evidence with count-up numbers (**CTA 3**) → How-it-works 3-step level-up path (updated to the v1.3 flow) → animated FAQ accordion (updated: payment questions) → final CTA band + footer (**CTA 4**). CTA 1 sits directly below the video.
- Sticky mobile bottom CTA appears **only after the hero scrolls out of view**.
- Motion system: GSAP + ScrollTrigger lazy-loaded after first paint; scroll reveals, wave dividers, liquid buttons, count-ups; transform/opacity-only animation; static gradient fallback for heavy goo filters; `prefers-reduced-motion` honoured; ~80KB gzipped animation budget on the landing route.
- Meta/OG tags for WhatsApp link previews; analytics: page views, scroll depth, per-CTA clicks (1–4 + sticky bar), video facade taps and YouTube player events.
- **No emojis anywhere**, including share text and form messages.

**Exit criteria:** All PRD Section 5 rules verified; LCP under 2.5s on 4G mid-range Android.

**Build note:** Implemented with IntersectionObserver + CSS-only motion (reveals, wave dividers, liquid buttons, hero blobs, count-ups, accordion, scroll depth) instead of GSAP/ScrollTrigger — 0 KB animation-library weight, transform/opacity-only, reduced-motion honoured. GSAP can be swapped in later if SVG-morph needs exceed CSS. All landing copy lives in `lib/landing.ts` (PLACEHOLDER marks pending client assets/claims). Analytics events (`convex/landing.ts` whitelist) written anonymously (`events.userId` made optional in schema v1.3).

---

## Phase 5: Integrations

**Goal:** Every external system wired and automations firing exactly once. Built on the Phase 2–3 schemas; can start once those stabilise.

- **Brevo:** contact sync with the full attribute set (v1.3 attributes incl. video engagement + payment plan); automations for signup, each valid referral, videos-unlocked, 3-referral guide email, 10-referral CEO-call email, **payment-confirmed receipt/access email**, plus the 24h WhatsApp nudge and 48h referral nudge. All emails: no emojis, unsubscribe link, company address.
- **Paystack hardening:** webhook signature + amount verification reviewed; reconciliation tooling; test-mode and live-mode key swaps.
- **CEO call-booking notification (required):** when a user books a call, a Convex action sends the CEO (via Brevo transactional email) the user's name, email, referral stats and booking time; matched notifications on reschedule/cancellation.
- **Paid groups:** payment-verified users get group access — Telegram via bot **single-use invite links** (`createChatInviteLink`, member_limit=1) with static-link fallback preferred for WhatsApp (manual moderation); `whatsappGroupJoined` and `telegramJoinClicked` events recorded.
- **PDF delivery:** private Convex file storage / signed URLs for the **free guide** (3 referrals) and the **paid book** (payment), never public pre-unlock; download events tracked.
- **CEO call:** Cal.com or Calendly embed behind unlock; weekly capacity cap in `settings`, "slots available / waitlist" states, bookings written to `callBookings`.
- **Operations tooling (no admin UI in v1):** saved Convex dashboard queries for funnel counts (incl. video unlocks, video-2 engagement, payments) and top referrers; the referral-invalidation and manual-payment-confirmation mutations runnable from the Convex dashboard; a Convex action that exports leads (with referral stats) as CSV for follow-up.

**Exit criteria:** All emails fire once only (verified with test events); gated URLs (videos handled at unlock, PDFs/`paid` group links) are unrecoverable pre-unlock; Paystack test transactions unlock the right plan end-to-end; CEO receives booking notifications end-to-end.

**Build note:** One delivery path for every email (`convex/emails.ts`): deterministic sendKeys claimed in `emailSends` BEFORE anything touches the network → scheduler → `deliverNow` action → `finalizeSend`. Bulk templates honour per-user unsubscribe (`/unsubscribe?t=token`, random token stamped at first verification); payment-receipt and CEO notification emails always deliver. Dev fallback logs full content to Convex function logs when BREVO_API_KEY is absent. Nudges run hourly via `convex/crons.ts`; windows are +/-5h with claim-based dedupe. PDFs are served as per-request storage URLs gated by unlock timestamps (`convex/files.ts`); Telegram uses single-use bot invites with static fallback (`convex/telegram.ts`); call bookings notify the CEO on book/reschedule/cancel (`convex/calls.ts`). Gated-URL leak fixed: `getDashboardData` now returns video URLs/group links only when the server-side unlock exists. Ops: `funnelCounts`, `topReferrers`, `listPayments`, `exportLeads` (CSV).

**Progress: CODE COMPLETE + PUSHED.** All Phase 5 modules deployed to `giddy-retriever-670` (verified via function-spec: emails/calls/nudges/telegram/files all live), convex + app `tsc` clean, `/`, `/dashboard`, `/auth`, `/unsubscribe` smoke-tested 200. Commit pending at build time; live E2E (Brevo/Paystack/Telegram/PDF) blocked on env keys and assets listed in the launch checklist.

---

## Phase 6: QA, Hardening & Legal

**Goal:** Ship-ready per PRD Sections 9–11 and 16.

- End-to-end test of **every** unlock path, including returning logins via OTP, referral-then-invalidate re-locking, and **both payment plans** (test keys) including webhook replay/miss handling.
- Abuse testing: fake referral attempts, disposable emails, repeated IPs, sequential email patterns, video-engagement spoofing review, payment tampering (reference/amount mismatch attempts).
- Device/browser matrix: Safari iOS, Chrome on low/mid Android, WhatsApp/Instagram/Facebook in-app browsers.
- Performance pass: LCP, animation jank on low-end devices, off-screen animation teardown, IFrame Player load cost on mobile, load testing for campaign traffic spikes.
- Accessibility: contrast over animated backgrounds, keyboard-navigable forms and payment modal, alt text, reduced motion.
- Legal: Privacy Policy, Terms (referral rules, invalidation right, call capacity disclaimer, purchase terms for PDF/groups, no-upgrade-path note), "learn how to apply / results vary" claim language, unsubscribes.
- Final no-emoji sweep across UI, emails, share messages, prefilled WhatsApp text and payment modal.

**Exit criteria:** Every PRD Section 16 checkbox verified.

---

## Phase 7: Soft Launch → Public Launch → Optimize

- **Soft launch:** release to 50–100 users (team, friends, campus ambassadors using their own referral links). Monitor funnel metrics (PRD 3.3), fix bugs, tune the valid-referral decision with real data, verify Brevo deliverability/sending limits and Paystack settlements with small live transactions.
- **Public launch:** full push — CEO and company socials, WhatsApp statuses, campus ambassadors, paid ads, all tracked via referral links and the top-referrers query.
- **Optimize (ongoing):** weekly review of signup conversion (target 20%), form completion (70%), referral rate (35% / viral coefficient 0.8), video unlocks, video-2 engagement, payment conversion and the PDF-vs-bundle split; adjust copy, CTA placement, nudges and the referral definition from data.
