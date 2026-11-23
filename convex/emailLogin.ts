import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";

/*
  Email-only sign-in (owner decision): a registered, verified user signs in
  with just their email address, no code, as long as the account was active
  (logged in or opened the dashboard) within the last 7 days. After 7+ days
  of absence, or if the account has no activity on record yet, the sign-in
  is rejected here and the client falls back to the emailed 6-digit code.

  SECURITY NOTE: inside the 7-day window, knowing a user's email address is
  enough to sign in as them. This was an explicit, accepted trade-off.
*/

export const EMAIL_ONLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const consume = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const candidates = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    const user = candidates.find(
      (u) => u.emailVerifiedAt !== undefined && u.consentAt,
    );
    if (!user) return null;
    if (
      user.lastActiveAt === undefined ||
      Date.now() - user.lastActiveAt > EMAIL_ONLY_WINDOW_MS
    ) {
      return null;
    }
    return user._id;
  },
});

// Called from the signed-in dashboard so "last active" tracks real use.
export const touch = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    await ctx.db.patch(userId, { lastActiveAt: Date.now() });
  },
});
