import { Email } from "@convex-dev/auth/providers/Email";
import { internal } from "./_generated/api";

/*
  Email OTP sign-in provider backed by Brevo.

  Behaviour:
  - A 6-digit code is generated and sent to the user's email address.
  - The code expires after 15 minutes; verifying also requires the matching
    email address (the default `authorize` of the Email provider).
  - Codes are only sent to (a) a pending, unverified signup profile or
    (b) an already verified account. Nobody can request a code for an
    unknown email address (convex/authGate.ts).
  - Per-email send limits are enforced server-side.

  NOTE on `ctx`: Convex Auth does not type the second argument for email
  providers yet, although it passes it at runtime (upstream signIn.js has an
  explicit `@ts-expect-error Figure out typing for email providers...`). We
  type it minimally here instead of opting out of the gate.
*/

interface SendVerificationCtx {
  runMutation: (fn: unknown, args: unknown) => Promise<void>;
  runAction: (fn: unknown, args: unknown) => Promise<void>;
}

export const BrevoEmailOTP = Email({
  id: "brevo-otp",
  apiKey: process.env.BREVO_API_KEY ? "configured" : undefined,
  maxAge: 60 * 15, // 15 minutes
  async generateVerificationToken() {
    const bytes = crypto.getRandomValues(new Uint32Array(1));
    return (bytes[0] % 1_000_000).toString().padStart(6, "0");
  },
  async sendVerificationRequest(
    { identifier, token }: { identifier: string; token: string },
    ctx?: SendVerificationCtx,
  ) {
    if (!ctx) {
      throw new Error("Auth context missing; cannot enforce OTP gate.");
    }
    // Gate + rate limit BEFORE anything is emailed.
    await ctx.runMutation(internal.authGate.requestOtp, {
      email: identifier,
    });
    await ctx.runAction(internal.emailActions.sendEmail, {
      to: identifier,
      kind: "otp",
      code: token,
    });
  },
});
