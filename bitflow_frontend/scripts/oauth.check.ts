/** scripts/oauth.check.ts — self-check for lib/oauth.ts and safeNext (npx tsx scripts/oauth.check.ts). */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  NO_PASSWORD, authorizeUrl, canDisconnect, decodeFlow, encodeFlow, hasPassword, newFlow, stateMatches,
  suggestUsername, uniqueUsername,
} from "../lib/oauth";
import { usernameProblem } from "../lib/auth-utils";
import { safeNext } from "../lib/site";

(async () => {
  // Usernames: always valid for usernameProblem, with room for 4 digits.
  for (const raw of ["octocat", "rahul.sharma", "a", "", "..x--", "名前", "x".repeat(40), "-lead.trail-", "ab@cd", "me+tag"]) {
    const s = suggestUsername(raw);
    assert.equal(usernameProblem(s), null, `${raw} → ${s}`);
    assert.ok(s.length <= 20, s);
  }
  assert.equal(suggestUsername("rahul.sharma"), "rahul.sharma");
  assert.equal(suggestUsername("me+tag"), "metag");
  assert.equal(suggestUsername("名前"), "student");
  assert.equal(suggestUsername("-lead.trail-"), "lead.trail");

  const taken = new Set(["octocat"]);
  assert.equal(await uniqueUsername("free", async (n) => taken.has(n)), "free");
  const next = await uniqueUsername("octocat", async (n) => taken.has(n));
  assert.match(next, /^octocat\d{4}$/);
  assert.equal(usernameProblem(next), null);
  // Everything but the random fallback is taken.
  const fallback = await uniqueUsername("x", async (n) => !/^student[0-9a-f]{12}$/.test(n));
  assert.match(fallback, /^student[0-9a-f]{12}$/);
  assert.equal(usernameProblem(fallback), null);

  // ?next= stays on this site.
  assert.equal(safeNext("/sandbox", "STUDENT"), "/sandbox");
  assert.equal(safeNext(null, "STUDENT"), "/dashboard");
  assert.equal(safeNext(null, "ADMIN"), "/admin");
  for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "evil", ""]) assert.equal(safeNext(bad, "STUDENT"), "/dashboard", bad);

  // The flow cookie round-trips; the state must match exactly, for the same provider.
  const flow = newFlow("github", "/sandbox", false);
  const back = decodeFlow(encodeFlow(flow));
  assert.deepEqual(back, flow);
  assert.ok(stateMatches(back, "github", flow.state));
  assert.ok(!stateMatches(back, "google", flow.state), "other provider");
  assert.ok(!stateMatches(back, "github", flow.state + "x"));
  assert.ok(!stateMatches(back, "github", null));
  assert.ok(!stateMatches(null, "github", flow.state));
  assert.equal(decodeFlow("not-base64-json"), null);
  assert.equal(decodeFlow(undefined), null);
  assert.equal(decodeFlow(Buffer.from(JSON.stringify({ provider: "evil", state: "s", verifier: "v" })).toString("base64url")), null);

  // The authorize URL carries the PKCE challenge of the stored verifier, never the secret.
  process.env.GITHUB_CLIENT_ID = "test-id"; process.env.GITHUB_CLIENT_SECRET = "test-secret";
  const u = new URL(authorizeUrl(flow, "https://bitflow.test"));
  assert.equal(u.searchParams.get("redirect_uri"), "https://bitflow.test/api/auth/oauth/github/callback");
  assert.equal(u.searchParams.get("state"), flow.state);
  assert.equal(u.searchParams.get("code_challenge"), crypto.createHash("sha256").update(flow.verifier).digest("base64url"));
  assert.equal(u.searchParams.get("code_challenge_method"), "S256");
  assert.ok(!u.toString().includes("test-secret"));

  // Disconnecting always leaves a way in.
  assert.ok(canDisconnect({ hasPassword: true, providers: ["google"] }, "google"));
  assert.ok(!canDisconnect({ hasPassword: false, providers: ["google"] }, "google"), "the only way in");
  assert.ok(canDisconnect({ hasPassword: false, providers: ["google", "github"] }, "google"));
  assert.ok(!canDisconnect({ hasPassword: true, providers: ["google"] }, "github"), "not connected");
  assert.equal(hasPassword(NO_PASSWORD), false);
  assert.equal(hasPassword("scrypt$aa$bb"), true);

  console.log("oauth.check: all good");
})().catch((err) => { console.error(err); process.exit(1); });
