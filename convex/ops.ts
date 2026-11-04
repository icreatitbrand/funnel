import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action, internalQuery, mutation, query } from "./_generated/server";
import { recountReferrer } from "./referrals";
import { getSettings } from "./settings";

/*
  Operations functions (PRD 6.10): there is no admin UI in v1 - these are run
  directly from the Convex dashboard Functions runner with an ops secret.
  Set it once with: npx convex env set OPS_SECRET <random string>

  - invalidateReferral: marks a referral invalid, recounts the referrer and
    re-locks free rewards if their count falls below the thresholds (never
    payment unlocks).
  - setSetting: updates a runtime setting (e.g. CEO WhatsApp number) without
    a code deploy.
  - confirmPayment: manual confirm-by-reference fallback for payments the
    webhook missed; applies the plan's unlocks exactly as Paystack would.
  - funnelCounts / topReferrers / listPayments / exportLeads: also live here
    so the ops team never needs a second deploy target (Phase 5 tooling).
*/
async function requireOpsSecret(args: { opsSecret: string }) {
  const expected = process.env.OPS_SECRET;
  if (!expected || args.opsSecret !== expected) {
    throw new ConvexError("Invalid ops secret.");
  }
}

export const invalidateReferral = mutation({
  args: { referralId: v.id("referrals"), opsSecret: v.string() },
  handler: async (ctx, args) => {
    await requireOpsSecret(args);
    const referral = await ctx.db.get(args.referralId);
    if (referral === null) throw new ConvexError("Referral not found.");
    if (referral.status === "invalid") return;

    await ctx.db.patch(args.referralId, {
      status: "invalid",
      invalidatedAt: Date.now(),
    });
    await ctx.db.insert("events", {
      userId: referral.referredUserId,
      type: "referral_invalidated",
      meta: { referrerId: referral.referrerId },
      createdAt: Date.now(),
    });
    await recountReferrer(ctx, referral.referrerId);
  },
});

const ALLOWED_SETTINGS = new Set([
  "ceoWhatsappNumber",
  "whatsappMessageTemplate",
  "video1YoutubeUrl",
  "video2YoutubeUrl",
  "paidWhatsappGroupLink",
  "paidTelegramGroupLink",
  "paidTelegramInviteMode", // "static" | "bot"
  "paidTelegramChatId", // numeric chat id of the PAID Telegram group
  "freeGuideStorageId", // Convex storage id of the free course guide PDF
  "paidBookStorageId", // Convex storage id of the paid PDF book
  "pdfPriceNaira",
  "bundlePriceNaira",
  "maxCeoCallsPerWeek",
  "launchDate",
]);

export const setSetting = mutation({
  args: { key: v.string(), value: v.any(), opsSecret: v.string() },
  handler: async (ctx, args) => {
    await requireOpsSecret(args);
    if (!ALLOWED_SETTINGS.has(args.key)) {
      throw new ConvexError(`Unknown setting key: ${args.key}`);
    }
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("settings", { key: args.key, value: args.value });
    }
  },
});

/** Manual payment confirmation fallback (PRD 6.7 step 4). */
export const confirmPayment = mutation({
  args: { reference: v.string(), opsSecret: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<"confirmed" | "already_confirmed" | "amount_mismatch" | "not_found"> => {
    await requireOpsSecret(args);
    const result = await ctx.runMutation(
      internal.payments.confirmByReference,
      { reference: args.reference },
    );
    if (result === "not_found") {
      throw new ConvexError(`Payment ${args.reference} not found.`);
    }
    return result;
  },
});

/* ------------------- Reporting (PRD 6.10) + Phase 5 tooling ---------------- */

/**
 * Funnel counts across the whole user journey (PRD 3.3 / Phase 5 exit
 * criteria). Run from the dashboard Functions runner with the ops secret.
 */
export const funnelCounts = query({
  args: { opsSecret: v.string() },
  handler: async (ctx, args) => {
    await requireOpsSecret(args);
    const users = await ctx.db.query("users").collect();
    const isVerified = (u: Doc<"users">) => u.emailVerifiedAt !== undefined;
    const count = (f: (u: Doc<"users">) => boolean) => users.filter(f).length;
    const payments = await ctx.db.query("payments").collect();
    const eventsSignup = await ctx.db
      .query("events")
      .withIndex("by_type", (q) => q.eq("type", "landing_view"))
      .collect();

    return {
      users: {
        total: users.length,
        verified: count(isVerified),
        whatsappClicked: count((u) => u.whatsappClickedAt !== undefined),
        videosUnlocked: count((u) => u.videoUnlockedAt !== undefined),
        video1Started: count((u) => u.video1StartedAt !== undefined),
        video2Engaged: count((u) => u.video2EngagedAt !== undefined),
        freeGuideUnlocked: count((u) => u.pdfUnlockedAt !== undefined),
        ceoCallUnlocked: count((u) => u.ceoCallUnlockedAt !== undefined),
        flagged: count((u) => u.flagged),
        unsubscribed: count((u) => u.unsubscribedAt !== undefined),
      },
      payments: {
        initialized: payments.filter((p) => p.status === "initialized").length,
        confirmed: payments.filter((p) => p.status === "confirmed").length,
        failed: payments.filter((p) => p.status === "failed").length,
        confirmedPdf: payments.filter(
          (p) => p.status === "confirmed" && p.plan === "pdf",
        ).length,
        confirmedBundle: payments.filter(
          (p) => p.status === "confirmed" && p.plan === "bundle",
        ).length,
      },
      landingViews: eventsSignup.length,
    };
  },
});

/** Top referrers by CURRENT valid referral count (share / ranking view). */
export const topReferrers = query({
  args: { opsSecret: v.string() },
  handler: async (ctx, args) => {
    await requireOpsSecret(args);
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.validReferralCount > 0)
      .sort((a, b) => b.validReferralCount - a.validReferralCount)
      .slice(0, 25)
      .map((u) => ({
        name: `${u.firstName} ${u.surname}`.trim(),
        email: u.email,
        referralCode: u.referralCode,
        validReferralCount: u.validReferralCount,
        flagged: u.flagged,
        videosUnlocked: u.videoUnlockedAt !== undefined,
        paid: u.paidPdfUnlockedAt !== undefined,
      }));
  },
});

/**
 * Reconciliation view: payments by status (PRD Phase 5 "reconciliation
 * tooling"), newest first, capped at 200.
 */
export const listPayments = query({
  args: { opsSecret: v.string(), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOpsSecret(args);
    let rows;
    if (args.status) {
      rows = await ctx.db
        .query("payments")
        .withIndex("by_status", (q) =>
          q.eq("status", args.status as "confirmed" | "failed" | "initialized"),
        )
        .collect();
    } else {
      rows = await ctx.db.query("payments").collect();
    }
    return rows
      .sort((a, b) => b.initializedAt - a.initializedAt)
      .slice(0, 200)
      .map(async (p) => {
        const user = await ctx.db.get(p.userId);
        return {
          reference: p.reference,
          plan: p.plan,
          amountNaira: p.amountNaira,
          status: p.status,
          initializedAt: p.initializedAt,
          confirmedAt: p.confirmedAt,
          user: user ? `${user.firstName} ${user.surname} <${user.email}>` : "unknown",
        };
      });
  },
});

/** Exports leads (with referral + payment state) as CSV text for follow-up. */
export const exportLeads = action({
  args: { opsSecret: v.string() },
  handler: async (ctx, args): Promise<string> => {
    if (!process.env.OPS_SECRET || args.opsSecret !== process.env.OPS_SECRET) {
      throw new ConvexError("Invalid ops secret.");
    }
    const users = await ctx.runQuery(internal.ops.leadsSnapshot, { opsSecret: args.opsSecret });
    const header =
      "email,phone,firstName,surname,gender,business,referralCode,referredByCode,emailVerifiedAt,whatsappClicked,videosUnlocked,video1Started,video2Engaged,freeGuideUnlocked,paidPlan,ceoCallUnlocked,validReferralCount,flagged,createdAt";
    const escape = (value: string | number | boolean | undefined) =>
      `"${String(value ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`;
    const rows = users.map((u) =>
      [
        u.email,
        u.phone,
        u.firstName,
        u.surname,
        u.gender,
        u.businessDescription,
        u.referralCode,
        u.referredByCode ?? "",
        u.emailVerifiedAt !== undefined && u.emailVerifiedAt > 0
          ? new Date(u.emailVerifiedAt).toISOString()
          : "",
        !!u.whatsappClicked,
        !!u.videosUnlocked,
        !!u.video1Started,
        !!u.video2Engaged,
        !!u.freeGuideUnlocked,
        u.paidPlan ?? "",
        !!u.ceoCallUnlocked,
        u.validReferralCount ?? 0,
        !!u.flagged,
        u.createdAt !== undefined && u.createdAt > 0
          ? new Date(u.createdAt).toISOString()
          : "",
      ]
        .map(escape)
        .join(","),
    );
    return [header, ...rows].join("\n");
  },
});

/** The leads snapshot exportLeads turns into CSV (internal, not user-facing). */
export const leadsSnapshot = internalQuery({
  args: { opsSecret: v.string() },
  handler: async (ctx, args) => {
    await requireOpsSecret(args);
    const users = await ctx.db.query("users").collect();
    const referrals = await ctx.db.query("referrals").collect();

    const referredCodeOf = new Map<string, string>(); // userId -> referrer's code
    const codeOfUser = new Map(users.map((u) => [u._id, u.referralCode]));
    for (const r of referrals) {
      const code = codeOfUser.get(r.referrerId);
      if (code) referredCodeOf.set(r.referredUserId, code);
    }

    return users.map((u) => ({
      email: u.email,
      phone: u.phone,
      firstName: u.firstName,
      surname: u.surname,
      gender: u.gender,
      businessDescription: u.businessDescription,
      referralCode: u.referralCode,
      referredByCode: referredCodeOf.get(u._id) ?? "",
      emailVerifiedAt: u.emailVerifiedAt ?? 0,
      whatsappClicked: u.whatsappClickedAt !== undefined,
      videosUnlocked: u.videoUnlockedAt !== undefined,
      video1Started: u.video1StartedAt !== undefined,
      video2Engaged: u.video2EngagedAt !== undefined,
      freeGuideUnlocked: u.pdfUnlockedAt !== undefined,
      paidPlan:
        u.whatsappGroupUnlockedAt !== undefined
          ? "bundle"
          : u.paidPdfUnlockedAt !== undefined
            ? "pdf"
            : "",
      ceoCallUnlocked: u.ceoCallUnlockedAt !== undefined,
      validReferralCount: u.validReferralCount,
      flagged: u.flagged,
      createdAt: u.createdAt,
    }));
  },
});
