/*
  Phase 1 placeholder. The full landing page (PRD Section 5) is built in Phase 4.
  The exact approved headline is already in place; no CTA in the hero per PRD 5.1.
  TODO(phase-4): replace this file entirely.
*/
export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
        Icreatit Brand Limited
      </p>
      <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl md:text-5xl">
        It&apos;s time to build and scale your business with grants and AI
      </h1>
      <p className="max-w-md text-ink-soft">
        The AI Foundry and Grant Winning Course is a free course. Sign up is
        opening soon.
      </p>
    </main>
  );
}
