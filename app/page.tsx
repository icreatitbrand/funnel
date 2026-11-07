import { Cta } from "@/components/landing/Cta";
import { CountUp } from "@/components/landing/CountUp";
import { Faq } from "@/components/landing/Faq";
import { LandingTracker } from "@/components/landing/LandingTracker";
import { Reveal } from "@/components/landing/Reveal";
import { StickyCta } from "@/components/landing/StickyCta";
import { VideoFacade } from "@/components/landing/VideoFacade";
import Image from "next/image";
import {
  ABOUT,
  ACCESS_EXPLAINER,
  CEO,
  CTA_LABEL,
  CTA_TRACK_ID,
  EVIDENCE,
  EVIDENCE_NOTE,
  FOOTER,
  HERO,
  HOW_IT_WORKS,
  MODULES,
  VIDEO_SECTION,
} from "@/lib/landing";

/*
  Landing page per PRD Section 5. Sections in exact order; CTA redistribution
  exactly: none in hero, CTA 1 under the video, CTA 2 after the CEO section,
  CTA 3 after evidence, CTA 4 in the final band. Built 360px-first.
  Content lives in lib/landing.ts (PLACEHOLDER marks need client assets).
*/

export default function HomePage() {
  return (
    <main className="landing">
      <LandingTracker />

      {/* ------------------------------ 1. Hero ------------------------------ */}
      <section className="hero" id="hero" aria-label="Introduction">
        <div className="hero-blobs" aria-hidden="true">
          <span className="blob blob-a" />
          <span className="blob blob-b" />
          <span className="blob blob-c" />
          <span className="hero-overlay" />
        </div>
        <header className="hero-header" aria-label="Site owner">
          <span className="logo-plate">
            <Image
              src="/brand/logo.png"
              alt="Icreatit Brand"
              width={249}
              height={38}
              priority
            />
          </span>
        </header>
        <div className="hero-copy">
          <h1 className="hero-headline">{HERO.headline}</h1>
          <p className="hero-sub">{HERO.subheadline}</p>
          <p className="hero-trust">{HERO.trustLine}</p>
        </div>
        <a
          href="#video"
          className="scroll-cue"
          aria-label="Scroll down to the video"
        >
          <span className="scroll-cue-drop" aria-hidden="true" />
          <span className="visually-hidden">Scroll</span>
        </a>
        <div className="wave-divider" aria-hidden="true">
          <svg viewBox="0 0 360 32" preserveAspectRatio="none">
            <path d="M0 22c30-10 60-14 90-8s60 16 90 12 60-18 90-14 60 16 90 10v10H0Z" fill="currentColor" />
          </svg>
        </div>
      </section>

      {/* --------------------------- 2. Video + CTA1 ------------------------- */}
      <section className="section section-video" id="video" aria-label="Course teaser video">
        <Reveal className="section-inner">
          <p className="kicker">Before you sign up</p>
          <h2>Watch this video 👇</h2>
          <VideoFacade
            youtubeUrl={VIDEO_SECTION.teaserYoutubeUrl}
            trackId="landing_video_tap"
          />
          <p className="section-note">{VIDEO_SECTION.intro}</p>
          <div className="cta-row">
            <Cta variant="primary" trackId={CTA_TRACK_ID.video}>
              {CTA_LABEL}
            </Cta>
          </div>
        </Reveal>
      </section>

      {/* --------------- 3. What you'll learn (no CTA, PRD 5.1.3) ------------- */}
      <section className="section section-alt section-learn" id="learn" aria-label="What you will learn">
        <Reveal className="section-inner">
          <p className="kicker">The free course</p>
          <h2>What you will learn</h2>
          <div className="module-cards">
            {MODULES.map((m, i) => (
              <Reveal className="module-card" key={m.id} delay={i * 90}>
                <div className="module-media" aria-hidden="true">
                  <svg viewBox="0 0 48 48" width="44" height="44">
                    <rect x="4" y="8" width="40" height="26" rx="4" fill="none" stroke="var(--color-brand)" strokeWidth="2.5" />
                    <path d="M20 16l10 5-10 5z" fill="var(--color-brand-accent)" />
                    <path d="M14 40h20M24 34v6" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="module-kicker">{m.kicker}</p>
                <h3>{m.title}</h3>
                <ul className="module-outcomes">
                  {m.outcomes.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
          <p className="section-note">{ACCESS_EXPLAINER}</p>
        </Reveal>
        <div className="wave-divider wave-flip" aria-hidden="true">
          <svg viewBox="0 0 360 32" preserveAspectRatio="none">
            <path d="M0 10c40 14 70 16 110 8s70-16 110-8 60 12 90 6 40-8 50-6v14H0Z" fill="currentColor" />
          </svg>
        </div>
      </section>

      {/* ------------------------- 4. Meet the CEO --------------------------- */}
      <section className="section section-ceo" id="ceo" aria-label="Meet the CEO">
        <Reveal className="section-inner">
          <p className="kicker">Meet your teacher</p>
          <h2>Meet the CEO</h2>
          <div className="ceo-card">
            <div className="ceo-photo">
              <Image
                src="/brand/ceo.jpg"
                alt={`${CEO.name}, ${CEO.title}`}
                width={336}
                height={420}
                sizes="(min-width: 640px) 180px, 96px"
              />
            </div>
            <div>
              <p className="ceo-name">{CEO.name}</p>
              <p className="ceo-title">{CEO.title}</p>
              <p className="ceo-bio">{CEO.bio}</p>
              <blockquote className="ceo-quote">{CEO.quote}</blockquote>
              <p className="ceo-call-line">
                Every learner who reaches 10 referrals gets a one-on-one
                strategy call with him.
              </p>
            </div>
          </div>
          <div className="cta-row">
            <Cta variant="primary" trackId={CTA_TRACK_ID.ceo}>
              {CTA_LABEL}
            </Cta>
          </div>
        </Reveal>
      </section>

      {/* ------------------- 5. About + four offers (no CTA) ------------------ */}
      <section className="section section-alt section-about" id="about" aria-label="About Icreatit Brand Limited">
        <Reveal className="section-inner">
          <p className="kicker">Who we are</p>
          <h2>About Icreatit Brand Limited</h2>
          <p className="about-lead">{ABOUT.lead}</p>
          <p className="section-note">{ABOUT.body}</p>
          <div className="offer-grid">
            {ABOUT.offers.map((o, i) => (
              <Reveal className="offer-card" key={o.id} delay={i * 80}>
                <span className="offer-index">{String(i + 1).padStart(2, "0")}</span>
                <h3>{o.title}</h3>
                <p>{o.blurb}</p>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ------------------ 6. Evidence / count-ups + CTA3 ------------------- */}
      <section className="section section-evidence" id="evidence" aria-label="Evidence">
        <Reveal className="section-inner">
          <p className="kicker">Receipts</p>
          <h2>Our track record</h2>
          <div className="evidence-grid">
            {EVIDENCE.map((e) => (
              <div className="evidence-cell" key={e.label}>
                <CountUp end={e.end} suffix={e.suffix} />
                <p>{e.label}</p>
              </div>
            ))}
          </div>
          <p className="section-note">{EVIDENCE_NOTE}</p>
          <div className="cta-row">
            <Cta variant="accent" trackId={CTA_TRACK_ID.evidence}>
              {CTA_LABEL}
            </Cta>
          </div>
        </Reveal>
      </section>

      {/* ----------------- 7. How it works (no CTA, PRD 5.1.7) --------------- */}
      <section className="section section-alt section-how" id="how" aria-label="How it works">
        <Reveal className="section-inner">
          <p className="kicker">The level-up path</p>
          <h2>How it works</h2>
          <ol className="how-steps">
            {HOW_IT_WORKS.map((s, i) => (
              <Reveal className="how-step" key={s.step} delay={i * 90}>
                <span className="how-num" aria-hidden="true">{s.step}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </Reveal>
        <div className="wave-divider wave-flip" aria-hidden="true">
          <svg viewBox="0 0 360 32" preserveAspectRatio="none">
            <path d="M0 12c50 10 80 12 120 6s80-12 120-6 70 10 120 8v12H0Z" fill="currentColor" />
          </svg>
        </div>
      </section>

      {/* --------------------------- 8. FAQ (no CTA) ------------------------- */}
      <section className="section section-faq" id="faq" aria-label="Frequently asked questions">
        <Reveal className="section-inner">
          <p className="kicker">Questions</p>
          <h2>Frequently asked questions</h2>
          <Faq />
        </Reveal>
      </section>

      {/* -------------------- 9. Final CTA band + footer --------------------- */}
      <section className="final-band" id="start" aria-label="Get started">
        <div className="section-inner">
          <Reveal>
            <h2 className="final-headline">Your first unlock is one friend away</h2>
            <p className="final-sub">
              Sign up, send the CEO message, refer one person - and both video
              modules open on your dashboard, free.
            </p>
            <div className="cta-row">
              <Cta variant="primary" trackId={CTA_TRACK_ID.final}>
                {CTA_LABEL}
              </Cta>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="site-footer" aria-label="Footer">
        <div className="section-inner footer-grid">
          <div>
            <span className="logo-plate">
              <Image
                src="/brand/logo.png"
                alt="Icreatit Brand Limited"
                width={199}
                height={30}
              />
            </span>
            <p className="footer-contact">
              <a href={`mailto:${FOOTER.contactEmail}`}>{FOOTER.contactEmail}</a>
            </p>
          </div>
          <nav aria-label="Legal and social">
            <div className="footer-links">
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms</a>
            </div>
            <div className="footer-links">
              {FOOTER.socials.map((s) => (
                <a key={s.id} href={s.href} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
              ))}
            </div>
          </nav>
        </div>
      </footer>

      <StickyCta />
    </main>
  );
}
