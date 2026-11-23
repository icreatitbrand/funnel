import { convexAuth } from "@convex-dev/auth/server";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import type { AnyDataModel, GenericMutationCtx } from "convex/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { BrevoEmailOTP } from "./BrevoEmailOTP";
import { ensureUnsubscribeToken } from "./emails";
import { validateReferralsForUser } from "./referrals";
/*
  Post-verification automations (PRD 6.9, Phase 5): welcome email + Brevo
  contact sync + unsubscribe token. Runs in BOTH createOrUpdateUser
  verification branches; the emailSends sendKey makes repeats harmless.
*/
async function onFirstVerification(
  ctx: GenericMutationCtx<AnyDataModel>,
  userId: Id<"users">,
): Promise<void> {
  const mutationCtx = ctx as unknown as MutationCtx;
  await ensureUnsubscribeToken(mutationCtx, userId);
  // Welcome email + Brevo contact sync (PRD 6.9); the sendKey deduplicates.
  await mutationCtx.runMutation(internal.emails.claimAndSend, {
    sendKey: `welcome:${userId}`,
    template: "welcome",
    userId,
    params: { firstName: (await mutationCtx.db.get(userId))?.firstName ?? "", validReferralCount: 0 },
  });
  await mutationCtx.runMutation(internal.emails.syncContact, { userId });
}

/*
  The createOrUpdateUser callback receives a context typed against Convex
  Auth's AnyDataModel, which hides our custom indexes. Cast it once to the
  real DataModel so indices resolve; runtime is unaffected.
*/
function typedDb(ctx: GenericMutationCtx<AnyDataModel>) {
  return (ctx as unknown as MutationCtx).db;
}

/*
  Email OTP is the only authentication method (PRD 6.1 / owner decision):
  no passwords, no Google OAuth. Access requires a short code sent to a
  registered email address.

  Account linking is fully controlled via createOrUpdateUser so that profile
  fields collected during signup (name, phone, gender, business description,
  consent) survive: signup stores a pending user document; once the email
  code is verified, the auth account attaches to that exact document and we
  mark it verified in the same transaction.
*/
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    BrevoEmailOTP,
    /*
      Trusted-device sign-in: email only, no code, but ONLY from a device that
      earlier proved its email with a code and was seen in the last 7 days
      (convex/devices.ts). Anything else is rejected and the client falls back
      to the emailed code.
    */
    ConvexCredentials({
      id: "device",
      authorize: async (credentials, ctx) => {
        const email = credentials.email;
        const token = credentials.token;
        if (typeof email !== "string" || typeof token !== "string") return null;
        const userId = await ctx.runMutation(internal.devices.consume, {
          email,
          token,
        });
        return userId ? { userId } : null;
      },
    }),
  ],
  session: {
    totalDurationMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    // Idle for 7 days = signed out (then a code is needed on an untrusted device).
    inactiveDurationMs: 7 * 24 * 60 * 60 * 1000,
  },
  // Short-lived access tokens: a device that was signed out by a newer login
  // loses access within minutes instead of the default hour.
  jwt: { durationMs: 5 * 60 * 1000 },
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      const db = typedDb(ctx);
      const email =
        typeof args.profile.email === "string"
          ? args.profile.email.toLowerCase().trim()
          : undefined;

      if (args.type !== "email" && args.type !== "verification") {
        throw new ConvexError("Sign-in method not supported.");
      }
      if (!email) {
        throw new ConvexError("Sign-in requires an email address.");
      }

      /*
        Convex Auth calls this callback twice in the email OTP flow:
        1. Code creation (type "email"): BEFORE the code is emailed.
           - Returning users: existingUserId is set; sign in as-is.
           - New signups: no account yet; attach it to our PENDING profile.
        2. Verification (type "verification"): the code was correct.
           - Mark the user's email as verified here.
      */
      if (args.existingUserId !== null) {
        if (args.type === "verification") {
          const user = await db.get(args.existingUserId);
          if (user && user.emailVerifiedAt === undefined) {
            const now = Date.now();
            await db.patch(user._id, { emailVerifiedAt: now });
            await db.insert("events", {
              userId: user._id,
              type: "email_verified",
              createdAt: now,
            });
            // Referrals attached to this signup become valid (PRD 6.4).
            await validateReferralsForUser(
              ctx as unknown as MutationCtx,
              user._id,
            );
            // Welcome email + contact sync (PRD 6.9).
            await onFirstVerification(ctx, user._id);
          }
        }
        return args.existingUserId;
      }

      // No auth account yet: map to the pending signup profile.
      const candidates = await db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .collect();

      const pending = candidates.find(
        (u) => u.emailVerifiedAt === undefined,
      );
      if (pending) {
        if (args.type === "verification") {
          // Successful code entry: promote the pending signup.
          const now = Date.now();
          await db.patch(pending._id, { emailVerifiedAt: now });
          await db.insert("events", {
            userId: pending._id,
            type: "email_verified",
            createdAt: now,
          });
          // Referrals attached to this signup become valid (PRD 6.4).
          await validateReferralsForUser(
            ctx as unknown as MutationCtx,
            pending._id,
          );
          // Welcome email + contact sync (PRD 6.9).
          await onFirstVerification(ctx, pending._id);
        }
        return pending._id;
      }

      if (args.type === "email") {
        // This can only be reached if the auth gate (convex/authGate.ts)
        // was bypassed; codes are never emailed to unknown addresses.
        throw new ConvexError(
          "There is no signup with this email address. Please sign up first.",
        );
      }

      throw new ConvexError(
        "There is no signup with this email address. Please sign up first.",
      );
    },

    async beforeSessionCreation(ctx, { userId }) {
      // Everyone in the funnel must have consented (NDPA) before a session.
      const user = await ctx.db.get(userId);
      if (!user?.consentAt) {
        throw new ConvexError("Signup was not completed. Please sign up first.");
      }

      // One active session per account: the newest sign-in wins and any
      // session on another device is removed (the new one is created right
      // after this callback returns).
      const db = typedDb(ctx);
      const sessions = await db
        .query("authSessions")
        .withIndex("userId", (q) => q.eq("userId", userId))
        .collect();
      for (const session of sessions) {
        const tokens = await db
          .query("authRefreshTokens")
          .withIndex("sessionIdAndParentRefreshTokenId", (q) =>
            q.eq("sessionId", session._id),
          )
          .collect();
        for (const token of tokens) await db.delete(token._id);
        await db.delete(session._id);
      }
    },
  },
});
