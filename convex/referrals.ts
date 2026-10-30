import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

/*
  Referral engine (PRD 6.4) + unlock rules (PRD 4.1).

  A referral becomes VALID when the referred user verifies their email
  (unique phone is enforced at signup). `validReferralCount` is a
  denormalized counter that is recalculated - never incremented blindly -
  so repeated and interleaved mutations stay correct.

  Unlock rules (thresholds): Telegram at 1 valid referral (WhatsApp click
  also required), PDF guide at 3, CEO strategy call at 10.
  Unlock timestamps are recomputed on every relevant event; falling below a
  threshold re-locks the reward (PRD: referral invalidation).

  Milestone events (milestone_1/3/10) fire once per lifetime but rewards
  re-lock if the count falls below the threshold later.
*/

const TELEGRAM_REFERRALS = 1;
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
    await recountReferrer(ctx, referredUser.referredBy);
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

  const telegramEarning =
    user.telegramUnlockedAt === undefined &&
    whatsappClicked &&
    validCount >= TELEGRAM_REFERRALS;
  const telegramRelocking =
    user.telegramUnlockedAt !== undefined && validCount < TELEGRAM_REFERRALS;

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
  if (telegramEarning) patch.telegramUnlockedAt = now;
  if (telegramRelocking) patch.telegramUnlockedAt = undefined;
  if (pdfEarning) patch.pdfUnlockedAt = now;
  if (pdfRelocking) patch.pdfUnlockedAt = undefined;
  if (ceoEarning) patch.ceoCallUnlockedAt = now;
  if (ceoRelocking) patch.ceoCallUnlockedAt = undefined;

  await ctx.db.patch(referrerId, patch);

  // Milestone events, fired once per lifetime (idempotent).
  if (telegramEarning) {
    await ctx.db.insert("events", {
      userId: referrerId,
      type: "milestone_1",
      meta: { validReferralCount: validCount },
      createdAt: now,
    });
  }
  if (pdfEarning) {
    await ctx.db.insert("events", {
      userId: referrerId,
      type: "milestone_3",
      meta: { validReferralCount: validCount },
      createdAt: now,
    });
  }
  if (ceoEarning) {
    await ctx.db.insert("events", {
      userId: referrerId,
      type: "milestone_10",
      meta: { validReferralCount: validCount },
      createdAt: now,
    });
  }
}
