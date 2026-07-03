import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;

// 1. If it's a local file URL, make sure the containing folder exists
if (databaseUrl?.startsWith("file:/")) {
  try {
    const dbPath = fileURLToPath(databaseUrl);
    mkdirSync(dirname(dbPath), { recursive: true });
  } catch (err) {
    console.error("[DB Setup] Failed to create directory for local database:", err);
  }
}

const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function run(args) {
  const result = spawnSync(npx, args, {
    stdio: "inherit",
    env: process.env,
    shell: true,
  });

  if (result.error) {
    console.error(`[DB Setup] Failed to execute command ${npx} ${args.join(" ")}:`, result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// 2. Dynamic provider switching
const schemaPath = join(__dirname, "..", "prisma", "schema.prisma");
try {
  let schema = readFileSync(schemaPath, "utf-8");
  
  const isPostgres = databaseUrl?.startsWith("postgres://") || databaseUrl?.startsWith("postgresql://");
  const targetProvider = isPostgres ? "postgresql" : "sqlite";
  
  const currentProviderMatch = schema.match(/provider\s*=\s*"([^"]+)"/);
  const currentProvider = currentProviderMatch ? currentProviderMatch[1] : null;
  
  if (currentProvider && currentProvider !== targetProvider) {
    console.log(`[DB Setup] Switching provider in schema.prisma from "${currentProvider}" to "${targetProvider}"...`);
    // Replace provider line
    schema = schema.replace(/provider\s*=\s*"([^"]+)"/, `provider = "${targetProvider}"`);
    writeFileSync(schemaPath, schema, "utf-8");
    
    // Generate Prisma Client for the new provider
    console.log("[DB Setup] Regenerating Prisma Client...");
    run(["prisma", "generate"]);
  } else {
    console.log(`[DB Setup] Database provider is already set to "${targetProvider}".`);
  }
} catch (err) {
  console.error("[DB Setup] Failed to dynamically adjust prisma schema:", err);
}

// 3. Push schema to database
console.log("[DB Setup] Pushing schema to database...");
run(["prisma", "db", "push"]);

// 4. Seed database
console.log("[DB Setup] Seeding database...");
run(["prisma", "db", "seed"]);

// 5. Start Next.js server
console.log("[DB Setup] Starting application...");
run(["next", "start"]);
