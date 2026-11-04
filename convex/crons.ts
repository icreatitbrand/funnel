import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/*
  Scheduled automations (PRD 6.9, Phase 5). The nudge functions themselves are
  deduped by deterministic sendKeys, so hourly cadence overlapping the
  24h/48h windows is safe by construction. Cron entries must reference
  internal functions directly (no inline handlers).
*/
const crons = cronJobs();

// 24h WhatsApp-step nudge sweep.
crons.hourly(
  "nudge-whatsapp-24h",
  { minuteUTC: 17 },
  internal.nudges.sendDueWhatsapp24h,
  {},
);

// 48h referral nudge sweep (offset by a minute to spread load).
crons.hourly(
  "nudge-referral-48h",
  { minuteUTC: 18 },
  internal.nudges.sendDueReferral48h,
  {},
);

export default crons;
