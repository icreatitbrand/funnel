import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { recountReferrer } from "./referrals";
import { getSettings } from "./settings";

/*
  Dashboard data + WhatsApp step + video engagement (PRD 6.2, 6.3, 6.5).

  Every unlock decision here is computed server-side from stored state; the
  UI only reflects it. The WhatsApp step records the click; the platform
  cannot know whether the message was actually sent (PRD 6.3 limitation).
  Video engagement is recorded once (video1 start, video2 ~50% playback).
  Paid unlocks come from convex/payments.ts only.
*/

const VIDEO_REFERRALS = 1;
const PDF_REFERRALS = 3;
const CEO_CALL_REFERRALS = 10;

export const AVATAR_PRESETS = [
  "sage",
  "slate",
  "amber",
  "rose",
  "sky",
  "violet",
] as const;

export type Level = "Explorer" | "Connector" | "Builder" | "Scaler";

function levelFor(user: Doc<"users">): Level {
  if (user.validReferralCount >= 10) return "Scaler";
  if (user.validReferralCount >= PDF_REFERRALS) return "Builder";
  if (
    user.videoUnlockedAt !== undefined
  ) {
    return "Connector";
  }
  return "Explorer";
}

function nextGoalFor(user: Doc<"users">): {
  text: string;
  referralsRemaining: number;
} {
  if (user.validReferralCount < VIDEO_REFERRALS) {
    return {
      text:
        user.whatsappClickedAt === undefined
          ? "Send the CEO's WhatsApp message and refer 1 friend to unlock the video modules."
          : "Refer 1 friend to unlock the video modules.",
      referralsRemaining: VIDEO_REFERRALS - user.validReferralCount,
    };
  }
  if (user.validReferralCount < PDF_REFERRALS) {
    return {
      text: `${PDF_REFERRALS - user.validReferralCount} more referrals to unlock the free course guide.`,
      referralsRemaining: PDF_REFERRALS - user.validReferralCount,
    };
  }
  if (user.validReferralCount < CEO_CALL_REFERRALS) {
    return {
      text: `${CEO_CALL_REFERRALS - user.validReferralCount} more referrals to book your one-on-one CEO strategy call.`,
      referralsRemaining: CEO_CALL_REFERRALS - user.validReferralCount,
    };
  }
  return {
    text: "All referral rewards unlocked. Keep growing your network.",
    referralsRemaining: 0,
  };
}

function maskName(
  firstName: string | undefined,
  surname: string | undefined,
): string {
  const first = (firstName ?? "").trim();
  if (!first) return "A new member";
  const initial = surname?.trim()
    ? `${surname.trim()[0].toUpperCase()}.`
    : "";
  return initial ? `${first} ${initial}` : first;
}

export const getDashboardData = query({
  args: {},
  handler: async (ctx): Promise<DashboardData | null> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const user = await ctx.db.get(userId);
    if (user === null) return null;

    const settings = await getSettings(ctx);

    const referralRows = await ctx.db
      .query("referrals")
      .withIndex("by_referrer", (q) => q.eq("referrerId", userId))
      .collect();

    const referrals: DashboardReferral[] = (await Promise.all(
      referralRows
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (row) => {
          const referred = await ctx.db.get(row.referredUserId);
          return {
            maskedName: maskName(referred?.firstName, referred?.surname),
            joinedAt: row.createdAt,
            status: row.status,
          };
        }),
    )).slice(0, 50);

    const validCount = referrals.filter((r) => r.status === "valid").length;

    return {
      firstName: user.firstName,
      surname: user.surname,
      email: user.email,
      avatarId: user.avatarId ?? "auto",
      referralCode: user.referralCode,
      level: levelFor(user),
      validReferralCount: validCount,
      whatsappClicked: user.whatsappClickedAt !== undefined,
      videosUnlocked: user.videoUnlockedAt !== undefined,
      video1Started: user.video1StartedAt !== undefined,
      video2Engaged: user.video2EngagedAt !== undefined,
      pdfUnlocked: user.pdfUnlockedAt !== undefined,
      paidPdfUnlocked: user.paidPdfUnlockedAt !== undefined,
      whatsappGroupUnlocked: user.whatsappGroupUnlockedAt !== undefined,
      telegramGroupUnlocked: user.telegramGroupUnlockedAt !== undefined,
      ceoCallUnlocked: user.ceoCallUnlockedAt !== undefined,
      ceoWhatsappNumber: String(settings.ceoWhatsappNumber),
      whatsappMessageTemplate: String(settings.whatsappMessageTemplate),
      video1YoutubeUrl: String(settings.video1YoutubeUrl),
      video2YoutubeUrl: String(settings.video2YoutubeUrl),
      paidWhatsappGroupLink: String(settings.paidWhatsappGroupLink),
      paidTelegramGroupLink: String(settings.paidTelegramGroupLink),
      pdfPriceNaira: Number(settings.pdfPriceNaira),
      bundlePriceNaira: Number(settings.bundlePriceNaira),
      referrals,
      nextGoal: nextGoalFor(user),
    };
  },
});

export interface DashboardReferral {
  maskedName: string;
  joinedAt: number;
  status: "pending" | "valid" | "invalid";
}

export interface DashboardData {
  firstName: string;
  surname: string;
  email: string;
  avatarId: string;
  referralCode: string;
  level: Level;
  validReferralCount: number;
  whatsappClicked: boolean;
  videosUnlocked: boolean;
  video1Started: boolean;
  video2Engaged: boolean;
  pdfUnlocked: boolean;
  paidPdfUnlocked: boolean;
  whatsappGroupUnlocked: boolean;
  telegramGroupUnlocked: boolean;
  ceoCallUnlocked: boolean;
  ceoWhatsappNumber: string;
  whatsappMessageTemplate: string;
  video1YoutubeUrl: string;
  video2YoutubeUrl: string;
  paidWhatsappGroupLink: string;
  paidTelegramGroupLink: string;
  pdfPriceNaira: number;
  bundlePriceNaira: number;
  referrals: DashboardReferral[];
  nextGoal: { text: string; referralsRemaining: number };
}

/** PRD 6.3: the click is recorded and the step is marked complete on click. */
export const recordWhatsappClick = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not signed in.");

    const user = await ctx.db.get(userId);
    if (user === null) throw new ConvexError("Unknown user.");

    if (user.whatsappClickedAt === undefined) {
      await ctx.db.patch(userId, { whatsappClickedAt: Date.now() });
      await ctx.db.insert("events", {
        userId,
        type: "whatsapp_click",
        createdAt: Date.now(),
      });
      // The click itself can complete the video unlock together with a
      // valid referral - recompute.
      await recountReferrer(ctx, userId);
    }
  },
});

/** Module 1 playback start (analytics; idempotent). */
export const recordVideo1Started = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not signed in.");

    const user = await ctx.db.get(userId);
    if (user === null) throw new ConvexError("Unknown user.");
    if (user.videoUnlockedAt === undefined) {
      throw new ConvexError("The video modules are still locked.");
    }

    if (user.video1StartedAt === undefined) {
      await ctx.db.patch(userId, { video1StartedAt: Date.now() });
      await ctx.db.insert("events", {
        userId,
        type: "video1_started",
        createdAt: Date.now(),
      });
    }
  },
});

/** Module 2 engaged at ~50% playback, recorded once (PRD 6.5). */
export const recordVideo2Engaged = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not signed in.");

    const user = await ctx.db.get(userId);
    if (user === null) throw new ConvexError("Unknown user.");
    if (user.videoUnlockedAt === undefined) {
      throw new ConvexError("The video modules are still locked.");
    }

    if (user.video2EngagedAt === undefined) {
      await ctx.db.patch(userId, { video2EngagedAt: Date.now() });
      await ctx.db.insert("events", {
        userId,
        type: "video2_engaged",
        createdAt: Date.now(),
      });
    }
  },
});

/** Preset avatar selection (PRD 6.2 block 10; no uploads in v1). */
export const setAvatar = mutation({
  args: { avatarId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not signed in.");

    if (!(AVATAR_PRESETS as readonly string[]).includes(args.avatarId)) {
      throw new ConvexError("Unknown avatar preset.");
    }
    await ctx.db.patch(userId, { avatarId: args.avatarId });
  },
});
