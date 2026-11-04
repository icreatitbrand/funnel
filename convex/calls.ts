import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { getSettings } from "./settings";

/*
  CEO one-on-one strategy call (PRD 6.8, Phase 5):

  - Booking is a server-enforced unlock (ceoCallUnlockedAt at 10 referrals).
  - v1 uses a simple slot-picking flow (native datetime input) instead of a
    Cal.com/Calendly embed; swap `bookCall` internals behind an embed later.
  - Weekly capacity: `maxCeoCallsPerWeek` from settings counts pending or
    booked calls whose requested slot falls in the ISO week of the request
    (Monday-anchored, Lagos time = UTC+1). Extra requests beyond capacity
    return a clear waitlist message (PRD 7.3 "slots available" states).
  - Every create/reschedule/cancel notifies the CEO by email with the user's
    name, email, referral stats and the slot (PRD 6.9 required notification).
  - `ceo_booking_click` event is recorded when the booking UI opens.
*/

const MAX_UNCOMPLETED_PER_USER = 1; // one upcoming booking per user in v1

export const myCallBooking = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const rows = await ctx.db
      .query("callBookings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const active = rows
      .filter((r) => r.status === "booked")
      .sort((a, b) => b.updatedAt ?? b.createdAt - (a.updatedAt ?? a.createdAt));
    return active[0] ?? null;
  },
});

/** Booked rows must not double-book the user's slot. */
async function hasActiveBooking(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<boolean> {
  const rows = await ctx.db
    .query("callBookings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  return rows.some((r) => r.status === "booked");
}

export const bookCall = mutation({
  args: { requestedFor: v.number() },
  handler: async (ctx, args): Promise<{ booked: true } | { booked: false; reason: string }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not signed in.");
    const user = await ctx.db.get(userId);
    if (user === null) throw new ConvexError("Unknown user.");
    if (user.ceoCallUnlockedAt === undefined) {
      throw new ConvexError(
        "The CEO call unlocks at 10 valid referrals. Keep going - you are closer than it feels.",
      );
    }
    if (await hasActiveBooking(ctx, userId)) {
      return { booked: false, reason: "You already have an upcoming call. Reschedule or cancel it first." };
    }

    // Reject obviously invalid slots: waking the CEO at 3am or booking the past.
    const hourLagos = new Date(args.requestedFor + 60 * 60 * 1000).getUTCHours();
    if (args.requestedFor < Date.now() - 60 * 1000) {
      return { booked: false, reason: "Pick a time in the future." };
    }
    if (hourLagos < 7 || hourLagos >= 20) {
      return { booked: false, reason: "Pick a call time between 7am and 8pm." };
    }

    const settings = await getSettings(ctx);
    const maxPerWeek = Number(settings.maxCeoCallsPerWeek) || 15;
    const weekStart = startOfWeek(args.requestedFor);
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
    const all = await ctx.db.query("callBookings").collect();
    const bookedThatWeek = all.filter(
      (r) =>
        r.status === "booked" &&
        r.scheduledFor >= weekStart &&
        r.scheduledFor < weekEnd,
    ).length;
    if (bookedThatWeek >= maxPerWeek) {
      return {
        booked: false,
        reason:
          "That week is fully booked. Send an email to book into the next open week.",
      };
    }

    const now = Date.now();
    const booking = await ctx.db.insert("callBookings", {
      userId,
      scheduledFor: args.requestedFor,
      status: "booked",
      createdAt: now,
    });
    await ctx.db.insert("events", {
      userId,
      type: "ceo_call_booked",
      meta: { scheduledFor: args.requestedFor, bookingId: booking },
      createdAt: now,
    });
    await notifyCEOWithKey(
      ctx,
      user,
      "ceo_new_booking",
      `ceo_new_booking:${booking}`,
      {
        slot: isoLagos(args.requestedFor),
        bookedAt: isoLagos(now),
      },
    );
    return { booked: true };
  },
});

export const rescheduleCall = mutation({
  args: { bookingId: v.id("callBookings"), requestedFor: v.number() },
  handler: async (ctx, args): Promise<{ booked: true } | { booked: false; reason: string }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not signed in.");
    const booking = await ctx.db.get(args.bookingId);
    if (booking === null || booking.userId !== userId) {
      throw new ConvexError("Booking not found.");
    }
    if (booking.status !== "booked") {
      throw new ConvexError("Only upcoming calls can be rescheduled.");
    }
    if (args.requestedFor < Date.now() - 60 * 1000) {
      return { booked: false, reason: "Pick a time in the future." };
    }
    const hourLagos = new Date(args.requestedFor + 60 * 60 * 1000).getUTCHours();
    if (hourLagos < 7 || hourLagos >= 20) {
      return { booked: false, reason: "Pick a call time between 7am and 8pm." };
    }
    const now = Date.now();
    await ctx.db.patch(args.bookingId, {
      scheduledFor: args.requestedFor,
      updatedAt: now,
    });
    const user = await ctx.db.get(userId);
    if (user !== null) {
      await notifyCEOWithKey(ctx, user, "ceo_booking_changed", `ceo_changed:${args.bookingId}-${now}`, {
        slot: isoLagos(args.requestedFor),
      });
    }
    return { booked: true };
  },
});

export const cancelCall = mutation({
  args: { bookingId: v.id("callBookings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not signed in.");
    const booking = await ctx.db.get(args.bookingId);
    if (booking === null || booking.userId !== userId) {
      throw new ConvexError("Booking not found.");
    }
    if (booking.status !== "booked") return;
    const now = Date.now();
    await ctx.db.patch(args.bookingId, { status: "cancelled", updatedAt: now });
    const user = await ctx.db.get(userId);
    if (user !== null) {
      await notifyCEOWithKey(ctx, user, "ceo_booking_cancelled", `ceo_cancelled:${args.bookingId}-${now}`, {
        slot: isoLagos(booking.scheduledFor),
      });
    }
  },
});

/** `ceo_booking_click` fires when the user opens the booking UI (PRD 6.8). */
export const recordBookingOpen = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    await ctx.db.insert("events", {
      userId,
      type: "ceo_booking_click",
      createdAt: Date.now(),
    });
  },
});

/* --------------------------------- helpers --------------------------------- */

function startOfWeek(ms: number): number {
  // Monday 00:00 Lagos time (UTC+1) anchored week.
  const lagos = new Date(ms + 60 * 60 * 1000);
  const day = (lagos.getUTCDay() + 6) % 7; // Mon=0
  lagos.setUTCDate(lagos.getUTCDate() - day);
  lagos.setUTCHours(0, 0, 0, 0);
  return lagos.getTime() - 60 * 60 * 1000;
}

function isoLagos(ms: number): string {
  return new Date(ms).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function notifyCEOWithKey(
  ctx: MutationCtx,
  user: Doc<"users">,
  template: "ceo_new_booking" | "ceo_booking_changed" | "ceo_booking_cancelled",
  sendKey: string,
  extra: Record<string, string>,
): Promise<void> {
  const ceoEmail = process.env.CEO_NOTIFICATION_EMAIL;
  if (!ceoEmail) {
    console.log(
      `[calls-dev-fallback] no CEO_NOTIFICATION_EMAIL set; ${template}: ${user.firstName} ${user.surname} <${user.email}> referrals=${user.validReferralCount} ${extra.slot ?? ""}`,
    );
    return;
  }
  await ctx.runMutation(internal.emails.claimAndSend, {
    sendKey,
    template,
    toOverride: ceoEmail,
    params: {
      firstName: "",
      validReferralCount: user.validReferralCount,
      extra: {
        name: `${user.firstName} ${user.surname}`.trim(),
        userEmail: user.email,
        ...extra,
      },
    },
  });
}
