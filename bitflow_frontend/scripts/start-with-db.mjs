import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl?.startsWith("file:/")) {
  const dbPath = fileURLToPath(databaseUrl);
  mkdirSync(dirname(dbPath), { recursive: true });
}

const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function run(args) {
  const result = spawnSync(npx, args, {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(["prisma", "migrate", "deploy"]);
run(["prisma", "db", "seed"]);
run(["next", "start"]);
