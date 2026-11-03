import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getSettings } from "./settings";

/*
  Payments (PRD 6.7). Paystack is the only provider; nothing unlocks until
  the payment is confirmed SERVER-SIDE:

  1. `initializePayment` (action): creates a payments row (status initialized)
     and asks Paystack for a hosted checkout URL. The paid section only
     appears after video-2 engagement; enforced here as well.
  2. The Paystack webhook (convex/http.ts -> paymentWebhook) verifies the
     signature and the amount, then confirms and applies unlocks.
  3. `ops.confirmPayment` (convex/ops.ts) is the manual fallback for edge
     cases, protected by the ops secret.

  Unlock rules: plan "pdf" -> paidPdfUnlockedAt only.
                plan "bundle" -> paidPdfUnlockedAt + whatsappGroup +
                                telegramGroup.
  No upgrade path in v1 (PRD 6.7).
*/

const PAYSTACK_HOST = "https://api.paystack.co";

function randomReference(): string {
  return `icf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Applies the unlocks for a confirmed payment. Server-side only. */
export async function applyPaidUnlocks(
  ctx: MutationCtx,
  payment: { userId: Id<"users">; plan: "pdf" | "bundle" },
): Promise<void> {
  const now = Date.now();
  const patch: Record<string, number> = { paidPdfUnlockedAt: now };
  if (payment.plan === "bundle") {
    patch.whatsappGroupUnlockedAt = now;
    patch.telegramGroupUnlockedAt = now;
  }
  await ctx.db.patch(payment.userId, patch);
  await ctx.db.insert("events", {
    userId: payment.userId,
    type: "payment_confirmed",
    meta: { plan: payment.plan },
    createdAt: now,
  });
}

export const loadUserForPayment = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.userId);
  },
});

export const createPendingPayment = internalMutation({
  args: {
    userId: v.id("users"),
    plan: v.union(v.literal("pdf"), v.literal("bundle")),
    amountNaira: v.number(),
    reference: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"payments">> => {
    await ctx.db.insert("events", {
      userId: args.userId,
      type: "payment_initialized",
      meta: { plan: args.plan, reference: args.reference },
      createdAt: Date.now(),
    });
    return ctx.db.insert("payments", {
      userId: args.userId,
      plan: args.plan,
      amountNaira: args.amountNaira,
      provider: "paystack",
      reference: args.reference,
      status: "initialized",
      initializedAt: Date.now(),
    });
  },
});

/** Marks a reference confirmed and applies unlocks (amount already verified). */
export const confirmByReference = internalMutation({
  args: {
    reference: v.string(),
    paystackAmountKobo: v.optional(v.number()),
    paystackMeta: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<"confirmed" | "not_found" | "already_confirmed" | "amount_mismatch"> => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .first();
    if (payment === null) return "not_found";
    if (payment.status === "confirmed") return "already_confirmed";

    const now = Date.now();
    if (payment.status === "failed") {
      await ctx.db.patch(payment._id, { status: "initialized" });
    }

    const expectedKobo = payment.amountNaira * 100;
    if (
      args.paystackAmountKobo !== undefined &&
      args.paystackAmountKobo !== expectedKobo
    ) {
      await ctx.db.patch(payment._id, {
        status: "failed",
        meta: { expectedKobo, receivedKobo: args.paystackAmountKobo },
      });
      return "amount_mismatch";
    }

    await ctx.db.patch(payment._id, {
      status: "confirmed",
      confirmedAt: now,
      meta: args.paystackMeta ?? undefined,
    });
    await applyPaidUnlocks(ctx, { userId: payment.userId, plan: payment.plan });
    return "confirmed";
  },
});

export const myPayments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return ctx.db
      .query("payments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

/** Marks a payment row failed (client-reported abandon) - bookkeeping only. */
export const markFailed = mutation({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not signed in.");
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .first();
    if (payment === null || payment.userId !== userId) {
      throw new ConvexError("Payment not found.");
    }
    if (payment.status === "initialized") {
      await ctx.db.patch(payment._id, { status: "failed" });
    }
  },
});

/** Client handoff: create the payment row, then get the checkout URL. */
export const initializePayment = action({
  args: { plan: v.union(v.literal("pdf"), v.literal("bundle")) },
  handler: async (
    ctx,
    args,
  ): Promise<{ authorizationUrl: string; reference: string }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not signed in.");

    const user = await ctx.runQuery(internalLoadUser, { userId });
    if (user === null) throw new ConvexError("Unknown user.");
    if (user.video2EngagedAt === undefined) {
      throw new ConvexError("Watch module 2 to unlock the paid packages.");
    }
    if (user.paidPdfUnlockedAt !== undefined) {
      throw new ConvexError("You already have the PDF book.");
    }

    const settings = await getSettings(ctx as unknown as QueryCtx);
    const amountNaira =
      args.plan === "pdf"
        ? Number(settings.pdfPriceNaira)
        : Number(settings.bundlePriceNaira);
    if (!amountNaira || Number.isNaN(amountNaira)) {
      throw new ConvexError("Payment amounts are not configured.");
    }

    const reference = randomReference();
    await ctx.runMutation(internalCreatePending, {
      userId,
      plan: args.plan,
      amountNaira,
      reference,
    });

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      throw new ConvexError(
        "Payments are not configured yet. Contact support to pay manually.",
      );
    }

    const siteUrl = process.env.SITE_URL ?? "";
    const body: Record<string, unknown> = {
      email: user.email,
      amount: amountNaira * 100, // Naira -> Kobo
      currency: "NGN",
      reference,
      metadata: { plan: args.plan, userId, referralCode: user.referralCode },
    };
    if (siteUrl) body.callback_url = `${siteUrl}/dashboard`;

    const res = await fetch(`${PAYSTACK_HOST}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new ConvexError(
        `Paystack initialize failed: ${res.status} ${errBody.slice(0, 200)}`,
      );
    }
    const payload = (await res.json()) as {
      status: string;
      data?: { authorization_url?: string; reference?: string };
    };
    if (payload.status !== "success" || !payload.data?.authorization_url) {
      throw new ConvexError("Paystack did not return a checkout link.");
    }
    return {
      authorizationUrl: payload.data.authorization_url,
      reference: payload.data.reference ?? reference,
    };
  },
});

/** Internal references resolved via the generated module map. */
const internalLoadUser = internal.payments.loadUserForPayment;
const internalCreatePending = internal.payments.createPendingPayment;
