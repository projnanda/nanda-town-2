// Runs pending SQL migrations from ./drizzle at process start (idempotent).
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL not set");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url, max: 1 });
const db = drizzle(pool);

try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] up to date");
} catch (e) {
  console.error("[migrate] failed:", e);
  process.exit(1);
} finally {
  await pool.end();
}
