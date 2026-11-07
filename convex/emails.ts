import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalAction, internalMutation, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";

/*
  Brevo transactional email engine (PRD 6.9, Phase 5).

  Every automation email goes through exactly one delivery path:

    1. A mutation (or the cron scheduler) runs `claimAndSend` with a
       deterministic sendKey such as "welcome:{userId}".
    2. `claimAndSend` CLAIMS a row in `emailSends` before anything touches the
       network: a second attempt with the same sendKey returns
       "already_claimed", so double triggers, webhook retries and cron overlaps
       collapse to exactly one send (PRD Phase 5 exit criteria).
    3. claimAndSend schedules `deliverNow` (action) with transactional
       guarantees - it runs only if the claiming mutation commits.
    4. `deliverNow` calls the Brevo SMTP API and then records the outcome via
       `finalizeSend` (mutating history is impossible to do from the action).
    5. If BREVO_API_KEY is not configured, `deliverNow` logs the full content
       to the Convex function logs ([brevo-dev-fallback]) so dev runs stay
       testable without the key. Claims are then marked "sent" with a note.

  Unsubscribe (PRD 6.9): bulk templates honour `unsubscribedAt`; the link is
  /unsubscribe?t={unsubscribeToken}. Account-critical emails (payment
  receipt) and CEO notifications (toOverride) always deliver.

  Rules honoured on every email: no emojis (PRD 7.4), company address,
  unsubscribe line on bulk emails. Text lives in composeTemplate below.
*/

const BREVO_HOST = "https://api.brevo.com/v3";

const COMPANY = "Icreatit Brand Limited";
const COMPANY_ADDRESS = "[Company address placeholder - replace before launch]";
// Verified Brevo sender (info@ is the approved sender address).
const SUPPORT_EMAIL = "info@icreatitbrandagency.com";
const FROM_NAME = "Icreatit Brand Course";

type TemplateId =
  | "welcome"
  | "referral_joined"
  | "videos_unlocked"
  | "guide_unlocked"
  | "ceo_call_unlocked"
  | "payment_confirmed"
  | "nudge_whatsapp_24h"
  | "nudge_referral_48h"
  | "ceo_new_booking"
  | "ceo_booking_changed"
  | "ceo_booking_cancelled";

export type EmailParams = {
  firstName: string;
  validReferralCount: number;
  extra?: Record<string, string>;
};

const BULK_TEMPLATES = new Set<TemplateId>([
  "welcome",
  "referral_joined",
  "videos_unlocked",
  "guide_unlocked",
  "ceo_call_unlocked",
  "nudge_whatsapp_24h",
  "nudge_referral_48h",
]);

function unsubscribeFooter(url: string | null): string {
  return [
    "",
    "---",
    `${COMPANY}, ${COMPANY_ADDRESS}`,
    `Support: ${SUPPORT_EMAIL}`,
    url
      ? `Stop the course emails: ${url}`
      : `You are receiving this because of your account on the course platform.`,
  ].join("\n");
}

/** Plain-text templates (no emojis anywhere, PRD 7.4). */
function composeTemplate(
  template: TemplateId,
  params: EmailParams,
  unsubscribeUrl: string | null,
): { subject: string; text: string } | null {
  const { firstName: first, validReferralCount, extra = {} } = params;
  switch (template) {
    case "welcome":
      return {
        subject: "Welcome to the AI Foundry and Grant Winning Course",
        text:
          `Hello ${first},\n\n` +
          `Welcome to the free AI Foundry and Grant Winning Course.\n\n` +
          `Your next steps on the dashboard:\n` +
          `1. Send the ready-made WhatsApp message to the CEO.\n` +
          `2. Refer one friend with your personal link.\n` +
          `3. Both video modules (about 20 minutes) unlock instantly.` +
          unsubscribeFooter(unsubscribeUrl),
      };
    case "referral_joined":
      return {
        subject: "A friend just joined the course through your link",
        text:
          `Hello ${first},\n\n` +
          `Good news. ${extra.referralName ?? "A new member"} just joined through your referral link and verified their email.\n\n` +
          `Valid referrals so far: ${validReferralCount}. Keep sharing - the free course guide unlocks at 3 and a one-on-one call with the CEO at 10.` +
          unsubscribeFooter(unsubscribeUrl),
      };
    case "videos_unlocked":
      return {
        subject: "Your two video modules are unlocked",
        text:
          `Hello ${first},\n\n` +
          `Both course modules are now unlocked on your dashboard:\n` +
          `- Module 1: How to win business grants\n` +
          `- Module 2: Using AI for your business and marketing on social media\n\n` +
          `Watch them free - together they take about 20 minutes.` +
          unsubscribeFooter(unsubscribeUrl),
      };
    case "guide_unlocked":
      return {
        subject: "Your free course guide is ready to download",
        text:
          `Hello ${first},\n\n` +
          `You reached 3 valid referrals. Your free companion guide for the video modules is unlocked under the videos on your dashboard.` +
          unsubscribeFooter(unsubscribeUrl),
      };
    case "ceo_call_unlocked":
      return {
        subject: "Your one-on-one call with the CEO is unlocked",
        text:
          `Hello ${first},\n\n` +
          `You reached ${validReferralCount} valid referrals. You can now book your one-on-one strategy call with the CEO from your dashboard.` +
          unsubscribeFooter(unsubscribeUrl),
      };
    case "payment_confirmed":
      return {
        subject: "Payment confirmed - your package is unlocked",
        text:
          `Hello ${first},\n\n` +
          `We have confirmed your payment${extra.summary ? `: ${extra.summary}` : ""}. The package is unlocked on your dashboard, guaranteed on our side - nothing depends on a browser refresh. Thank you for your support.` +
          unsubscribeFooter(null),
      };
    case "nudge_whatsapp_24h":
      return {
        subject: "One step left before your course unlocks",
        text:
          `Hello ${first},\n\n` +
          `You are one quick step from unlocking the free video modules: send the ready-made WhatsApp message to the CEO from your dashboard, then refer one friend.` +
          unsubscribeFooter(unsubscribeUrl),
      };
    case "nudge_referral_48h":
      return {
        subject: "Share your link to unlock the videos",
        text:
          `Hello ${first},\n\n` +
          `Your dashboard has your personal link plus ready-made messages for WhatsApp, Telegram, X, Facebook and SMS. The videos unlock after your first valid referral.` +
          unsubscribeFooter(unsubscribeUrl),
      };
    case "ceo_new_booking":
      return {
        subject: "New strategy call booking",
        text:
          `New one-on-one call booking:\n\n` +
          `Name: ${extra.name ?? ""}\n` +
          `Email: ${extra.userEmail ?? ""}\n` +
          `Valid referrals: ${validReferralCount}\n` +
          `Requested slot: ${extra.slot ?? ""}\n` +
          `Booked at: ${extra.bookedAt ?? ""}`,
      };
    case "ceo_booking_changed":
      return {
        subject: "Strategy call rescheduled",
        text:
          `A call booking changed:\n\n` +
          `Name: ${extra.name ?? ""}\n` +
          `Email: ${extra.userEmail ?? ""}\n` +
          `Valid referrals: ${validReferralCount}\n` +
          `New slot: ${extra.slot ?? ""}`,
      };
    case "ceo_booking_cancelled":
      return {
        subject: "Strategy call cancelled",
        text:
          `A call booking was cancelled:\n\n` +
          `Name: ${extra.name ?? ""}\n` +
          `Email: ${extra.userEmail ?? ""}\n` +
          `Valid referrals: ${validReferralCount}\n` +
          `Slot was: ${extra.slot ?? ""}`,
      };
    default:
      return null;
  }
}

/**
 * The single claim-and-schedule path. Called from any mutation after the
 * triggering change, or via the cron scheduler for the nudges.
 */
export const claimAndSend = internalMutation({
  args: {
    sendKey: v.string(),
    template: v.string(),
    userId: v.optional(v.id("users")),
    toOverride: v.optional(v.string()),
    params: v.any(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<"claimed" | "already_claimed" | "skipped"> => {
    const existing = await ctx.db
      .query("emailSends")
      .withIndex("by_sendKey", (q) => q.eq("sendKey", args.sendKey))
      .first();
    if (existing !== null) return "already_claimed";

    let user: Doc<"users"> | null = null;
    if (args.userId !== undefined) user = await ctx.db.get(args.userId);

    // Unsubscribed users: bulk templates stop; account-critical and CEO
    // notification emails (toOverride) always deliver (PRD 6.9).
    const isBulk = (BULK_TEMPLATES as Set<string>).has(args.template);
    if (
      isBulk &&
      args.toOverride === undefined &&
      args.userId !== undefined &&
      user !== null &&
      user.unsubscribedAt !== undefined
    ) {
      await ctx.db.insert("emailSends", {
        sendKey: args.sendKey,
        template: args.template,
        userId: args.userId,
        status: "skipped",
      });
      return "skipped";
    }

    const recipient = args.toOverride ?? user?.email;
    if (!recipient) {
      await ctx.db.insert("emailSends", {
        sendKey: args.sendKey,
        template: args.template,
        userId: args.userId,
        status: "failed",
        error: "no recipient address",
      });
      return "skipped";
    }

    const composed = composeTemplate(
      args.template as TemplateId,
      args.params as EmailParams,
      args.userId !== undefined && args.toOverride === undefined
        ? buildUnsubscribeUrl(user)
        : null,
    );
    if (composed === null) {
      throw new ConvexError(`Unknown email template: ${args.template}`);
    }

    const isCEO =
      args.template === "ceo_new_booking" ||
      args.template === "ceo_booking_changed" ||
      args.template === "ceo_booking_cancelled";

    const sendId = await ctx.db.insert("emailSends", {
      sendKey: args.sendKey,
      template: args.template,
      userId: args.userId,
      status: "queued",
    });

    await ctx.scheduler.runAfter(0, internal.emails.deliverNow, {
      sendId,
      to: recipient,
      fromName: isCEO ? COMPANY : FROM_NAME,
      subject: composed.subject,
      text: composed.text,
      template: args.template,
    });
    return "claimed";
  },
});

/** Low-level Brevo SMTP sender. Dev fallback logs to the function log. */
export const deliverNow = internalAction({
  args: {
    sendId: v.id("emailSends"),
    to: v.string(),
    fromName: v.string(),
    subject: v.string(),
    text: v.string(),
    template: v.string(),
  },
  handler: async (_ctx, args): Promise<void> => {
    const key = process.env.BREVO_API_KEY;
    let result: { ok: boolean; messageId?: string; detail?: string };
    if (!key) {
      console.log(
        `[brevo-dev-fallback] template=${args.template}\nTo: ${args.to}\nSubject: ${args.subject}\n${args.text}`,
      );
      result = { ok: true, messageId: "dev-fallback" };
    } else {
      const res = await fetch(`${BREVO_HOST}/smtp/email`, {
        method: "POST",
        headers: {
          "api-key": key,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender: { name: args.fromName, email: SUPPORT_EMAIL },
          to: [{ email: args.to }],
          subject: args.subject,
          textContent: args.text,
          tags: [args.template],
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        messageId?: string;
        message?: string;
      };
      if (!res.ok) {
        console.error(
          `[brevo] send failed ${res.status}: ${JSON.stringify(body)}`,
        );
        result = { ok: false, detail: `${res.status} ${body.message ?? ""}` };
      } else {
        result = { ok: true, messageId: body.messageId };
      }
    }
    await _ctx.runMutation(internal.emails.finalizeSend, {
      sendId: args.sendId,
      ok: result.ok,
      messageId: result.messageId,
      detail: result.detail,
    });
  },
});

/** Records the outcome of a scheduled delivery attempt. */
export const finalizeSend = internalMutation({
  args: {
    sendId: v.id("emailSends"),
    ok: v.boolean(),
    messageId: v.optional(v.string()),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const send = await ctx.db.get(args.sendId);
    if (send === null) return;
    if (send.status !== "queued") return; // already finalized
    await ctx.db.patch(args.sendId, args.ok
      ? { status: "sent", sentAt: Date.now(), brevoMessageId: args.messageId }
      : { status: "failed", error: args.detail ?? "unknown error" });
  },
});

/**
 * Brevo contact upsert with the full attribute set (PRD 6.9). Attribute
 * names (FIRSTNAME, VIDEO2_ENGAGED, PAYMENT_PLAN, ...) must exist in the
 * Brevo account BEFORE launch; creating them is a Brevo dashboard step.
 */
export const syncContact = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (user === null) return;
    await ctx.scheduler.runAfter(0, internal.emails.pushContact, {
      email: user.email,
      firstName: user.firstName,
      surname: user.surname,
      phone: user.phone,
      gender: user.gender,
      business: user.businessDescription.slice(0, 200),
      referralCode: user.referralCode,
      whatsappClicked: user.whatsappClickedAt !== undefined,
      videoUnlocked: user.videoUnlockedAt !== undefined,
      video2Engaged: user.video2EngagedAt !== undefined,
      validReferralCount: user.validReferralCount,
      paymentDone: user.paidPdfUnlockedAt !== undefined,
      paymentPlan:
        user.whatsappGroupUnlockedAt !== undefined
          ? "bundle"
          : user.paidPdfUnlockedAt !== undefined
            ? "pdf"
            : "",
    });
  },
});

export const pushContact = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
    surname: v.string(),
    phone: v.string(),
    gender: v.string(),
    business: v.string(),
    referralCode: v.string(),
    whatsappClicked: v.boolean(),
    videoUnlocked: v.boolean(),
    video2Engaged: v.boolean(),
    validReferralCount: v.number(),
    paymentDone: v.boolean(),
    paymentPlan: v.string(),
  },
  handler: async (
    _ctx,
    a,
  ): Promise<{ status: "ok" | "missing_key" | "error"; detail?: string }> => {
    const key = process.env.BREVO_API_KEY;
    if (!key) {
      console.log(
        `[brevo-dev-fallback] contact sync (no key): ${a.email} referrals=${a.validReferralCount} plan=${a.paymentPlan}`,
      );
      return { status: "missing_key" };
    }
    const res = await fetch(`${BREVO_HOST}/contacts`, {
      method: "POST",
      headers: {
        "api-key": key,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        email: a.email,
        updateEnabled: true, // upsert
        attributes: {
          FIRSTNAME: a.firstName,
          LASTNAME: a.surname,
          PHONE: a.phone,
          GENDER: a.gender,
          BUSINESS: a.business,
          REF_CODE: a.referralCode,
          WHATSAPP_DONE: a.whatsappClicked ? "yes" : "no",
          VIDEO_UNLOCKED: a.videoUnlocked ? "yes" : "no",
          VIDEO2_ENGAGED: a.video2Engaged ? "yes" : "no",
          REFERRALS: a.validReferralCount,
          PAYMENT_DONE: a.paymentDone ? "yes" : "no",
          PAYMENT_PLAN: a.paymentPlan,
        },
      }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      return { status: "error", detail: `${res.status} ${body}` };
    }
    return { status: "ok" };
  },
});

function buildUnsubscribeUrl(user: Doc<"users"> | null): string | null {
  if (!user?.unsubscribeToken) return null;
  const siteUrl =
    process.env.SITE_URL ?? "https://techhub.icreatitbrandagency.com";
  return `${siteUrl}/unsubscribe?t=${user.unsubscribeToken}`;
}

/** Gives a user an unsubscribe token once (first verification). */
export async function ensureUnsubscribeToken(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<void> {
  const user = await ctx.db.get(userId);
  if (user === null || user.unsubscribeToken !== undefined) return;
  const token = `unsub-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  await ctx.db.patch(userId, { unsubscribeToken: token });
}

/**
 * Public unsubscribe via the /unsubscribe page (PRD 6.9). Token-scoped so no
 * one can unsubscribe another user without their random token.
 */
export const unsubscribeByToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("users").collect();
    const user = rows.find((u) => u.unsubscribeToken === args.token);
    if (user === undefined) {
      throw new ConvexError("This unsubscribe link is not valid.");
    }
    if (user.unsubscribedAt === undefined) {
      await ctx.db.patch(user._id, { unsubscribedAt: Date.now() });
    }
    return user.email;
  },
});
