import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";

/*
  Gate + rate-limit for OTP code emails.

  Rules:
  - A code is sent only to (a) a pending, unverified signup profile with this
    email, or (b) an already verified user with this email. Signups that have
    not been verified yet can also request a login code (people who clicked
    out of the signup flow).
  - Unknown email addresses are rejected. This makes the email field itself
    the source of truth: codes go only to real funnels users.
  - Per email: max 4 codes per rolling hour and at least 30 seconds between
    sends. Failed code-entry attempts are additionally rate limited by
    Convex Auth's internal authRateLimits table.

  Delete old rows lazily so the table stays small without a cron.
*/

const MAX_SENDS_PER_HOUR = 4;
const MIN_SECONDS_BETWEEN_SENDS = 30;
const HISTORY_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

export const requestOtp = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Lazily drop stale rate-limit history.
    const stale = await ctx.db
      .query("otpSends")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .collect();
    for (const doc of stale) {
      if (doc.createdAt < now - HISTORY_RETENTION_MS) {
        await ctx.db.delete(doc._id);
      }
    }

    const recent = stale.filter(
      (doc) => doc.createdAt >= now - 60 * 60 * 1000,
    );
    if (recent.length >= MAX_SENDS_PER_HOUR) {
      throw new ConvexError(
        "Too many codes requested for this email. Please try again later.",
      );
    }
    const last = recent.length
      ? Math.max(...recent.map((doc) => doc.createdAt))
      : 0;
    if (now - last < MIN_SECONDS_BETWEEN_SENDS * 1000) {
      throw new ConvexError(
        "Please wait a few seconds before requesting another code.",
      );
    }

    const email = args.email.toLowerCase().trim();

    const candidates = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    const pendingSignup = candidates.find(
      (u) => u.emailVerifiedAt === undefined,
    );
    const verifiedUser = candidates.find((u) => u.emailVerifiedAt !== undefined);

    if (!pendingSignup && !verifiedUser) {
      throw new ConvexError(
        "There is no signup with this email address. Please sign up first.",
      );
    }

    await ctx.db.insert("otpSends", { email, createdAt: now });
  },
});
