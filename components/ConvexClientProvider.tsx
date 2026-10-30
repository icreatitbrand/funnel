"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

/*
  Wraps the app with the Convex client and auth provider.
  Guarded so static prerendering still works when NEXT_PUBLIC_CONVEX_URL
  is not present at build time (Convex writes it on first `convex dev`).
*/
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is not set. Run `npx convex dev` once (it writes .env.local).",
    );
  }
  return (
    <ConvexAuthProvider client={new ConvexReactClient(url)}>
      {children}
    </ConvexAuthProvider>
  );
}
