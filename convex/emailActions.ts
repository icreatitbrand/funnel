"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

/*
  Transactional email via Brevo. No emojis anywhere (PRD 7.4).

  If BREVO_API_KEY is not set (local development before Brevo is wired up),
  the email content is written to the Convex function logs instead so the
  signup/OTP flow stays testable end to end.
*/

const MAX_LOG_CODE_LENGTH = 8; // paranoia bound for logged codes

export const sendEmail = internalAction({
  args: {
    to: v.string(),
    kind: v.union(v.literal("otp")),
    code: v.optional(v.string()),
    firstName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.BREVO_API_KEY;
    const firstName = args.firstName?.trim();
    const greeting = firstName ? `Hi ${firstName},` : "Hi,";

    let subject: string;
    let text: string;
    if (args.kind === "otp" && args.code) {
      subject = "Your AI Foundry sign-in code";
      text = [
        greeting,
        "",
        `Your one-time code is: ${args.code}`,
        "",
        "It expires in 15 minutes. Enter it on the sign-in page to continue.",
        "",
        "If you did not request this code, you can ignore this email.",
        "",
        "Icreatit Brand Limited",
        "support@icreatitbrandagency.com",
      ].join("\n");
    } else {
      throw new Error("Unknown email kind or missing code");
    }

    if (!apiKey) {
      const safeCode =
        args.code && args.code.length <= MAX_LOG_CODE_LENGTH
          ? args.code
          : "(omitted)";
      console.log(`[brevo-dev-fallback] OTP for ${args.to}: ${safeCode}`);
      return;
    }

    const fromName = process.env.EMAIL_FROM_NAME ?? "Icreatit Brand Limited";
    const fromEmail =
      process.env.EMAIL_FROM_EMAIL ?? "noreply@icreatitbrandagency.com";

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: args.to }],
        subject,
        textContent: text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Brevo email send failed (${response.status}): ${detail}`);
    }
  },
});
