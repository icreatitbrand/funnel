import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { recountReferrer } from "./referrals";
import { getSettings } from "./settings";

/*
  Dashboard data + WhatsApp step (PRD 6.2, 6.3).

  Every unlock decision here is computed server-side by the referral engine
  (convex/referrals.ts) from stored state; the UI only reflects it.
  The WhatsApp step records the click timestamp; the platform cannot know
  whether the message was actually sent (PRD 6.3 documented limitation).
*/

const TELEGRAM_REFERRALS = 1;
const PDF_REFERRALS = 3;
const CEO_CALL_REFERRALS = 10;

export type Level = "Explorer" | "Connector" | "Builder" | "Scaler";

function levelFor(user: Doc<"users">): Level {
  if (user.validReferralCount >= 10) return "Scaler";
  if (user.validReferralCount >= 3) return "Builder";
  if (
    user.whatsappClickedAt !== undefined &&
    user.validReferralCount >= TELEGRAM_REFERRALS
  ) {
    return "Connector";
  }
  return "Explorer";
}

function nextGoalFor(user: Doc<"users">): {
  text: string;
  referralsRemaining: number;
} {
  if (user.validReferralCount < TELEGRAM_REFERRALS) {
    return {
      text:
        user.whatsappClickedAt === undefined
          ? "Send us a WhatsApp message and refer 1 friend to unlock the Telegram group."
          : "Refer 1 friend to unlock the Telegram group.",
      referralsRemaining: TELEGRAM_REFERRALS - user.validReferralCount,
    };
  }
  if (user.validReferralCount < PDF_REFERRALS) {
    return {
      text: `${PDF_REFERRALS - user.validReferralCount} more referrals to unlock the Pre-training PDF guide.`,
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
    text: "All rewards unlocked. Keep growing your network.",
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
      email: user.email,
      referralCode: user.referralCode,
      level: levelFor(user),
      validReferralCount: validCount,
      whatsappClicked: user.whatsappClickedAt !== undefined,
      telegramUnlocked: user.telegramUnlockedAt !== undefined,
      pdfUnlocked: user.pdfUnlockedAt !== undefined,
      ceoCallUnlocked: user.ceoCallUnlockedAt !== undefined,
      whatsappNumber: String(settings.whatsappNumber),
      whatsappMessageTemplate: String(settings.whatsappMessageTemplate),
      telegramGroupLink: String(settings.telegramGroupLink),
      maxCeoCallsPerWeek: Number(settings.maxCeoCallsPerWeek),
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
  email: string;
  referralCode: string;
  level: Level;
  validReferralCount: number;
  whatsappClicked: boolean;
  telegramUnlocked: boolean;
  pdfUnlocked: boolean;
  ceoCallUnlocked: boolean;
  whatsappNumber: string;
  whatsappMessageTemplate: string;
  telegramGroupLink: string;
  maxCeoCallsPerWeek: number;
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
      // The click itself can complete the Telegram unlock together with a
      // valid referral - recompute.
      await recountReferrer(ctx, userId);
    }
  },
});

/** Click on the Telegram join button once unlocked (analytics only). */
export const recordTelegramJoinClick = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not signed in.");

    const user = await ctx.db.get(userId);
    if (
      user === null ||
      user.whatsappClickedAt === undefined ||
      user.validReferralCount < TELEGRAM_REFERRALS
    ) {
      // Attempted join before unlock: logged for abuse review, no unlock.
      if (user !== null) {
        await ctx.db.insert("events", {
          userId,
          type: "telegram_join_blocked",
          createdAt: Date.now(),
        });
      }
      throw new ConvexError("Telegram access is not unlocked yet.");
    }
    await ctx.db.insert("events", {
      userId,
      type: "telegram_join_clicked",
      createdAt: Date.now(),
    });
  },
});
