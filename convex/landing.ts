import { v } from "convex/values";
import { mutation } from "./_generated/server";

/*
  Anonymous landing-page funnel analytics (PRD 5.2): page views, scroll depth,
  per-CTA clicks (1-4 + sticky bar), video facade taps and FAQ opens. No auth
  yet - rows are written with userId = null, which keeps signup-time identity
  separate. The whitelist prevents unbounded garbage rows.
*/

const LANDING_EVENT_TYPES = [
  "landing_view",
  "landing_scroll_75",
  "landing_cta_video",
  "landing_cta_ceo",
  "landing_cta_evidence",
  "landing_cta_final",
  "landing_sticky_cta",
  "landing_video_tap",
  "landing_faq_open",
  "landing_signup_click",
] as const;

export const track = mutation({
  args: {
    type: v.string(),
    meta: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const types: readonly string[] = LANDING_EVENT_TYPES;
    if (!types.includes(args.type)) {
      throw new Error("Unknown landing event type.");
    }
    await ctx.db.insert("events", {
      type: args.type,
      meta: args.meta,
      createdAt: Date.now(),
    });
  },
});
