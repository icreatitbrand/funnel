import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

/*
  Delayed nudges (PRD 6.9, Phase 5), run hourly by convex/crons.ts:

  - 24h WhatsApp nudge: users whose email verified ~24h ago but have NOT yet
    clicked the WhatsApp step.
  - 48h referral nudge: users verified ~48h ago with still zero valid
    referrals.

  Each fires once per lifetime thanks to the deterministic sendKey claimed in
  convex/emails.ts (emailSends). Unsubscribed users are auto-skipped there.
  The windows are widened to plus/minus 5h so an hourly cron never misses a
  user, and the claim makes double-sends impossible anyway.
*/

const HOUR = 60 * 60 * 1000;

function inWindow(now: number, targetHours: number): [number, number] {
  const center = targetHours * HOUR;
  return [now - center - 5 * HOUR, now - center + 5 * HOUR];
}

export const sendDueWhatsapp24h = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const [lo, hi] = inWindow(now, 24);
    // v1: scan users (lead counts are small); by_emailVerifiedAt index is a
    // documented future optimization for launch scale.
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      const verified = user.emailVerifiedAt ?? 0;
      if (verified < lo || verified > hi) continue;
      if (user.whatsappClickedAt !== undefined) continue;
      await ctx.runMutation(internal.emails.claimAndSend, {
        sendKey: `nudge_whatsapp_24h:${user._id}`,
        template: "nudge_whatsapp_24h",
        userId: user._id,
        params: {
          firstName: user.firstName,
          validReferralCount: user.validReferralCount,
        },
      });
    }
  },
});

export const sendDueReferral48h = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const [lo, hi] = inWindow(now, 48);
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      const verified = user.emailVerifiedAt ?? 0;
      if (verified < lo || verified > hi) continue;
      if (user.validReferralCount > 0) continue;
      await ctx.runMutation(internal.emails.claimAndSend, {
        sendKey: `nudge_referral_48h:${user._id}`,
        template: "nudge_referral_48h",
        userId: user._id,
        params: {
          firstName: user.firstName,
          validReferralCount: user.validReferralCount,
        },
      });
    }
  },
});
