import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { getSettings } from "./settings";

/*
  Paid Telegram group access (PRD 6.7, PRD Phase 5).

  - mode "bot" (settings.paidTelegramInviteMode): generates a SINGLE-USE
    one-member invite link via the bot API (createChatInviteLink,
    member_limit=1) for every join click, so links cannot be re-shared.
    Requires TELEGRAM_BOT_TOKEN + the group chat id
    (settings.paidTelegramChatId) and the bot added to the group.
  - mode "static" (default fallback): returns the settings-paid link; the CEO
    moderates manually (WhatsApp-style).
  - The click event `telegram_join_clicked` is recorded, and links are issued
    ONLY to users whose bundle payment was verified (server-unlocked).

  The WhatsApp group link stays static by design (manual moderation), served
  from settings via the dashboard after unlock. Network calls live in the
  action because the default runtime forbids fetch in mutations/queries.
*/

export const getGroupLink = action({
  args: {},
  handler: async (ctx): Promise<{ link: string; mode: "bot" | "static" }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not signed in.");
    const user = await ctx.runQuery(internal.telegram.loadUser, { userId });
    if (user === null) throw new ConvexError("Unknown user.");
    if (user.telegramGroupUnlockedAt === undefined) {
      throw new ConvexError(
        "The Telegram group unlocks after a verified bundle payment.",
      );
    }

    await ctx.runMutation(internal.telegram.recordJoinClick, { userId });

    const settings = await ctx.runQuery(internal.telegram.loadSettings, {});
    const staticLink = String(settings.paidTelegramGroupLink);
    const mode = String(settings.paidTelegramInviteMode) === "bot" ? "bot" : "static";

    if (mode === "static") {
      if (!staticLink) {
        throw new ConvexError(
          "The group link is being prepared - check back shortly.",
        );
      }
      return { link: staticLink, mode };
    }

    if (!process.env.TELEGRAM_BOT_TOKEN || !String(settings.paidTelegramChatId)) {
      console.log(
        "[telegram-dev-fallback] bot mode requested but TELEGRAM_BOT_TOKEN or paidTelegramChatId missing; using the static link",
      );
    } else {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/createChatInviteLink`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: String(settings.paidTelegramChatId),
              member_limit: 1, // single use (PRD Phase 5)
              name: "AI Foundry bundle member",
            }),
          },
        );
        const body = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          result?: { invite_link?: string };
          description?: string;
        };
        if (res.ok && body.ok && body.result?.invite_link) {
          return { link: body.result.invite_link, mode: "bot" };
        }
        console.error(
          `[telegram] invite link API error: ${res.status} ${body.description ?? ""}`,
        );
      } catch (err) {
        console.error(
          `[telegram] createChatInviteLink failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (!staticLink) {
      throw new ConvexError(
        "The group link is being prepared - check back shortly.",
      );
    }
    return { link: staticLink, mode: "static" };
  },
});

export const loadUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.userId);
  },
});

export const loadSettings = internalQuery({
  args: {},
  handler: async (ctx) => {
    return getSettings(ctx);
  },
});

export const recordJoinClick = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.insert("events", {
      userId: args.userId,
      type: "telegram_join_clicked",
      createdAt: Date.now(),
    });
  },
});
