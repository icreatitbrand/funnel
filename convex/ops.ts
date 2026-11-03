import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation } from "./_generated/server";
import { recountReferrer } from "./referrals";

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
