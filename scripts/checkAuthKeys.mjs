/*
  Auth key health check.
  Run: node scripts/checkAuthKeys.mjs

  Compares the deployment-served JWKS (the Convex JWKS env var, exposed at
  /.well-known/jwks.json) with the private key stored in auth-keys.txt.
  A mismatch or invalid JSON here surfaces in browsers as:
  "Auth provider discovery of <site> failed, check your server auth config".
*/
import { readFileSync } from "node:fs";
import crypto from "node:crypto";

const SITE_ROOT = "https://giddy-retriever-670.eu-west-1.convex.site";

function b64uToBuf(s) {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function normalizeToValidJson(raw) {
  try {
    JSON.parse(raw);
    return raw;
  } catch {
    // Repair only-for-diagnostics quoting (keys/fields unquoted)
    const repaired = raw.replace(/([{,])\s*([A-Za-z_]\w*)\s*:/g, '$1"$2":');
    try {
      JSON.parse(repaired);
      return repaired;
    } catch {
      return null;
    }
  }
}

const liveRaw = await (await fetch(`${SITE_ROOT}/.well-known/jwks.json`)).text();
const liveJson = normalizeToValidJson(liveRaw);

console.log("JWKS endpoint returns valid JSON:", liveRaw === liveJson ? "yes" : "NO (discovery breaker)");

const keyFile = readFileSync("auth-keys.txt", "utf8");
const b64 = keyFile
  .match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/)?.[1]
  ?.split(/\s+/)
  .filter(Boolean)
  .join("") ?? "";
const pem = `-----BEGIN PRIVATE KEY-----\n${b64}\n-----END PRIVATE KEY-----`;
const privJwk = crypto.createPrivateKey(pem).export({ format: "jwk" });
console.log("auth-keys.txt JWT_PRIVATE_KEY parses: yes");

if (liveJson) {
  const liveN = JSON.parse(liveJson).keys[0].n;
  const matches = b64uToBuf(liveN).equals(b64uToBuf(privJwk.n));
  console.log("JWKS public key matches JWT_PRIVATE_KEY:", matches);
} else {
  console.log("Note: live JWKS unquotable — compare n manually:");
  console.log("  live n (24ch):", (liveRaw.match(/n:([\w-]+)/)?.[1] ?? "").slice(0, 24));
  console.log("  priv n (24ch):", privJwk.n.slice(0, 24));
}
