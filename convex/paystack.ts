"use node";

/*
  Paystack webhook verification (PRD 6.7) - Node runtime module.

  HMAC-SHA512 signature verification requires node:crypto, which is only
  available in Convex "use node" files. The http router (convex/http.ts)
  hands the raw body + signature header to `verifyAndConfirm`, this module
  verifies and, for valid charge.success events, confirms the payment and
  applies unlocks (via the payments internal mutation).
*/

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { createHmac, timingSafeEqual } from "node:crypto";

type WebhookEvent = {
  event?: string;
  data?: { reference?: string; amount?: number; channel?: string };
};

export type VerifyResult =
  | "missing_secret"
  | "bad_signature"
  | "ignored_event"
  | "bad_payload"
  | "payment_not_found"
  | "amount_mismatch"
  | "already_confirmed"
  | "confirmed";

/**
 * Internal action: verify the Paystack HMAC signature (needs node:crypto),
 * then hand a verified charge.success reference to the payments engine.
 */
export const verifyAndConfirm = internalAction({
  args: { rawBody: v.string(), signature: v.string() },
  handler: async (ctx, args): Promise<VerifyResult> => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return "missing_secret";

    const expected = createHmac("sha512", secret).update(args.rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(args.signature);
    if (!args.signature || a.length !== b.length || !timingSafeEqual(a, b)) {
      return "bad_signature";
    }

    let event: WebhookEvent;
    try {
      event = JSON.parse(args.rawBody);
    } catch {
      return "bad_payload";
    }

    if (event.event !== "charge.success" || !event.data?.reference) {
      return "ignored_event";
    }

    const result = await ctx.runMutation(internal.payments.confirmByReference, {
      reference: event.data.reference,
      paystackAmountKobo: event.data.amount,
      paystackMeta: {
        event: event.event,
        channel: event.data.channel ?? undefined,
        receivedAt: Date.now(),
      },
    });
    if (result === "confirmed") return "confirmed";
    if (result === "already_confirmed") return "already_confirmed";
    if (result === "amount_mismatch") return "amount_mismatch";
    return "payment_not_found";
  },
});
