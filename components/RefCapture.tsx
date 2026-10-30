"use client";

import { useEffect } from "react";
import { readReferralCode, storeReferralCode } from "@/lib/referral";

/*
  Capture ?ref=CODE from any page on FIRST visit and persist it for at
  least 30 days (cookie + localStorage, PRD 5.2). The URL is cleaned up so
  shared links look tidy after capture. Mounted once in the root layout.
*/
export function RefCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      const code = ref.trim().toUpperCase();
      if (/^[A-HJ-NP-Z2-9]{6,8}$/.test(code)) {
        storeReferralCode(code);
      }
      params.delete("ref");
      const search = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (search ? `?${search}` : ""),
      );
    }

    // Cross-check both storage mechanisms so attribution survives even when
    // one of them is blocked (e.g. some in-app browsers clear cookies).
    const local = readLocalStorageCode();
    const cookie = readCookieCode();
    if (local && !cookie) {
      writeCookie(local);
    } else if (!local && cookie) {
      storeReferralCode(cookie);
    }
  }, []);

  return null;
}

function readLocalStorageCode(): string | null {
  try {
    return localStorage.getItem("ig_ref_code");
  } catch {
    return null;
  }
}

function readCookieCode(): string | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("ig_ref="));
  return match ? (match.split("=")[1] ?? null) : null;
}

function writeCookie(code: string): void {
  document.cookie = `ig_ref=${code}; expires=${new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toUTCString()}; path=/; samesite=lax`;
}
