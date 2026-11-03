import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/*
  Data model per PRD Section 8 (v1.3).

  - `authTables` adds the Convex Auth internals (authSessions, authAccounts,
    authRefreshTokens, authVerificationCodes, authVerifiers, authRateLimits).
  - `users` overrides the built-in users table: required funnel fields merged
    with the optional fields Convex Auth expects (name, emailVerificationTime,
    image, isAnonymous).
  - Extra index beyond the PRD-required four: referrals.by_referredUser
    (duplicate-phone/self-referral checks, referral lookups).
  - `otpSends` is internal bookkeeping for the auth gate rate limiter
    (addition to the PRD Section 8 list; documented in ops notes).
  - v1.3: referral referrals gate the VIDEO course; the PDF book, WhatsApp
    group and Telegram group are gated by SERVER-VERIFIED Paystack payments
    (`payments` table). Paid unlocks are never affected by referral
    invalidation.
*/

const users = defineTable({
  // Convex Auth standard optional fields
  name: v.optional(v.string()),
  emailVerificationTime: v.optional(v.number()),
  image: v.optional(v.string()),
  isAnonymous: v.optional(v.boolean()),

  // Funnel fields (PRD Section 8)
  firstName: v.string(),
  surname: v.string(),
  email: v.string(), // unique, lowercase; verified via OTP before access
  phone: v.string(), // unique, E.164
  gender: v.union(
    v.literal("male"),
    v.literal("female"),
    v.literal("preferNotToSay"),
  ),
  businessDescription: v.string(), // 20-300 characters
  referralCode: v.string(), // unique, 6-8 characters, unambiguous alphabet
  referredBy: v.optional(v.id("users")),
  emailVerifiedAt: v.optional(v.number()),
  whatsappClickedAt: v.optional(v.number()),
  validReferralCount: v.number(), // denormalized; recalculated on change
  videoUnlockedAt: v.optional(v.number()), // WhatsApp click + 1 valid referral
  video1StartedAt: v.optional(v.number()), // analytics only
  video2EngagedAt: v.optional(v.number()), // ~50% playback, once (PRD 6.5)
  pdfUnlockedAt: v.optional(v.number()), // free course guide at 3 referrals
  paidPdfUnlockedAt: v.optional(v.number()), // payment verified (plan pdf/bundle)
  whatsappGroupUnlockedAt: v.optional(v.number()), // bundle payment verified
  telegramGroupUnlockedAt: v.optional(v.number()), // bundle payment verified
  ceoCallUnlockedAt: v.optional(v.number()), // 10 valid referrals
  avatarId: v.optional(v.string()), // preset id; see AVATAR_PRESETS (client)
  consentAt: v.number(), // NDPA consent timestamp
  role: v.union(v.literal("user"), v.literal("admin")), // ops/scripts only; no admin UI in v1
  flagged: v.boolean(),
  createdAt: v.number(),
})
  .index("by_email", ["email"])
  .index("by_phone", ["phone"])
  .index("by_referralCode", ["referralCode"])
  .index("by_referredBy", ["referredBy"]);

export default defineSchema({
  ...authTables,
  users,
  referrals: defineTable({
    referrerId: v.id("users"),
    referredUserId: v.id("users"),
    status: v.union(
      v.literal("pending"), // signed up, not yet verified
      v.literal("valid"), // email verified + unique phone
      v.literal("invalid"), // invalidated via ops script
    ),
    validatedAt: v.optional(v.number()),
    invalidatedAt: v.optional(v.number()),
    ipHash: v.optional(v.string()), // hashed; IP capture deferred (see convex/users.ts)
    createdAt: v.number(),
  })
    .index("by_referrer", ["referrerId"])
    .index("by_referredUser", ["referredUserId"]),

  /*
    Funnel analytics events. `type` uses the PRD vocabulary (v1.3):
    signup, email_verified, whatsapp_click, video_unlock, video1_started,
    video2_engaged, guide_download, paid_pdf_download,
    whatsapp_group_joined, telegram_join_clicked, payment_initialized,
    payment_confirmed, ceo_booking_click, ceo_call_booked, milestone_1,
    milestone_3, milestone_10, referral_invalidated.
  */
  events: defineTable({
    userId: v.id("users"),
    type: v.string(),
    meta: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["type"]),

  callBookings: defineTable({
    userId: v.id("users"),
    scheduledFor: v.number(), // timestamp of the chosen slot; set at booking time
    status: v.union(
      v.literal("booked"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  /*
    Runtime-editable configuration so numbers/links change without code deploys.
    Key-value form. Expected keys (PRD 8, v1.3):
      ceoWhatsappNumber        string, e.g. "2347043420165"
      whatsappMessageTemplate  string, placeholders {firstName} {surname} {email}
      video1YoutubeUrl         string (empty = embed unavailable)
      video2YoutubeUrl         string (empty = embed unavailable)
      paidWhatsappGroupLink    string (revealed after bundle payment)
      paidTelegramGroupLink    string (revealed after bundle payment; bot in Phase 5)
      pdfPriceNaira            number (7500)
      bundlePriceNaira         number (20500)
      maxCeoCallsPerWeek       number
      launchDate               number (timestamp)
  */
  settings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),

  /*
    Paystack payments (PRD 6.7). Unlock timestamps on `users` are ONLY set by
    payment confirmation (webhook after signature+amount verification, or the
    ops-confirm tool for edge cases). Nothing unlocks client-side.
  */
  payments: defineTable({
    userId: v.id("users"),
    plan: v.union(v.literal("pdf"), v.literal("bundle")),
    amountNaira: v.number(), // recorded at initialization for audit
    provider: v.literal("paystack"),
    reference: v.string(), // unique
    status: v.union(
      v.literal("initialized"),
      v.literal("confirmed"),
      v.literal("failed"),
    ),
    initializedAt: v.number(),
    confirmedAt: v.optional(v.number()),
    meta: v.optional(v.any()), // Paystack payload summary for reconciliation
  })
    .index("by_user", ["userId"])
    .index("by_reference", ["reference"])
    .index("by_status", ["status"]),

  // Internal: OTP send history for the auth-gate rate limiter (convex/authGate.ts)
  otpSends: defineTable({
    email: v.string(), // lowercase
    createdAt: v.number(),
  }).index("by_email", ["email"]),
});
