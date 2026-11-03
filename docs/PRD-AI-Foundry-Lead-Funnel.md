# Product Requirements Document (PRD)

## AI Foundry & Grant Winning Course: Referral-Driven Lead Generation Funnel

| | |
|---|---|
| **Company** | Icreatit Brand Limited |
| **Product** | Lead generation funnel (landing page, auth, dashboard, referral engine, video course, payments, paid communities) |
| **Version** | 1.3 |
| **Date** | 3 November 2026 |
| **Owner** | Icreatit Brand Limited (builder: in-house with OpenCode) |
| **Status** | Ready for build planning |

### Revision history

| Version | Changes |
|---|---|
| 1.0 | Initial PRD |
| 1.1 | Defined signup form fields; YouTube embed for the video section; fixed hero headline and removed hero CTA; redistributed CTAs; added funnel-wide motion system (JavaScript transitions, liquid flows), gamification layer and strict mobile-first requirements; no emojis anywhere in the funnel |
| 1.2 | Removed the admin dashboard (operations run via the Convex dashboard and scripts instead); added an email notification to the CEO whenever a call is booked |
| 1.3 | **Course moved onto the dashboard**: the free course is 2 YouTube video modules (about 20 minutes total) instead of a Telegram group. Video access unlocks at (WhatsApp message to the CEO) + (1 valid referral). New post-payment tier: after the 2nd video is engaged (~50% playback via YouTube IFrame Player API), a payment button and a hidden section appear with a paid PDF book, WhatsApp group and Telegram group. Payments via Paystack: PDF only (N7,500) or PDF + both groups (N20,500); nothing unlocks until payment is verified server-side. Free course guide PDF remains at 3 valid referrals (shown under the videos). New: user avatar. Pricing now appears in the dashboard (previously "no pricing" is superseded). No upgrade path from PDF-only to the bundle in v1. |

---

## 1. Overview

### 1.1 Summary
Icreatit Brand Limited will run a free digital course, **"AI Foundry and Grant Winning Course"**, as lead bait. Leads land on a marketing page, sign up, and reach a one-page dashboard where they complete unlock steps and watch the free video course. Engaging with the course surfaces an offer to buy the paid packages (PDF book, WhatsApp group, Telegram group), and referral milestones unlock extra rewards (free course guide PDF, one-on-one strategy call with the CEO).

A built-in referral system drives growth. Each lead gets a personal referral link; referring 1 person (plus sending the CEO a WhatsApp message) unlocks the video modules, referring 3 unlocks the free downloadable guide, and referring 10 unlocks a private one-on-one call with the CEO.

### 1.2 Problem and opportunity
- Icreatit Brand needs a large, qualified list of business owners and student entrepreneurs to sell its paid offers to.
- Paid ads alone are expensive. A referral-gated free course turns every lead into a distribution channel.
- The dashboard course keeps leads on-platform long enough to watch, engage and buy, while WhatsApp and Telegram remain the high-engagement channels for the paid communities and follow-up.

### 1.3 Business goal
**2,000 signups in 30 days** from launch, with a growing share converting to the paid offers after engaging with the free video course.

### 1.4 Offers
1. **Masterclass Training for Business Owners** (primary offer)
2. **Business Starter Kit**
3. **Social Media Management Pack**
4. **CAC Business Registration Offer**

The four offers above are introduced inside the paid communities and through the CEO's materials (not sold from the funnel copy). Two other paid items are sold directly in the dashboard (Section 6.7):

| Package | Price | Unlocks |
|---|---|---|
| PDF book | N7,500 | The PDF book download |
| Bundle: PDF + WhatsApp group + Telegram group | N20,500 | PDF book, WhatsApp group access and Telegram group access |

Prices are displayed **only** after the 2nd video is engaged, inside the payment modal (Section 6.7).

---

## 2. Target Users

### 2.1 Primary audience
**Business owners**, including:
- **Adult entrepreneurs** running or starting a business.
- **University students** who run or want to run a business.

### 2.2 Messaging approach
The landing page speaks to the shared identity **"business owner"**, with copy that lets students see themselves in it (for example, "whether you're on campus or running a full-time business"). Neither group should feel like an afterthought.

### 2.3 User needs
- Learn how to find and win business grants.
- Use AI to run and grow their business.
- Market their business on social media.
- Access credible mentorship and a community.

---

## 3. Goals, Non-Goals and Success Metrics

### 3.1 Goals
1. Capture 2,000 verified signups in 30 days.
2. Drive viral growth through referrals.
3. Get engaged leads deep into the free course, then convert a share of them into paying members of the PDF book and the WhatsApp/Telegram communities.
4. Build a segmented lead database (referral tier, WhatsApp opt-in, video engagement, payment status) for follow-up.
5. Position the CEO and Icreatit Brand as credible authorities.

### 3.2 Non-goals (v1)
- Multi-page dashboards or a full learning management system beyond the video modules and guides.
- Google sign-in (not used in v1; email OTP only — builder decision recorded in revision history of the repo).
- A payment upgrade path (do not support paying N7,500 then topping up to the bundle in v1).
- Native mobile apps.
- Emojis anywhere in the funnel (see Section 7).
- Live cohort or start-date logic (not needed for the funnel).

### 3.3 Success metrics

| Metric | Target / Definition |
|---|---|
| Signups (verified) | 2,000 in 30 days (about 67/day average) |
| Landing page to signup conversion | 20% or higher (implies about 10,000 visits) |
| Signup form completion rate (started to submitted) | 70% or higher |
| Signup to WhatsApp step completed | 60% or higher |
| Referral rate | At least 35% of users bring 1 or more valid referrals |
| Average valid referrals per user | 0.8 or higher (this is the viral coefficient to watch) |
| Video module unlocks | % of verified users with WhatsApp click + 1 referral (tracked) |
| Video 2 engaged (50%+ playback) | % of users who unlocked the videos (tracked) |
| Free course guide claimed at 3 referrals | Tracked |
| Users reaching 10 referrals | Tracked |
| Payment conversion | % of video-2-engaged users who pay (primary revenue metric) |
| PDF-only vs bundle split | Tracked from Paystack metadata |
| Email open rate (Brevo) | 40% or higher on transactional/milestone emails |

> Targets other than the 2,000 signups goal are working assumptions and should be adjusted after the first week of data.

---

## 4. User Flow

```
Lead (WhatsApp status, CEO socials, campus ambassadors, paid ads)
   |
   v
Landing Page (?ref=CODE captured if present)
   |
   v
Sign Up / Login (email OTP; name, email, phone, consent)
   |
   v
One-page Dashboard
   |-- Step 1: Click "Send WhatsApp message" (prefilled with first name
   |           and surname; save the CEO's number)
   |-- Step 2: Refer 1 person (valid referral)
   |        |
   |        v
   |   Video modules unlocked --> 2 YouTube videos (about 20 min total)
   |-- 3 valid referrals  --> Free course guide PDF unlocked (under the videos)
   |        |
   |        v
   |   2nd video engaged (50%+ playback)
   |        |
   |        v
   |   Payment button + hidden section appear
   |        |
   |        v
   |   Paystack: PDF (N7,500)  -->  PDF book unlocks
   |        or
   |   Paystack: Bundle (N20,500) --> PDF book + WhatsApp group + Telegram group
   |
   |-- 10 valid referrals --> Book one-on-one strategy call with the CEO
```

### 4.1 Unlock rules summary

| Reward | Requirement |
|---|---|
| Video modules (2 videos) | (a) Clicked the WhatsApp prefilled-message button (message to the CEO) **AND** (b) at least **1 valid referral** |
| Free course guide PDF | **3 valid referrals** |
| PDF book / WhatsApp group / Telegram group | **Verified payment** via Paystack (PDF only: N7,500; bundle: N20,500) — verified server-side, never client-decided |
| One-on-one strategy call with the CEO | **10 valid referrals** (subject to capacity cap, see 6.8) |

---

## 5. Landing Page Requirements

**Route:** `/` on the company subdomain `techhub.icreatitbrandagency.com`.

### 5.1 Sections (in order)

1. **Hero section (no CTA)**
   - Headline (exact copy): **"It's time to build and scale your business with grants and AI"**
   - Subheadline naming the free course: *AI Foundry and Grant Winning Course*.
   - Short trust line (for example, number of people trained, once verified).
   - **No signup button, no CTA, and no signup link in the header.** The header carries the logo only.
   - A subtle animated scroll cue (liquid droplet or arrow) guides the visitor down to the video.
   - Visual treatment: animated liquid background and a headline reveal on load (see Section 7).

2. **Video play section**
   - **YouTube embed** of the teaser/promo video, using the privacy-enhanced domain (`youtube-nocookie.com`).
   - Use a lightweight "facade": show the video thumbnail with a custom play button and load the iframe only when the visitor taps, to protect mobile load speed.
   - No forced autoplay with sound.
   - **CTA 1** directly below the video.
   - This also serves as the "taste of value" before the signup gate.

3. **What you'll learn (the free course)**
   - 2 video module cards (the dashboard course, about 20 minutes total):
     - Module 1: How to win business grants
     - Module 2: Using AI for your business and marketing on social media
   - Short outcomes per module, and a brief explanation of how access works (sign up, send the CEO's WhatsApp message, refer 1 person, watch).
   - No CTA in this section, to keep the flow into the CEO section uninterrupted.

4. **Meet the CEO**
   - Photo, short bio, credibility points, and a personal message or quote.
   - Mention of the one-on-one strategy call reward.
   - **CTA 2** at the end of the section.

5. **About Icreatit Brand Limited**
   - Who the company is, what it does, and who it serves.
   - Brief introduction to the four offers (Masterclass, Business Starter Kit, Social Media Management Pack, CAC Business Registration Offer), with **no prices** on the landing page.

6. **Evidence / accomplishments section**
   - Specific proof: grants won (by the company or clients), people trained, businesses served, testimonials with photos, media features, partnerships.
   - Numbers animate (count-up) when scrolled into view.
   - Only claims that can be substantiated. Use "learn how to apply" language, never guaranteed grant outcomes.
   - **CTA 3** at the end of the section.

7. **How it works (3 steps)**
   - Sign up and send the WhatsApp message to the CEO, refer 1 friend to unlock the videos, watch and choose your level (free guide at 3 referrals; the paid packages appear after the 2nd video). Presented as a level-up path (see Section 7.3).

8. **FAQs**
   - Is it really free? Who is it for? Do I need a registered business? How do I unlock the videos? What counts as a referral? What do I pay for (answer: nothing until the paid packages appear after the 2nd video)? Will I be charged automatically? How do I contact you? Data privacy.
   - Animated accordion.

9. **Final CTA band + footer**
   - **CTA 4**: full-width closing call to action, Privacy Policy, Terms, contact details, social links.

**CTA placement summary:** after the video, after the CEO section, after the evidence section, and in the final band. The hero has none. Suggested CTA label: **"Claim Your Free Access"** (final copy to be approved).

**Sticky mobile CTA:** a bottom action bar appears **only after the hero has scrolled out of view**, so the hero stays CTA-free.

### 5.2 Landing page non-functional requirements
- Mobile-first (most traffic will come from phones, WhatsApp and campus channels). See Section 7.1.
- Fast load (target Largest Contentful Paint under 2.5s on 4G); compress images, lazy-load the video facade and animation libraries.
- Capture `?ref=CODE` from the URL on first visit and persist it (cookie plus localStorage) for at least 30 days.
- Open Graph and Twitter meta tags for clean link previews when shared on WhatsApp.
- Analytics: page views, scroll depth, CTA clicks (tracked per CTA 1 to 4 and the sticky bar), video plays (facade taps and YouTube player events).

---

## 6. Functional Requirements

### 6.1 Authentication (Sign up / Login)

**Route:** `/auth` (or `/signup` and `/login`)

**Signup form fields (all required)**

| # | Field | Input type | Validation |
|---|---|---|---|
| 1 | First Name | text | 2-50 characters, letters, spaces, hyphens, apostrophes |
| 2 | Surname | text | 2-50 characters, same rules |
| 3 | Phone Number | tel, with country code selector (default +234) | Valid international format, stored as E.164, unique |
| 4 | Email Address | email | Valid format, unique, disposable domains blocked, verified by OTP |
| 5 | Gender | select / segmented buttons | Male, Female, Prefer not to say |
| 6 | Short Business Description | textarea with live character counter | 20-300 characters. Helper text: "Describe your business, or the business you plan to start." |
| 7 | Consent | checkbox (unchecked by default) | Must be checked. Text references the Nigeria Data Protection Act (NDPA) and links to the Privacy Policy and Terms |

**Requirements**
- **Mobile form behaviour:** show the form as a two-step flow with a progress indicator and animated step transition. Step 1: First Name, Surname, Phone Number, Email Address. Step 2: Gender, Short Business Description, Consent. All data is submitted together at the end of step 2. Use correct input types and `autocomplete` attributes so phones offer autofill, and show the right keyboard (numeric for phone, email keyboard for email).
- Login method: **email OTP (magic code) only**. No passwords, no Google sign-in.
- **Email verification is mandatory** before a signup counts as valid or a referral is credited.
- Unique constraints on email and phone number.
- On successful signup:
  - Generate a unique, short referral code (6-8 characters).
  - Attach the referrer (if a stored `ref` code exists), blocking self-referral.
  - Store the consent timestamp.
  - Trigger the Brevo "Signup" automation.
- Returning users log in with email OTP and go straight to the dashboard.
- Inline, friendly validation messages (no blocking alerts), with animated field feedback.

### 6.2 Dashboard (single page)

**Route:** `/dashboard` (auth required)

**Layout blocks (top to bottom)**

1. **Welcome header**: user's avatar, user's first name, current **level badge** (see Section 7.3), and a one-line explanation of what to do next.
2. **Unlock checklist**
   - Step 1: "Send the CEO a WhatsApp message" button (status: pending/done) — prefilled with First Name and Surname (Section 6.3).
   - Step 2: "Refer 1 friend" (status: pending/done, progress counted from the referrals list).
   - The "Watch the course" entry shows locked until both are complete.
3. **Referral link card**
   - Unique link, for example `https://techhub.icreatitbrandagency.com/?ref=ABC123`.
   - Copy button and one-tap share buttons (WhatsApp, Telegram, X, Facebook, SMS).
   - **Ready-made share messages** (status caption, short text, longer pitch) with the link inserted (plain text, no emojis).
4. **Video course section**
   - 2 YouTube video modules (about 20 minutes total), privacy-enhanced embeds.
   - Both locked (frosted placeholders with lock copy) until WhatsApp click + 1 valid referral; then publicly watchable by this user.
   - The **IFrame Player API** reports playback; when module 2 passes **about 50% of its duration**, the engagement is recorded (`video2EngagedAt`).
5. **Free course guide reward card (under the videos)**
   - Locked state: "Refer X more friends" (unlocks at 3 valid referrals).
   - Unlocked state: download button (private file; Section 6.6).
6. **Progress tracker**
   - **Liquid-fill progress** to 1 (videos), 3 (free guide), 10 (CEO call), with the current count and the next reward highlighted.
7. **Payment section (appears only after video 2 is engaged)**
   - A prominent **payment button** under the video section (energetic styling per 7.2).
   - A **hidden section that becomes visible** underneath with three items, each with a one-sentence explanation:
     - **PDF book** — gated download button.
     - **WhatsApp group** — gated join button.
     - **Telegram group** — gated join button.
   - Items stay locked (with lock copy) until the payment is verified server-side; the bundle unlocks all three, the PDF-only purchase unlocks just the PDF.
   - Payment flow: Section 6.7.
8. **Rewards**
   - **CEO strategy call:** locked until 10 referrals, then a booking button (see 6.8).
9. **My referrals list**
   - Table/list: referred person's name (masked, for example "Chidi O."), date joined, status (Verified / Pending).
10. **Avatar**
    - User picks from a preset set (or an initials-based generated avatar). No upload flow in v1.
    - Shown in the welcome header; selection stored server-side.
11. **Footer**: support contact, logout.

**Dashboard requirements**
- Real-time updates (Convex reactive queries): when a friend signs up, the count changes without a refresh.
- Milestone celebration animation when a level is reached (liquid burst, badge reveal, optional haptic vibration where supported).
- Live toast when a friend joins through the user's link (for example, "Chidi O. just joined your network").
- Mobile-first design with a sticky bottom action area (see Section 7.1).

### 6.3 WhatsApp step

- Button opens a `https://wa.me/<CEO_NUMBER>?text=<prefilled message>` link in a new tab.
- **Purpose:** the message goes to the **CEO's WhatsApp number**. Its practical goal is that the user saves the CEO's number and identifies themselves.
- Prefilled message must contain the user's **First Name and Surname**; example: *"Hi Icreatit! I just joined the AI Foundry and Grant Winning Course. My name is {FirstName} {Surname}, my email is {Email}."* (final copy to be approved).
- The click is recorded in Convex (`whatsappClickedAt`), and the step is marked complete on click.
- **Limitation:** the platform cannot confirm the message was actually sent. This is accepted for v1. The team handling the CEO's WhatsApp can match incoming messages to leads (name/email in message) for follow-up.
- The CEO's WhatsApp number is stored in the settings table so it can be changed without code changes.

### 6.4 Referral system

**Referral link and capture**
- Each user has a unique `referralCode`.
- Visiting any page with `?ref=CODE` stores the code. At signup, the code is validated and linked to the referrer.

**Definition of a valid referral (default)**
A referral counts when the referred user:
1. Signed up through the referrer's link,
2. **Verified their email**, and
3. Provided a unique phone number.

**Anti-abuse rules**
- No self-referral (same email, phone or referral code).
- Block disposable email domains.
- Rate-limit signups per IP and per device fingerprint (soft flag, not hard block, to avoid blocking shared campus Wi-Fi).
- Flag suspicious patterns (many signups from the same IP in a short window, sequential email patterns) for admin review.
- Admin can mark a referral as invalid, which recalculates the referrer's count. Unlocks tied to referral counts (videos, free guide, CEO call) re-lock if the count falls below the threshold. Payment unlocks are never affected by later referral invalidation.

**Counting and milestones**
- `validReferralCount` is updated whenever a referral becomes valid.
- Milestones: **1, 3, 10**. Each milestone fires once only (idempotent) and triggers the matching Brevo event.

> **Open decision:** a stricter definition (referred user must also click the WhatsApp step) reduces fake referrals but slows referrers down. Default for v1 is email verification plus phone. Review after week 1.

### 6.5 Video modules (the free course)

- 2 YouTube videos (about 20 minutes total): Module 1 — how to win business grants; Module 2 — using AI for business and social-media marketing.
- Embeds use `youtube-nocookie.com` privacy-enhanced domain.
- **Unlock condition:** `whatsappClickedAt` is set **AND** `validReferralCount >= 1`. Enforced server-side; the client only reflects state.
- Locked state: frosted placeholders with the unlock requirements listed; no video content is loaded before unlock (the script/iframe is injected only when unlocked — strong gate, not just visual hiding).
- **Engagement tracking:** the YouTube IFrame Player API reports playback progress. When the 2nd video passes roughly **50% of its duration**, `video2EngagedAt` is recorded (once) and the payment section appears. Module 1 playback start/progress events are tracked for analytics.
- Re-lock rule: if referrals fall below 1 later (invalidation), the videos lock again.

### 6.6 Free course guide PDF (reward at 3 referrals)

- Unlocks at **3 valid referrals**.
- Shown as a reward card **under the video section**; locked state says "Refer X more friends".
- Hosted as a private file (Convex file storage or a signed URL). Never exposed as a public link on the page before unlock.
- Download event is tracked.

### 6.7 Paid packages and payment (Paystack)

**Placement (trigger):** the payment button and the hidden paid section appear **only after `video2EngagedAt` is set** (2nd video engaged at about 50% playback).

**Packages**
- **PDF only:** N7,500 — unlocks the PDF book download.
- **Bundle:** N20,500 — unlocks the PDF book, the WhatsApp group and the Telegram group.
- **No upgrade path in v1:** a user who bought PDF-only cannot later convert to the bundle (they would just make a separate full bundle purchase at the CEO team's discretion).

**Flow**
1. User taps the payment button; a small modal shows the 2 choices with prices.
2. Choice initializes a Convex action that creates a **Paystack transaction** (initialize endpoint) with the unique reference and plan metadata; user is redirected to the Paystack checkout (popup or redirect).
3. On success, Paystack calls the **webhook**; the Convex http action **verifies the signature and the amount**, then marks the payment `confirmed` and sets the unlock timestamps server-side. The client reflects this reactively; the unlock decision is never client-side.
4. Fallback for ops: manual confirmation mutation (runnable from the Convex dashboard) for failed-webhook or manual bank-transfer edge cases, protected by the ops secret.
5. Payment events (`payment_initialized`, `payment_confirmed`) and a receipt/confirmation email (Section 6.9) are recorded.

**Paid items in the hidden section**
- **PDF book:** gated download from private file storage (signed URL) after payment.
- **WhatsApp group:** gated join button (link from settings, revealed post-payment). A single-use/group-admin strategy from the WhatsApp angle is manual; leakage risk is accepted for v1 (documented in Risks).
- **Telegram group:** gated join button; prefer single-use invite links via bot (Section 6.9 integration), with a static link fallback.
- Each item shows a one-sentence explanation and its locked/unlocked state.

### 6.8 CEO one-on-one strategy call

- Unlocks at **10 valid referrals** (unchanged from v1.2).
- Booking via an embedded scheduler (Cal.com or Calendly), revealed only to unlocked users. The scheduling link is not public.
- **Capacity control (required):** limit the number of call slots, for example 15-minute calls, a maximum number per week, first come first served. Dashboard shows "Slots available" or "Fully booked, join the waitlist."
- Confirmation and reminder emails via the scheduler or Brevo.
- **CEO email notification (required):** whenever a user books a call, the CEO receives an email notification (via Brevo from a Convex action) with the user's name, email, referral stats and booking time. Reschedules and cancellations trigger a matching notification.

> **Open decision:** confirm the maximum number of calls the CEO can take per week, and the call length. If 10-referral users exceed capacity, the waitlist keeps the promise honest.

### 6.9 Email automations (Brevo)

Convex actions sync contacts and trigger events through the Brevo API. API keys are stored in Convex environment variables.

| Trigger | Email | Purpose |
|---|---|---|
| **Signup** (email verified) | Welcome email | Explain the 2 unlock steps, link to dashboard, share link |
| **Referral made** (each new valid referral) | "Someone joined with your link" | Show progress to next milestone; encourage more sharing |
| **Videos unlocked** (WhatsApp click + 1 referral) | Videos unlocked | Invite to watch the 2 modules; mention the guide at 3 referrals |
| **3 referrals reached** | Free course guide unlocked | Delivers the guide link, announces the journey from here |
| **10 referrals reached** | CEO call unlocked | Booking link, congratulations |
| **Payment confirmed** | Purchase receipt/access | Confirms what was unlocked (PDF book / bundle) and delivers group-access guidance |
| **Nudge: no WhatsApp step after 24h** *(recommended)* | Reminder | Increases step completion |
| **Nudge: no referral after 48h** *(recommended)* | Reminder with share messages | Increases referral rate |
| **Nudge: watched nothing after 72h despite video access** *(optional)* | Reminder | Revives video engagement |
| **Call booked** (CEO, internal) | New call booking alert | Tells the CEO who booked (name, email, referral stats, booking time); also fires on reschedules and cancellations |

**Brevo contact attributes:** first name, surname, email, phone, gender, short business description, referral code, referred by, referral count, WhatsApp clicked (Y/N), videos unlocked (Y/N), video 2 engaged (Y/N), payment made (plan), signup date, unsubscribed flag.

All marketing emails include an unsubscribe link and the company address.

### 6.10 Operations and reporting (lightweight, v1)

There is **no admin dashboard or admin UI in v1**. Day-to-day operations run directly against the Convex deployment through the Convex dashboard and small one-off scripts:

- **Funnel metrics:** saved queries in the Convex dashboard for total/verified/daily signups and funnel counts (signups, WhatsApp clicks, video unlocks, video-2-engaged, 3-referral users, payments, 10-referral users), plus a top referrers query.
- **Referral invalidation:** a Convex mutation (runnable from the Convex dashboard) that marks a referral invalid, recalculates the referrer's `validReferralCount` and re-locks rewards if the count falls below the threshold (video unlock, free guide, CEO call).
- **Payment tools:** manual confirmation of a payment (edge cases) via ops-secret mutation; a query listing payments by status for reconciliation against the Paystack dashboard.
- **Lead export:** a Convex action/function that exports all leads (and their referral stats) as CSV for WhatsApp follow-up and sales.
- **Bookings:** visible in the `callBookings` table and through the scheduler's own dashboard; the CEO is notified by email for every booking.

---

## 7. Experience Design: Mobile-First, Motion and Gamification

This section applies to the **entire funnel** (landing page, signup, dashboard, emails).

### 7.1 Mobile-first requirements
- Design and build at **360px width first**, then scale up to tablet and desktop. Desktop is an enhancement, not the baseline.
- Single-column layouts, large type, generous spacing. Touch targets at least **44 x 44px**.
- Primary actions sit in the **thumb zone**: sticky bottom action bar on the landing page (after the hero) and on the dashboard.
- Forms use native mobile inputs, correct keyboards, autofill and a stepwise layout (see 6.1).
- Test in WhatsApp, Instagram and Facebook in-app browsers, Safari iOS, and Chrome on low-end and mid-range Android devices.
- Respect safe-area insets (notches and gesture bars).
- Share buttons use the native share sheet (`navigator.share`) where available, with copy-link fallback.

### 7.2 Motion system (JavaScript transitions and liquid flows)

**Liquid flow elements**
- **Hero background:** slow-moving liquid blobs (SVG goo filter or morphing paths) in the brand colours.
- **Section dividers:** animated liquid wave edges that morph as the visitor scrolls between sections.
- **Buttons:** liquid fill on press and hover, with a ripple that flows out from the touch point.
- **Progress indicators:** vessel or bar that fills with liquid, with a gentle surface wave.
- **Loading and success states:** liquid droplet loaders, liquid burst on success.
- **Payment button:** intentionally prominent ("flashy") — attention-grabbing liquid styling, appearing with a gentle reveal under the videos; still respects restraint rules (no ransom-note effects, no flashing).

**JavaScript transitions**
- Scroll-triggered reveals (fade, rise, stagger) for every section and card.
- Count-up animations for evidence numbers and dashboard counters.
- Animated route transitions between landing page, signup and dashboard.
- Step transitions inside the signup form.
- Animated accordion for FAQs.
- Micro-interactions on copy-link, share and unlock buttons.
- Payment modal open/close transition.

**Implementation guidance**
- Recommended: **GSAP with ScrollTrigger** for scroll-driven animation and SVG morphing, plus SVG filters for liquid effects. Alternative: Framer Motion if the stack is React-heavy. Choose one primary library to control bundle size.
- Animate `transform` and `opacity` wherever possible to maintain 60fps.
- Lazy-load animation code after first paint; the hero text must render before any animation library loads.
- Pause or destroy animations that are off-screen.
- **Performance budget:** animation code adds no more than about 80KB gzipped to the landing route. Large blur/goo filters are expensive on low-end Android, so limit their area and provide a static gradient fallback.
- **Accessibility:** honour `prefers-reduced-motion` by replacing motion with simple fades or static states. No content may depend on animation to be readable.

### 7.3 Gamification layer

The funnel presents the unlock path as a **level-up journey**. Levels are tied to the existing unlock rules (no new rules are introduced).

| Level | Name | How it is reached | Reward |
|---|---|---|---|
| 1 | **Explorer** | Signed up and verified email | Dashboard access |
| 2 | **Connector** | WhatsApp step done and 1 valid referral | Video modules unlocked |
| 3 | **Builder** | 3 valid referrals | Free course guide PDF unlocked |
| 4 | **Scaler** | 10 valid referrals | CEO strategy call booking unlocked |

*(Level names are suggestions and can be changed.)*

**Gamified elements**
- **Quest checklist** with animated check marks for each unlock step.
- **Liquid-fill progress** towards the next level, with the remaining requirement stated plainly ("2 more referrals to unlock the free course guide").
- **Level badges** shown on the dashboard header, revealed with an animation on unlock.
- **Locked reward cards** shown in a frosted, liquid-sealed state that "melts" open when unlocked.
- **Milestone celebration** at each level: liquid burst, badge reveal, optional haptic feedback. Sound is off by default.
- **Live activity toasts** when friends join.
- **Energetic microcopy** (short, action-led, motivating) across buttons, empty states and emails.

### 7.4 Visual language rules
- **No emojis anywhere in the funnel.** This covers landing page, dashboard, form messages, toasts, share messages, the WhatsApp prefilled message, payment modal copy, and all Brevo email content. Use custom SVG icons, illustrations, badges and typographic emphasis instead.
- Consistent icon set (custom or a single icon library) and one illustration style.
- Brand colours and logo from Icreatit Brand assets; typography with a strong display face for headlines and a highly readable body face.
- Sufficient colour contrast against animated backgrounds (text sits on solid or overlay layers, never directly on moving liquid).

---

## 8. Data Model (Convex)

### `users`
| Field | Type | Notes |
|---|---|---|
| `_id` | Id | |
| `firstName` | string | |
| `surname` | string | |
| `email` | string | unique, verified |
| `phone` | string | unique, E.164 format |
| `gender` | "male", "female" or "preferNotToSay" | |
| `businessDescription` | string | 20-300 characters |
| `avatarId` | string | preset avatar id (from `AVATAR_PRESETS` table) or generated-initials variant |
| `referralCode` | string | unique, indexed |
| `referredBy` | Id (users) or null | |
| `emailVerifiedAt` | number | |
| `whatsappClickedAt` | number or null | |
| `validReferralCount` | number | denormalized, default 0 |
| `videoUnlockedAt` | number or null | WhatsApp click + 1 valid referral |
| `video1StartedAt` | number or null | analytics only |
| `video2EngagedAt` | number or null | about 50% playback recorded once |
| `pdfUnlockedAt` | number or null | free course guide, at 3 valid referrals |
| `paidPdfUnlockedAt` | number or null | payment (PDF-only or bundle) verified |
| `whatsappGroupUnlockedAt` | number or null | bundle payment verified |
| `telegramGroupUnlockedAt` | number or null | bundle payment verified |
| `ceoCallUnlockedAt` | number or null | 10 valid referrals |
| `consentAt` | number | NDPA consent timestamp |
| `role` | "user" or "admin" | |
| `flagged` | boolean | |
| `createdAt` | number | |

### `referrals`
| Field | Type | Notes |
|---|---|---|
| `referrerId` | Id (users) | indexed |
| `referredUserId` | Id (users) | |
| `status` | "pending", "valid", "invalid" | |
| `validatedAt` | number or null | |
| `ipHash` | string | for abuse detection (hashed) |

### `payments`
| Field | Type | Notes |
|---|---|---|
| `userId` | Id (users) | |
| `plan` | "pdf" or "bundle" | |
| `amountNaira` | 7500 or 20500 | stored in settings; copy recorded at init for audit |
| `provider` | "paystack" | v1 |
| `reference` | string | unique Paystack reference, indexed |
| `status` | "initialized", "confirmed", "failed" | |
| `initializedAt` | number | |
| `confirmedAt` | number or null | server-verified (webhook signature + amount) |
| `meta` | object | Paystack payload summary for reconciliation |

### `events` (funnel analytics)
`userId`, `type` (signup, whatsapp_click, video_unlock, video1_started, video2_engaged, guide_download, paid_pdf_download, payment_initialized, payment_confirmed, whatsapp_group_joined, telegram_join_clicked, ceo_booking_click, milestone_1/3/10, referral_invalidated), `meta`, `createdAt`.

### `callBookings`
`userId`, `scheduledFor`, `status` (booked, completed, cancelled), `createdAt`.

### `settings`
`ceoWhatsappNumber`, `whatsappMessageTemplate`, `paidWhatsappGroupLink`, `paidTelegramGroupLink`, `paidTelegramInviteMode` ("bot" or "static"), `video1YoutubeUrl`, `video2YoutubeUrl`, `pdfPriceNaira` (7500), `bundlePriceNaira` (20500), `maxCeoCallsPerWeek`, `launchDate`. Guide and book PDFs live as Convex file-storage documents (ids seeded by ops).

---

## 9. Technical Architecture

| Layer | Choice |
|---|---|
| Frontend | React-based framework (Next.js or Vite + React), Tailwind CSS |
| Backend / database | **Convex** (queries, mutations, actions, file storage, scheduled functions) |
| Auth | Convex Auth (email OTP) |
| Hosting | **Vercel** (frontend), **GitHub** (source control, CI to Vercel) |
| Domain | Company subdomain via the company's DNS (CNAME to Vercel) |
| Email | **Brevo** (API from Convex actions; automations by event) |
| Payments | **Paystack** (initialize + webhook; server-side verification of signature and amount) |
| Community (paid) | WhatsApp group link + Telegram (group; bot for single-use invites) |
| Messaging | WhatsApp click-to-chat (`wa.me`) to the CEO |
| Scheduling | Cal.com or Calendly embed |
| Analytics | Plausible or GA4 + Convex `events` |
| Motion | GSAP + ScrollTrigger (or Framer Motion), SVG filters and path morphing, lazy-loaded |
| Video (landing page) | YouTube embed (privacy-enhanced domain, tap-to-load facade) |
| Video (dashboard) | YouTube IFrame Player API embeds (`youtube-nocookie`), injected only when unlocked |
| Build tooling | OpenCode (AI-assisted development) |

**Key technical notes**
- All secrets (Brevo API key, Paystack secret key, Telegram bot token) live in Convex/Vercel environment variables, never in the client.
- Unlock logic is enforced on the **server** (Convex mutations/queries), never only in the UI. Payment unlocks are set only after Paystack webhook verification.
- Milestone processing is idempotent so emails are never sent twice.
- Paystack webhook endpoint must be registered on the Convex http router; invalid/failed payments never unlock anything.
- Indexes needed: `users.by_email`, `users.by_phone`, `users.by_referralCode`, `referrals.by_referrer`, `payments.by_user`, `payments.by_reference`, `payments.by_status`.
- Environments: `dev` and `prod` Convex deployments; Vercel preview deployments from GitHub branches.

---

## 10. Compliance, Legal and Trust

- **NDPA compliance (Nigeria):** explicit consent checkbox, Privacy Policy, clear purpose of data use, ability to request deletion/unsubscribe.
- **Claims:** do not guarantee grant wins or income results. Use "learn how to apply" language and add a short disclaimer ("Results vary").
- **Evidence section:** only verifiable accomplishments, and use real testimonials with permission.
- **Payments:** Paystack handles payment data (the funnel never stores card data). Clear pricing only at the payment step; the free course stays genuinely free. Refund/chargeback handling is out of scope for v1 (manual, by the CEO's team).
- **WhatsApp:** only message people who opted in (the prefilled message is the opt-in). No bulk unsolicited messaging.
- **Email:** CAN-SPAM-style compliance (unsubscribe link, sender identity) through Brevo.
- **Terms:** include referral program terms (valid referral definition, right to invalidate fraudulent referrals, call availability subject to capacity), and purchase terms (what payment unlocks, no upgrade path v1, digital delivery).

---

## 11. Non-Functional Requirements

- **Performance:** pages interactive in under 3s on mid-range Android phones on 4G.
- **Responsiveness:** primary design target is mobile (360px width and up).
- **Reliability:** funnel must handle traffic spikes from campaign pushes (Convex and Vercel scale automatically; test with simulated load).
- **Security:** server-side authorization, rate limiting on signup and OTP, hashed IP storage, no public file URLs for gated assets, Paystack webhook signature verification, ops-secret-protected manual payment tools.
- **Accessibility:** readable contrast, keyboard navigable forms, alt text.
- **Browser support:** latest Chrome, Safari, Firefox, and Android WebView/in-app browsers (WhatsApp and Instagram in-app browsers matter here).

---

## 12. Launch Plan and Milestones

| Phase | Scope | Suggested timing |
|---|---|---|
| **0. Prep** | Confirm subdomain, CEO's WhatsApp number + approved prefilled copy, paid WhatsApp/Telegram groups created, course videos uploaded to YouTube, guide/book PDFs ready, CEO photo/video, evidence assets, Brevo account, **Paystack account keys** | Week 0 |
| **1. Core build** | Auth, Convex schema, referral engine, dashboard, video course, unlock logic, payments | Week 1 |
| **2. Landing page** | All sections, tracking, referral capture, FAQs, motion and liquid system, gamification elements | Week 1-2 |
| **3. Integrations** | Brevo automations, Paystack webhook hardening, Telegram bot invites, PDF storage, scheduler | Week 2 |
| **4. QA** | End-to-end tests of every unlock and payment path, abuse testing, mobile, low-end Android performance and in-app browser testing, email testing | Week 2-3 |
| **5. Soft launch** | 50-100 users (team, friends, ambassadors); fix issues | Week 3 |
| **6. Public launch** | Full promotion: CEO socials, WhatsApp statuses, campus ambassadors, ads | Week 3-4 |
| **7. Optimize** | Review funnel metrics weekly; adjust copy, referral rules, nudges, pricing presentation | Ongoing |

**Acquisition channels (all planned):** CEO and company social media, WhatsApp statuses, campus ambassadors, paid ads. Ambassadors can use their own referral links and be tracked on the leaderboard.

---

## 13. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| High drop-off at the referral gate (no content before gate) | Lower signup-to-video rate | Strong teaser video on the landing page; reminder emails; ready-made share messages; clear progress UI |
| Fake referrals / gaming | Polluted list, devalued rewards | Email verification, phone uniqueness, disposable email block, flags, admin invalidation |
| Video unlock/engagement spoofed from the client | Reward claimed without watching | Playback tracked via IFrame Player API events; server caps engagement events; acceptable residual cheating for v1, monitor event anomalies |
| Paid group link leakage | Gate bypass for the N20,500 bundle | Prefer single-use Telegram invites via bot; WhatsApp group moderated, members vetted manually; rotate links when leaked |
| Payment not received (webhook miss) | Paid user not unlocked | Verify webhook signatures; ops manual-confirmation tool; reconcile against Paystack dashboard |
| Payment-initiated but abandoned | Gap funnel metric | Track `payment_initialized` vs `payment_confirmed`; follow-up email |
| CEO call demand exceeds capacity | Broken promise | Weekly cap, waitlist, short call length |
| CEO's WhatsApp number overwhelmed | Slow replies, bad experience | Existing handler plus saved replies; consider WhatsApp Business labels/auto-replies |
| Cannot verify the WhatsApp message was actually sent | Fake step completion | Accepted limitation; CEO's team matches incoming messages; monitor |
| Unverifiable claims in evidence section | Trust and legal risk | Publish only documented achievements |
| Single builder (you) | Schedule risk | Keep v1 scope tight; defer nice-to-haves |
| Brevo sending limits (free tier) | Emails delayed at 2,000+ contacts | Check plan limits and upgrade before launch |
| Heavy animation slows or janks low-end phones | Higher bounce, lower signups | Performance budget, lazy loading, static fallbacks, reduced-motion support, device testing |
| No CTA in the hero | Fewer early signups from visitors ready to join immediately | Place CTA 1 directly after the video, sticky bar after the hero; compare CTA click-through and revisit if needed |
| Four-plus form fields on mobile | Form abandonment | Two-step form, autofill, inline validation; monitor completion rate |

---

## 14. Out of Scope for v1 / Future Ideas

- Monthly leaderboard with prizes for top referrers.
- Course progress tracking and completion certificates.
- Payment upgrade path (PDF-only top-up to bundle).
- Card-data storage or recurring billing.
- Additional tiers (for example, 25 referrals for a bonus).
- WhatsApp Business API automation.
- Ambassador dashboard with commissions.

---

## 15. Open Questions and Assumptions

**Open questions**
1. ~~Final subdomain name~~ **Confirmed: `techhub.icreatitbrandagency.com`.**
2. Exact CEO WhatsApp number and approved prefilled message copy?
3. Weekly CEO call capacity and call length?
4. Valid referral definition: keep default (verified email + phone) or require the WhatsApp step too? (New flow uses send-message + 1 referral for the videos; the referral *counting* definition stays the default.)
5. ~~Will the Telegram group use a bot for single-use invites?~~ **Keep recommended bot approach** for the paid Telegram group.
6. Which scheduler: Cal.com or Calendly?
7. Which Brevo plan, and are sending limits sufficient for 2,000+ contacts plus automations?
8. Which accomplishments, testimonials and media features will be featured in the evidence section (list and permissions)?
9. Do the paid WhatsApp and Telegram groups need moderation caps (large groups supported but check capacity)?
10. ~~Final gender options~~ **Confirmed: Male, Female, Prefer not to say.** Optional or required?
11. YouTube video links for the landing teaser and the 2 dashboard modules (privacy-enhanced IDs)?
12. Final level names (Explorer, Connector, Builder, Scaler) and brand colours/typefaces for the motion design?
13. Final approved copy for the ready-made share messages, the CEO prefilled WhatsApp message, and the paid-item one-sentence explanations?
14. Paystack public/secret keys and bank account confirmation for the funneled receipts?
15. PDF book and free course guide final files and titles?

**Assumptions**
- The 2 course videos (about 20 minutes total) are already recorded and will be uploaded to YouTube (privacy-enhanced embeds on the dashboard).
- A team member already manages the CEO's WhatsApp number and will moderate the paid groups.
- Logo, brand colours and the CEO's photo/video are available.
- Paystack is the single payment processor; prices are N7,500 (PDF) and N20,500 (bundle), fixed at launch.
- The free course remains genuinely free; payment is only for the added PDF book and community access.
- No emojis are used in any funnel content.
- The 2,000-signup target relies on traffic of roughly 10,000 visits at a 20% conversion rate, plus referral growth.

---

## 16. Acceptance Criteria (Summary)

- [ ] The hero displays the exact headline "It's time to build and scale your business with grants and AI" and contains **no CTA**.
- [ ] A visitor can view the full landing page and reach signup from every CTA (after the video, after the CEO section, after the evidence section, final band, and the sticky bar once the hero is out of view).
- [ ] The video section loads a YouTube embed via a tap-to-load facade.
- [ ] `?ref=CODE` is captured and attributed correctly at signup.
- [ ] The signup form collects First Name, Surname, Phone Number, Email Address, Gender, Short Business Description and Consent, all required, with validation.
- [ ] A user can sign up with email OTP only and must verify email.
- [ ] Each user gets a unique referral link and sees a live referrals list.
- [ ] The WhatsApp button opens the prefilled message (First Name + Surname included) to the CEO's number and records the click.
- [ ] The video modules unlock **only** after the WhatsApp click **and** 1 valid referral (enforced server-side; locked state loads no video content).
- [ ] When the 2nd video passes about 50% playback, `video2EngagedAt` is recorded once and the payment button + hidden paid section appear.
- [ ] The hidden paid section shows the PDF book, WhatsApp group and Telegram group, each with a one-sentence explanation, all locked.
- [ ] The payment modal offers PDF only (N7,500) and the bundle (N20,500); nothing unlocks until Paystack verifies payment server-side (signature + amount).
- [ ] PDF-only purchase unlocks only the PDF book; bundle unlocks PDF book + both groups. No upgrade path.
- [ ] At 3 valid referrals, the free course guide PDF (a reward card under the videos) unlocks and downloads.
- [ ] At 10 valid referrals, the CEO booking option unlocks, within capacity limits.
- [ ] Brevo emails fire correctly and once only for signup, each referral, videos unlocked, 3 referrals, 10 referrals and payment confirmed.
- [ ] Self-referrals and duplicate emails/phones are rejected.
- [ ] Funnel metrics are queryable; a referral can be invalidated (recalculating the referrer's count and re-locking free rewards, never paid unlocks) and leads exported as CSV via the Convex dashboard or scripts, with no admin UI required.
- [ ] The CEO is notified by email whenever a call is booked (and on reschedule/cancellation).
- [ ] The user can pick an avatar (preset/initials) shown in the dashboard header.
- [ ] The site works smoothly on mobile and in WhatsApp/Instagram in-app browsers.
- [ ] Scroll transitions, route transitions and liquid flow effects run smoothly on mid-range Android devices and fall back gracefully on low-end ones.
- [ ] `prefers-reduced-motion` disables non-essential motion.
- [ ] Level progression and milestone animations trigger correctly at 1, 3 and 10 valid referrals.
- [ ] No emojis appear in the UI, share messages, WhatsApp prefilled message, payment modal or Brevo emails.
- [ ] Consent and Privacy Policy are in place before launch.
