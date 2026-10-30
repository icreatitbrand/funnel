"use client";

import { useConvexAuth } from "@convex-dev/auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/*
  Phase 2 stub dashboard: real unlock checklist, referral card and
  gamification land in Phase 3. For now it proves the authorization flow:
  unauthenticated visitors are pointed at /login.
*/
export default function DashboardPage() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <main className="grid min-h-dvh place-items-center text-ink-soft">Loading...</main>;
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="text-ink-soft">
        You are signed in. The full dashboard (unlock checklist, referral link
        card, rewards) is coming in the next build phase.
      </p>
      <p className="text-sm">
        <Link href="/login" className="underline">
          Switch account
        </Link>
      </p>
    </main>
  );
}
