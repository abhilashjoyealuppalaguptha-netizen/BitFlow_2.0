import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const databaseUrl = process.env.DATABASE_URL || "file:/app/prisma/dev.db";

// 1. Ensure local SQLite file directory exists
if (databaseUrl.startsWith("file:")) {
  try {
    let cleanPath = databaseUrl.replace(/^file:/, "");
    if (!cleanPath.startsWith("/")) {
      cleanPath = join(__dirname, "..", cleanPath);
    }
    mkdirSync(dirname(cleanPath), { recursive: true });
    console.log(`[DB Setup] SQLite directory ready: ${dirname(cleanPath)}`);
  } catch (err) {
    console.error("[DB Setup] Failed to create directory for local database:", err);
  }
}

function runCommand(bin, args, ignoreError = false) {
  console.log(`[DB Setup] Running: ${bin} ${args.join(" ")}`);
  const result = spawnSync(bin, args, {
    stdio: "inherit",
    env: process.env,
    shell: true,
  });

  if (result.error) {
    console.error(`[DB Setup] Failed to execute ${bin} ${args.join(" ")}:`, result.error);
    if (!ignoreError) process.exit(1);
  }

  if (result.status !== 0) {
    console.warn(`[DB Setup] Command ${bin} ${args.join(" ")} exited with status ${result.status}`);
    if (!ignoreError) process.exit(result.status ?? 1);
  }
}

function runPrisma(args, ignoreError = false) {
  const localPrisma = join(__dirname, "..", "node_modules", ".bin", "prisma");
  if (existsSync(localPrisma)) {
    runCommand(localPrisma, args, ignoreError);
  } else {
    const npx = process.platform === "win32" ? "npx.cmd" : "npx";
    runCommand(npx, ["prisma", ...args], ignoreError);
  }
}

// 2. Dynamic provider switching
const schemaPath = join(__dirname, "..", "prisma", "schema.prisma");
try {
  let schema = readFileSync(schemaPath, "utf-8");

  const isPostgres = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");
  const targetProvider = isPostgres ? "postgresql" : "sqlite";

  const currentProviderMatch = schema.match(/provider\s*=\s*"([^"]+)"/);
  const currentProvider = currentProviderMatch ? currentProviderMatch[1] : null;

  if (currentProvider && currentProvider !== targetProvider) {
    console.log(`[DB Setup] Switching provider in schema.prisma from "${currentProvider}" to "${targetProvider}"...`);
    schema = schema.replace(/provider\s*=\s*"[^"]+"/, `provider  = "${targetProvider}"`);

    if (targetProvider === "postgresql") {
      if (!schema.includes("directUrl")) {
        schema = schema.replace(/(url\s*=\s*env\("DATABASE_URL"\))/, `$1\n  directUrl = env("DIRECT_URL")`);
      }
    } else {
      schema = schema.replace(/\n\s*directUrl\s*=\s*env\("DIRECT_URL"\)/, "");
    }

    writeFileSync(schemaPath, schema, "utf-8");
    console.log("[DB Setup] Regenerating Prisma Client...");
    runPrisma(["generate"], true);
  } else {
    console.log(`[DB Setup] Database provider is already set to "${targetProvider}".`);
  }
} catch (err) {
  console.error("[DB Setup] Failed to dynamically adjust prisma schema:", err);
}

// 3. Push schema to database
console.log("[DB Setup] Pushing schema to database...");
runPrisma(["db", "push", "--accept-data-loss"], false);

// 4. Seed database (non-fatal)
console.log("[DB Setup] Seeding database...");
runPrisma(["db", "seed"], true);

// 5. Start Next.js server
console.log("[DB Setup] Starting application...");
const nextBin = join(__dirname, "..", "node_modules", ".bin", "next");
if (existsSync(nextBin)) {
  runCommand(nextBin, ["start"], false);
} else {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  runCommand(npx, ["next", "start"], false);
}


