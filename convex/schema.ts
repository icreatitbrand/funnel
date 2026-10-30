import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/*
  Data model per PRD Section 8 (v1.2).

  - `authTables` adds the Convex Auth internals (authSessions, authAccounts,
    authRefreshTokens, authVerificationCodes, authVerifiers, authRateLimits).
  - `users` overrides the built-in users table: required funnel fields merged
    with the optional fields Convex Auth expects (name, emailVerificationTime,
    image, isAnonymous).
  - Extra index beyond the PRD-required four: referrals.by_referredUser
    (duplicate-phone/self-referral checks, referral lookups).
  - `otpSends` is internal bookkeeping for the auth gate rate limiter
    (addition to the PRD Section 8 list; documented in ops notes).
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
  telegramUnlockedAt: v.optional(v.number()),
  telegramJoinedAt: v.optional(v.number()), // via Telegram bot webhook
  pdfUnlockedAt: v.optional(v.number()),
  ceoCallUnlockedAt: v.optional(v.number()),
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
    Funnel analytics events. `type` uses the PRD vocabulary:
    signup, email_verified, whatsapp_click, telegram_unlock, telegram_joined,
    pdf_download, ceo_booking_click, ceo_call_booked, milestone_1,
    milestone_3, milestone_10.
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
    Key-value form. Expected keys (PRD 8):
      whatsappNumber          string, e.g. "2348012345678"
      whatsappMessageTemplate string, may contain placeholders like {firstName}
      telegramInviteMode      "bot" | "static"
      maxCeoCallsPerWeek      number
      launchDate              number (timestamp)
  */
  settings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),

  // Internal: OTP send history for the auth-gate rate limiter (convex/authGate.ts)
  otpSends: defineTable({
    email: v.string(), // lowercase
    createdAt: v.number(),
  }).index("by_email", ["email"]),
});
