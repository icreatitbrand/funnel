import Link from "next/link";

/*
  Placeholder legal page. Final referral-program terms (valid referral
  definition, right to invalidate, call capacity) must be approved before
  launch - Phase 6 checklist item.
*/
export const metadata = {
  title: "Terms",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Terms</h1>
      <p className="mt-4 text-ink-soft">
        Placeholder content. The final terms will cover the referral program
        (valid referral definition, right to invalidate fraudulent referrals,
        reward availability) and the one-on-one CEO call capacity disclaimer.
      </p>
      <Link href="/auth" className="mt-6 inline-block underline">
        Back to signup
      </Link>
    </main>
  );
}
