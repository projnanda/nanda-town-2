import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __ntDb: NodePgDatabase<typeof schema> | undefined;
}

// Lazy: nothing touches DATABASE_URL until the first query, so `next build`
// works without a database attached.
function getDb(): NodePgDatabase<typeof schema> {
  if (globalThis.__ntDb) return globalThis.__ntDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: url, max: 5 });
  const instance = drizzle(pool, { schema });
  globalThis.__ntDb = instance;
  return instance;
}

export const db: NodePgDatabase<typeof schema> = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_t, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
