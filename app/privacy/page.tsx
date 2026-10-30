import Link from "next/link";

/*
  Placeholder legal pages. Final NDPA-compliant copy (PRD Section 10) must be
  approved before launch - Phase 6 checklist item.
*/
export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p className="mt-4 text-ink-soft">
        Placeholder content. The final policy will cover: purpose of data use,
        NDPA-compliant consent, referral data handling, verification emails,
        unsubscribing and data deletion requests.
      </p>
      <Link href="/auth" className="mt-6 inline-block underline">
        Back to signup
      </Link>
    </main>
  );
}
