/*
  Referral attribution storage (PRD 5.2 / 6.4).
  `?ref=CODE` is captured on first visit (components/RefCapture.tsx) and
  persisted for at least 30 days in BOTH localStorage and a cookie, then read
  back at signup. Attribution is validated server-side in
  convex/users.ts (regex, self-referral block).
*/

export const REF_STORAGE_KEY = "ig_ref_code";
export const COOKIE_NAME = "ig_ref";
export const RETENTION_DAYS = 30;

export function isValidReferralCodeFormat(code: string): boolean {
  return /^[A-HJ-NP-Z2-9]{6,8}$/.test(code);
}

export function storeReferralCode(code: string): void {
  const normalised = code.trim().toUpperCase();
  if (!isValidReferralCodeFormat(normalised)) return;
  try {
    localStorage.setItem(REF_STORAGE_KEY, normalised);
  } catch {
    // storage unavailable; cookie below remains
  }
  document.cookie = `${COOKIE_NAME}=${normalised}; expires=${new Date(
    Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toUTCString()}; path=/; samesite=lax`;
}

export function readReferralCode(): string | null {
  try {
    const local = localStorage.getItem(REF_STORAGE_KEY);
    if (local) return local;
  } catch {
    // fall through to cookie
  }
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  return match ? (match.split("=")[1] ?? null) : null;
}

/** Called after successful signup+verification, keeps analytics tidy. */
export function consumeReferralCode(): string | null {
  const value = readReferralCode();
  try {
    localStorage.removeItem(REF_STORAGE_KEY);
  } catch {
    // ignore
  }
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  return value;
}
