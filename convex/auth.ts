import { convexAuth } from "@convex-dev/auth/server";
import type { AnyDataModel, GenericMutationCtx } from "convex/server";
import type { MutationCtx } from "./_generated/server";
import { ConvexError } from "convex/values";
import { BrevoEmailOTP } from "./BrevoEmailOTP";

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
      const email = typeof args.profile.email === "string"
        ? args.profile.email.toLowerCase().trim()
        : undefined;

      // Returning user with an existing auth account: sign in as-is.
      if (args.existingUserId !== null) {
        return args.existingUserId;
      }

      // Email or phone verification of an existing account.
      if (args.type === "verification" && email) {
        const db = typedDb(ctx);
        const candidates = await db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", email))
          .collect();

        const pending = candidates.find(
          (u) => u.emailVerifiedAt === undefined,
        );
        if (pending) {
          // Promote the pending signup to a verified account.
          await db.patch(pending._id, { emailVerifiedAt: Date.now() });
          await db.insert("events", {
            userId: pending._id,
            type: "email_verified",
            createdAt: Date.now(),
          });
          return pending._id;
        }

        const verified = candidates.find((u) => u.emailVerifiedAt !== undefined);
        if (verified) {
          return verified._id;
        }

        throw new ConvexError(
          "There is no signup with this email address. Please sign up first.",
        );
      }

      throw new ConvexError("Sign-in method not supported.");
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
