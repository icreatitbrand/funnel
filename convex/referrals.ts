import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";

/*
  Referral engine (PRD 6.4) + unlock rules (PRD 4.1).

  A referral becomes VALID when the referred user verifies their email
  (unique phone is enforced at signup). `validReferralCount` is a
  denormalized counter that is recalculated - never incremented blindly -
  so repeated and interleaved mutations stay correct.

  Unlock rules (thresholds, PRD v1.3): video modules at 1 valid referral
  (WhatsApp step to the CEO also required), free course guide PDF at 3,
  CEO strategy call at 10. Unlock timestamps are recomputed on every relevant
  event; falling below a threshold re-locks the free reward (PRD: referral
  invalidation). Payment unlocks (paidPdf/whatsappGroup/telegramGroup) are
  NEVER touched here - they live in convex/payments.ts only.

  Milestone events (milestone_1/3/10) fire once per lifetime but rewards
  re-lock if the count falls below the threshold later.
*/

const VIDEO_REFERRALS = 1;
const PDF_REFERRALS = 3;
const CEO_CALL_REFERRALS = 10;

/**
 * After a user verifies their email, promote their pending referrals and
 * recount the referrer. Called from the auth verification flow.
 */
export async function validateReferralsForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<void> {
  const now = Date.now();
  const rows = await ctx.db
    .query("referrals")
    .withIndex("by_referredUser", (q) => q.eq("referredUserId", userId))
    .collect();

  let promoted = false;
  for (const row of rows) {
    if (row.status === "pending") {
      await ctx.db.patch(row._id, { status: "valid", validatedAt: now });
      promoted = true;
    }
  }

  const referredUser = await ctx.db.get(userId);
  if (promoted && referredUser?.referredBy) {
    // Recount first so the email reflects the fresh count.
    await recountReferrer(ctx, referredUser.referredBy);

    // "Each valid referral" automation email (PRD 6.9): one per referral,
    // keyed by the referrer+referred pair so re-validations never resend.
    const referrer = await ctx.db.get(referredUser.referredBy);
    await ctx.runMutation(internal.emails.claimAndSend, {
      sendKey: `referral_joined:${referredUser.referredBy}:${userId}`,
      template: "referral_joined",
      userId: referredUser.referredBy,
      params: {
        firstName: referrer?.firstName ?? "there",
        validReferralCount: referrer?.validReferralCount ?? 0,
        extra: {
          referralName: `${referredUser.firstName ?? ""} ${referredUser.surname ?? ""}`.trim(),
        },
      },
    });
  }
}

/**
 * Recalculate everything that depends on a referrer's valid referral count:
 * the count itself, unlock timestamps and milestone events.
 */
export async function recountReferrer(
  ctx: MutationCtx,
  referrerId: Id<"users">,
): Promise<void> {
  const now = Date.now();
  const rows = await ctx.db
    .query("referrals")
    .withIndex("by_referrer", (q) => q.eq("referrerId", referrerId))
    .collect();
  const validCount = rows.filter((r) => r.status === "valid").length;

  const user = await ctx.db.get(referrerId);
  if (user === null) return;

  const whatsappClicked = user.whatsappClickedAt !== undefined;

  const videoEarning =
    user.videoUnlockedAt === undefined &&
    whatsappClicked &&
    validCount >= VIDEO_REFERRALS;
  const videoRelocking =
    user.videoUnlockedAt !== undefined && validCount < VIDEO_REFERRALS;

  const pdfEarning =
    user.pdfUnlockedAt === undefined && validCount >= PDF_REFERRALS;
  const pdfRelocking =
    user.pdfUnlockedAt !== undefined && validCount < PDF_REFERRALS;

  const ceoEarning =
    user.ceoCallUnlockedAt === undefined && validCount >= CEO_CALL_REFERRALS;
  const ceoRelocking =
    user.ceoCallUnlockedAt !== undefined && validCount < CEO_CALL_REFERRALS;

  const patch: Partial<Doc<"users">> = {
    validReferralCount: validCount,
  };
  if (videoEarning) patch.videoUnlockedAt = now;
  if (videoRelocking) patch.videoUnlockedAt = undefined;
  if (pdfEarning) patch.pdfUnlockedAt = now;
  if (pdfRelocking) patch.pdfUnlockedAt = undefined;
  if (ceoEarning) patch.ceoCallUnlockedAt = now;
  if (ceoRelocking) patch.ceoCallUnlockedAt = undefined;

  await ctx.db.patch(referrerId, patch);

  // Milestone events, fired once per lifetime (idempotent) + the matching
  // automation emails (PRD 6.9), each guaranteed to fire at most once by the
  // deterministic sendKey in convex/emails.ts.
  if (videoEarning) {
    await ctx.db.insert("events", {
      userId: referrerId,
      type: "milestone_1",
      meta: { validReferralCount: validCount },
      createdAt: now,
    });
    await scheduleMilestoneEmail(ctx, {
      userId: referrerId,
      template: "videos_unlocked",
      firstName: user.firstName,
      validCount,
    });
  }
  if (pdfEarning) {
    await ctx.db.insert("events", {
      userId: referrerId,
      type: "milestone_3",
      meta: { validReferralCount: validCount },
      createdAt: now,
    });
    await scheduleMilestoneEmail(ctx, {
      userId: referrerId,
      template: "guide_unlocked",
      firstName: user.firstName,
      validCount,
    });
  }
  if (ceoEarning) {
    await ctx.db.insert("events", {
      userId: referrerId,
      type: "milestone_10",
      meta: { validReferralCount: validCount },
      createdAt: now,
    });
    await scheduleMilestoneEmail(ctx, {
      userId: referrerId,
      template: "ceo_call_unlocked",
      firstName: user.firstName,
      validCount,
    });
  }
}

async function scheduleMilestoneEmail(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    template: "videos_unlocked" | "guide_unlocked" | "ceo_call_unlocked";
    firstName: string;
    validCount: number;
  },
): Promise<void> {
  await ctx.runMutation(internal.emails.claimAndSend, {
    sendKey: `${args.template}:${args.userId}`,
    template: args.template,
    userId: args.userId,
    params: {
      firstName: args.firstName,
      validReferralCount: args.validCount,
    },
  });
}
