/*
  One-time key generator for Convex Auth (JWT signing).
  Writes values to auth-keys.txt (gitignored). Never commit that file.
  Run: node generateKeys.mjs
*/
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { writeFileSync } from "node:fs";

const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

const output =
  `JWT_PRIVATE_KEY="${privateKey.trimEnd().replace(/\n/g, " ")}"\n` +
  `JWKS=${jwks}\n`;

writeFileSync("auth-keys.txt", output, { mode: 0o600 });
console.log("Wrote auth-keys.txt (gitignored). Import these into Convex env vars.");
