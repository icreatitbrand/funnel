/*
  Phase 1 placeholder. The real two-step signup form (PRD 6.1) is built in Phase 2.
  TODO(phase-2): replace with the two-step form and a login tab.
*/
export const metadata = {
  title: "Sign Up",
};

export default function AuthPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">Sign Up</h1>
      <p className="max-w-sm text-ink-soft">
        Free access to the AI Foundry and Grant Winning Course. Sign up opens
        soon.
      </p>
    </main>
  );
}
