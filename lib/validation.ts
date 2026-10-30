/*
  Shared validation helpers used by both the client (inline form messages)
  and the Convex backend (authoritative checks). Keep this file free of
  framework or Convex imports so it stays isomorphic.

  Mirrors PRD 6.1 field rules.
*/

export const GENDER_VALUES = ["male", "female", "preferNotToSay"] as const;
export type Gender = (typeof GENDER_VALUES)[number];

/** incl. letters, spaces, hyphens and apostrophes. */
export const NAME_RE = /^[A-Za-z][A-Za-z'\- ]{1,49}$/;

export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 300;

/** 6-8 characters from the unambiguous referral-code alphabet. */
export const REFERRAL_CODE_RE = /^[A-HJ-NP-Z2-9]{6,8}$/;

export const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Disposable domains to reject at signup. Extend operationally; kept as a
 * flat list for now (Convex dashboard edits later if it grows).
 */
const DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "10minutemail.com",
  "10minutemail.net",
  "guerrillamail.com",
  "guerrillamail.net",
  "yopmail.com",
  "trashmail.com",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "fakeinbox.com",
  "getnada.com",
  "dispostable.com",
  "mailnesia.com",
  "maildrop.cc",
  "sharklasers.com",
  "mailcatch.com",
  "spamgourmet.com",
  "spambog.com",
  "1secmail.com",
];

export function isValidName(value: string): boolean {
  return NAME_RE.test(value.trim());
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isDisposableEmail(value: string): boolean {
  const domain = normalizeEmail(value).split("@")[1] ?? "";
  return DISPOSABLE_DOMAINS.includes(domain);
}

const COUNTRY_CODES = ["+234", "+233", "+254", "+27", "+44", "+1", "+61"];
export const DEFAULT_COUNTRY_CODE = "+234";

/**
 * Builds an E.164 number from a selected country dial code plus the
 * national digits the visitor typed. Returns null when invalid.
 * Uganda etc. enforce 7-10 national digits (covers NG 10-digit numbers).
 */
export function normalizePhone(countryCode: string, national: string) {
  const prefix = countryCode.startsWith("+") ? countryCode : `+${countryCode}`;
  if (!COUNTRY_CODES.includes(prefix)) return null;

  const digits = national.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length < 7 || digits.length > 10) return null;

  return { e164: `${prefix}${digits}`, digits };
}

export function normalizeGender(value: string): Gender | null {
  const candidate = value.replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (candidate === "male") return "male";
  if (candidate === "female") return "female";
  if (candidate === "prefernotsay" || candidate === "prefernottosay") {
    return "preferNotToSay";
  }
  return null;
}

export function isValidDescription(value: string): boolean {
  const length = value.trim().length;
  return length >= DESCRIPTION_MIN && length <= DESCRIPTION_MAX;
}
