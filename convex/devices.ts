import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";

/*
  Trusted-device sign-in.

  - issueToken: called by a signed-in client (it just proved its email with a
    code, or it is already signed in) to remember this device.
  - touch: keeps the device "seen" while the user is active, so the 7-day
    window counts from the last visit, not from the original code.
  - consume: used by the "device" sign-in provider. It succeeds only when the
    token belongs to the user with this email, the device was seen within the
    last 7 days, and the account is verified.

  Tokens are 256-bit random values; only their SHA-256 hash is stored.
*/

export const DEVICE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_DEVICES_PER_USER = 3;

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const issueToken = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in.");
    const now = Date.now();

    // Keep only the most recent few devices per user.
    const existing = await ctx.db
      .query("trustedDevices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    existing.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    for (const old of existing.slice(MAX_DEVICES_PER_USER - 1)) {
      await ctx.db.delete(old._id);
    }

    const token = newToken();
    await ctx.db.insert("trustedDevices", {
      userId,
      tokenHash: await sha256Hex(token),
      createdAt: now,
      lastSeenAt: now,
    });
    return token;
  },
});

export const touch = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const hash = await sha256Hex(args.token);
    const found = await ctx.db
      .query("trustedDevices")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", hash))
      .unique();
    if (!found || found.userId !== userId) return false;
    await ctx.db.patch(found._id, { lastSeenAt: Date.now() });
    return true;
  },
});

export const consume = internalMutation({
  args: { email: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const hash = await sha256Hex(args.token);
    const device = await ctx.db
      .query("trustedDevices")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", hash))
      .unique();
    if (!device) return null;
    const now = Date.now();
    if (now - device.lastSeenAt > DEVICE_WINDOW_MS) return null;

    const user = await ctx.db.get(device.userId);
    if (!user || user.emailVerifiedAt === undefined || !user.consentAt) {
      return null;
    }
    if ((user.email ?? "").toLowerCase().trim() !== args.email.toLowerCase().trim()) {
      return null;
    }
    await ctx.db.patch(device._id, { lastSeenAt: now });
    return user._id;
  },
});
