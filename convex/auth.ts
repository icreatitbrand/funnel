import { convexAuth } from "@convex-dev/auth/server";
import type { AnyDataModel, GenericMutationCtx } from "convex/server";
import type { MutationCtx } from "./_generated/server";
import { ConvexError } from "convex/values";
import { BrevoEmailOTP } from "./BrevoEmailOTP";
import { validateReferralsForUser } from "./referrals";

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
  providers: [BrevoEmailOTP],
  session: {
    totalDurationMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    inactiveDurationMs: 30 * 24 * 60 * 60 * 1000,
  },
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
    },
  },
});
