import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import {
  DEFAULT_COUNTRY_CODE,
  GENDER_VALUES,
  REFERRAL_ALPHABET,
  REFERRAL_CODE_RE,
  isDisposableEmail,
  isValidDescription,
  isValidEmail,
  isValidName,
  normalizeEmail,
  normalizeGender,
  normalizePhone,
} from "../lib/validation";

/*
  Signup + referral attribution (PRD 6.1, 6.4).

  A signup starts as a PENDING user document (no credentials, not verified).
  After the email code is verified, Convex Auth attaches the account to this
  same document (see convex/auth.ts createOrUpdateUser) and sets
  emailVerifiedAt. That is the moment a signup becomes a valid referral for
  the referrer (enforced again by the referral engine, Phase 3).

  Note: unique constraints are enforced here (the while-loop for referral
  codes) or by explicit index lookups, because Convex schemas cannot declare
  column constraints themselves.
*/

export const createPendingProfile = mutation({
  args: {
    firstName: v.string(),
    surname: v.string(),
    countryCode: v.string(),
    phoneNational: v.string(),
    email: v.string(),
    gender: v.string(),
    businessDescription: v.string(),
    consent: v.boolean(),
    refCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // ---- Field-level validation (mirror of the client checks) ----
    if (!isValidName(args.firstName)) {
      throw new ConvexError("Invalid first name.");
    }
    if (!isValidName(args.surname)) {
      throw new ConvexError("Invalid surname.");
    }
    const email = normalizeEmail(args.email);
    if (!isValidEmail(email)) {
      throw new ConvexError("Invalid email address.");
    }
    if (isDisposableEmail(email)) {
      throw new ConvexError(
        "This email provider is not accepted. Please use a different email.",
      );
    }
    const phone = normalizePhone(
      args.countryCode || DEFAULT_COUNTRY_CODE,
      args.phoneNational,
    );
    if (!phone) {
      throw new ConvexError("Invalid phone number.");
    }
    const gender = normalizeGender(args.gender);
    if (!gender || !GENDER_VALUES.includes(gender)) {
      throw new ConvexError("Select a valid gender option.");
    }
    if (!isValidDescription(args.businessDescription)) {
      throw new ConvexError(
        "Business description must be 20-300 characters.",
      );
    }
    if (!args.consent) {
      throw new ConvexError("Consent is required to sign up.");
    }

    // ---- Uniqueness: email and phone ----
    const byEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    const verified = byEmail.find((u) => u.emailVerifiedAt !== undefined);
    if (verified) {
      throw new ConvexError(
        "An account with this email already exists. Please sign in instead.",
      );
    }
    // An unverified (pending) signup from an earlier attempt is updated
    // in place instead of rejected, so retries keep the visitor's latest
    // details and never leave them stuck without a code.
    const pendingProfile = byEmail.find(
      (u) => u.emailVerifiedAt === undefined,
    );

    const byPhone = (await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone.e164))
      .collect()).filter((u) => u._id !== pendingProfile?._id);
    if (byPhone.length > 0) {
      throw new ConvexError(
        "This phone number is already in use. Please use a different number.",
      );
    }

    // ---- Referral attribution (immutable once set) ----
    const rawRefCode = (args.refCode ?? "").trim().toUpperCase();

    if (pendingProfile) {
      // Keep the original referral attribution; refresh editable fields.
      await ctx.db.patch(pendingProfile._id, {
        firstName: args.firstName.trim(),
        surname: args.surname.trim(),
        phone: phone.e164,
        gender,
        businessDescription: args.businessDescription.trim(),
      });
      return { inviteReferralCode: pendingProfile.referralCode };
    }

    let referredBy: { _id: any; _creationTime: number } | undefined;
    if (rawRefCode) {
      if (!REFERRAL_CODE_RE.test(rawRefCode)) {
        throw new ConvexError("Invalid referral code.");
      }
      const referrer = (
        await ctx.db
          .query("users")
          .withIndex("by_referralCode", (q) =>
            q.eq("referralCode", rawRefCode),
          )
          .first()
      );
      if (referrer) {
        // Self-referral block: same email or phone as the referrer.
        const isSelfReferral =
          referrer.email === email || referrer.phone === phone.e164;
        if (!isSelfReferral) {
          referredBy = referrer;
        }
      }
    }

    // ---- Unique referral code generation (bounded search) ----
    let referralCode = "";
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = randomReferralCode(7);
      const clash = await ctx.db
        .query("users")
        .withIndex("by_referralCode", (q) => q.eq("referralCode", candidate))
        .first();
      if (!clash) {
        referralCode = candidate;
        break;
      }
    }
    if (!referralCode) {
      throw new ConvexError(
        "Could not generate a referral code. Try again in a moment.",
      );
    }

    // ---- Create the pending profile ----
    const userId = await ctx.db.insert("users", {
      firstName: args.firstName.trim(),
      surname: args.surname.trim(),
      email,
      phone: phone.e164,
      gender,
      businessDescription: args.businessDescription.trim(),
      referralCode,
      referredBy: referredBy?._id,
      validReferralCount: 0,
      consentAt: now,
      role: "user",
      flagged: false,
      createdAt: now,
    });

    if (referredBy) {
      await ctx.db.insert("referrals", {
        referrerId: referredBy._id,
        referredUserId: userId,
        status: "pending", // valid only after email verification
        createdAt: now,
        // ipHash intentionally omitted: IP capture is deferred to a later
        // phase (needs an ingress hop that can see client IPs).
      });
    }

    await ctx.db.insert("events", {
      userId,
      type: "signup",
      meta: { referred: Boolean(referredBy) },
      createdAt: now,
    });

    return { inviteReferralCode: referralCode };
  },
});

function randomReferralCode(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const byte of bytes) {
    out += REFERRAL_ALPHABET[byte % REFERRAL_ALPHABET.length];
  }
  return out;
}
