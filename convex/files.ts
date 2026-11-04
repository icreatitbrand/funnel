import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation } from "./_generated/server";
import { getSettings } from "./settings";

/*
  PDF delivery (PRD 6.6/6.7, PRD Phase 5): the FREE course guide (3 referrals)
  and the PAID book (payment-verified) live in private Convex file storage.
  Access is granted per-request through storage URLs minted server-side, only
  after the respective unlock passes - gated files are unrecoverable
  pre-unlock. Download counts land in funnel analytics events.

  To attach a real PDF: the CEO uploads the file to Convex (Dashboard Storage
  tab, or `npx convex storage`), then runs, in the Functions runner:

    Type a key: setSetting   args: {"key":"freeGuideStorageId","value":"<id>", "opsSecret":"<OPS_SECRET>"}
  ...and the same under key "paidBookStorageId" for the paid book.
*/

export const startGuideDownload = mutation({
  args: {},
  handler: async (ctx): Promise<{ downloadUrl: string }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not signed in.");
    const user = await ctx.db.get(userId);
    if (user === null) throw new ConvexError("Unknown user.");
    if (user.pdfUnlockedAt === undefined) {
      throw new ConvexError(
        "The free guide unlocks at 3 valid referrals. Share your link to get there.",
      );
    }
    return downloadFor(ctx, userId, "guide_download");
  },
});

export const startPaidBookDownload = mutation({
  args: {},
  handler: async (ctx): Promise<{ downloadUrl: string }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not signed in.");
    const user = await ctx.db.get(userId);
    if (user === null) throw new ConvexError("Unknown user.");
    if (user.paidPdfUnlockedAt === undefined) {
      throw new ConvexError("The PDF book unlocks after a verified payment.");
    }
    return downloadFor(ctx, userId, "paid_pdf_download");
  },
});

async function downloadFor(
  ctx: MutationCtx,
  userId: Id<"users">,
  eventType: "guide_download" | "paid_pdf_download",
): Promise<{ downloadUrl: string }> {
  const settings = await getSettings(ctx);
  const storageId = String(
    eventType === "guide_download"
      ? settings.freeGuideStorageId
      : settings.paidBookStorageId,
  );
  if (!storageId) {
    throw new ConvexError(
      "The file is being prepared - check back shortly or contact support.",
    );
  }
  const url: string | null = await ctx.storage
    .getUrl(storageId as never)
    .catch(() => null);
  if (!url) {
    throw new ConvexError(
      "The downloadable file is missing on our side - we are on it. Contact support if this persists.",
    );
  }
  await ctx.db.insert("events", {
    userId,
    type: eventType,
    createdAt: Date.now(),
  });
  return { downloadUrl: url };
}
