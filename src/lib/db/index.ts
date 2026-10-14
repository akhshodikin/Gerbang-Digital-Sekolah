import * as schema from "./schema";
import path from "path";
import fs from "fs";

let dbInstance: any = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl && databaseUrl.length > 0) {
    const { Pool } = require("pg");
    const { drizzle } = require("drizzle-orm/node-postgres");
    const pool = new Pool({
      connectionString: databaseUrl,
    });
    dbInstance = drizzle(pool, { schema });
    return dbInstance;
  }

  // Fallback to embedded PGlite (Zero-config genuine PostgreSQL 16 engine in local storage)
  const { PGlite } = require("@electric-sql/pglite");
  const { drizzle } = require("drizzle-orm/pglite");

  const dataDir = path.resolve(process.cwd(), "data", "pglite");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Persist PGlite database to disk so data is retained across restarts
  const client = new PGlite(dataDir);
  dbInstance = drizzle(client, { schema });
  return dbInstance;
}

export const db = new Proxy({} as any, {
  get(_target, prop) {
    const realDb = getDb();
    const val = realDb[prop];
    return typeof val === "function" ? val.bind(realDb) : val;
  },
});

export { schema };
