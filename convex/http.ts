import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

/*
  HTTP routes:
  - Convex Auth: JWT verification, JWKS/OpenID discovery endpoints.
    (OAuth routes are inactive because no OAuth providers are configured.)
  - Paystack webhook (PRD 6.7): POST /api/payments/webhook. Paystack signs
    the raw body with HMAC-SHA512 using the SECRET KEY; verification runs in
    the Node runtime (convex/paystack.ts) and only a verified charge.success
    event unlocks anything.
    Configure this URL in the Paystack dashboard.
*/
const http = httpRouter();

auth.addHttpRoutes(http);

/** Paystack -> Convex: payment confirmation, server-verified only. */
http.route({
  path: "/api/payments/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const raw = await request.text();
    const signature = request.headers.get("x-paystack-signature") ?? "";

    let result: string;
    try {
      result = await ctx.runAction(internal.paystack.verifyAndConfirm, {
        rawBody: raw,
        signature,
      });
    } catch {
      return new Response("Verification error", { status: 500 });
    }

    switch (result) {
      case "missing_secret":
        return new Response("Payments not configured", { status: 503 });
      case "bad_signature":
      case "bad_payload":
        return new Response("Rejected", { status: 401 });
      // Valid events we chose to ignore still get 200 so Paystack stops retrying.
      default:
        return new Response("ok", { status: 200 });
    }
  }),
});

export default http;
