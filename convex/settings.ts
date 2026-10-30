import type { QueryCtx } from "./_generated/server";
import { DEFAULT_COUNTRY_CODE } from "../lib/validation";

/*
  Runtime-editable configuration (PRD Section 8 `settings` table).
  Missing keys fall back to these defaults so the funnel stays usable
  before any seed runs; ops can update rows via the Convex dashboard.
*/

export const DEFAULT_SETTINGS = {
  whatsappNumber: "2348000000000", // placeholder; digits only, no +
  whatsappMessageTemplate:
    "Hi Icreatit! I just joined the AI Foundry and Grant Winning Course. My name is {firstName} {surname}, my email is {email}.",
  telegramInviteMode: "static", // "bot" | "static" (Phase 5 wires the bot)
  telegramGroupLink: "",
  maxCeoCallsPerWeek: 15,
  launchDate: 0,
} satisfies Record<string, string | number>;

export type SettingsKey = keyof typeof DEFAULT_SETTINGS;
export type FunnelSettings = Record<SettingsKey, string | number>;

export async function getSettings(ctx: QueryCtx): Promise<FunnelSettings> {
  const rows = await ctx.db.query("settings").collect();
  const map: FunnelSettings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in map) {
      map[row.key as SettingsKey] = row.value as string | number;
    }
  }
  return map;
}

/** Country dial codes offered in the signup phone field. */
export { DEFAULT_COUNTRY_CODE };
