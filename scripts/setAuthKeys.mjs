/*
  One-time env setter for the Convex Auth key pair.
  Run: node scripts/setAuthKeys.mjs

  Reads auth-keys.txt (gitignored, produced by generateKeys.mjs) and pushes
  JWT_PRIVATE_KEY and JWKS to the CURRENT deployment via the convex CLI,
  using execFileSync so no shell layer mangles quotes (a shell pipeline
  previously stripped the JSON quotes from JWKS and broke provider
  discovery).
*/
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const keyFile = readFileSync("auth-keys.txt", "utf8");

const jwtPrivate = keyFile
  .match(/JWT_PRIVATE_KEY="?([\s\S]*?)"?\s*$/m)?.[1]
  .split(/\s+/)
  .filter(Boolean)
  .join(" ")
  .replace(/-----BEGIN PRIVATE KEY-----/, "-----BEGIN PRIVATE KEY----- ")
  .trim();

let jwks = null;
const jwksLine = keyFile.match(/JWKS="?(\{[\s\S]*?\})"?\s*$/m)?.[1];
if (jwksLine) {
  jwks = JSON.stringify(JSON.parse(jwksLine));
} else {
  // Build JWKS from the private key to guarantee pairing.
  const crypto = await import("node:crypto");
  const b64 = keyFile
    .match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/)?.[1]
    .split(/\s+/)
    .filter(Boolean)
    .join("") ?? "";
  const pem = `-----BEGIN PRIVATE KEY-----\n${b64}\n-----END PRIVATE KEY-----`;
  const jwk = crypto.createPrivateKey(pem).export({ format: "jwk" });
  jwks = JSON.stringify({ keys: [{ use: "sig", ...jwk }] });
}

function setEnv(name, value) {
  execFileSync(
    process.execPath,
    ["node_modules/convex/bin/main.js", "env", "set", name, "--", value],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  console.log(`Set ${name}.`);
}

setEnv("JWT_PRIVATE_KEY", jwtPrivate);
setEnv("JWKS", jwks);
console.log("Done. Verify with node scripts/checkAuthKeys.mjs");
