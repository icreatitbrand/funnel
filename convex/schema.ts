import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/*
  Data model per PRD Section 8 (v1.2).

  Indexes required by the PRD: users.by_email, users.by_phone,
  users.by_referralCode, referrals.by_referrer. Extra indexes are added where
  queries clearly need them (referral uniqueness checks, event type reports).
*/

export default defineSchema({
  users: defineTable({
    firstName: v.string(),
    surname: v.string(),
    email: v.string(), // unique, verified (declared at signup; uniqueness enforced in mutations)
    phone: v.string(), // unique, E.164 format
    gender: v.union(
      v.literal("male"),
      v.literal("female"),
      v.literal("preferNotToSay"),
    ),
    businessDescription: v.string(), // 20-300 characters
    referralCode: v.string(), // unique, 6-8 characters
    referredBy: v.optional(v.id("users")), // null/absent for organic signups
    emailVerifiedAt: v.optional(v.number()),
    whatsappClickedAt: v.optional(v.number()),
    validReferralCount: v.number(), // denormalized; recalculated on referral validation/invalidation
    telegramUnlockedAt: v.optional(v.number()),
    telegramJoinedAt: v.optional(v.number()), // via Telegram bot member update webhook
    pdfUnlockedAt: v.optional(v.number()),
    ceoCallUnlockedAt: v.optional(v.number()),
    consentAt: v.number(), // NDPA consent timestamp
    role: v.union(v.literal("user"), v.literal("admin")), // kept for internal ops; no admin UI in v1
    flagged: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_phone", ["phone"])
    .index("by_referralCode", ["referralCode"])
    .index("by_referredBy", ["referredBy"]),

  referrals: defineTable({
    referrerId: v.id("users"),
    referredUserId: v.id("users"),
    status: v.union(
      v.literal("pending"), // signed up, not yet verified
      v.literal("valid"), // email verified + unique phone
      v.literal("invalid"), // admin/ops invalidated (fraud, duplicate)
    ),
    validatedAt: v.optional(v.number()),
    invalidatedAt: v.optional(v.number()),
    ipHash: v.optional(v.string()), // hashed, for abuse detection only
    createdAt: v.number(),
  })
    .index("by_referrer", ["referrerId"])
    .index("by_referredUser", ["referredUserId"]),

  /*
    Funnel analytics events. `type` uses the PRD vocabulary:
    signup, email_verified, whatsapp_click, telegram_unlock, telegram_joined,
    pdf_download, ceo_booking_click, ceo_call_booked, milestone_1, milestone_3, milestone_10.
    `meta` is a free-form object (e.g. { referrals: n } or booking summary).
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
    Runtime-editable configuration so numbers/links can change without code deploys.
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
});
