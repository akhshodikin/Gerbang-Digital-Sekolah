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
    const isLocalhost = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");

    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: process.env.VERCEL ? 5 : 10,
    });
    dbInstance = drizzle(pool, { schema });
    return dbInstance;
  }

  // Fallback to embedded PGlite (Zero-config genuine PostgreSQL 16 engine in local storage)
  const { PGlite } = require("@electric-sql/pglite");
  const { drizzle } = require("drizzle-orm/pglite");

  const isVercel = Boolean(process.env.VERCEL);
  const dataDir = isVercel
    ? path.resolve("/tmp", "pglite")
    : path.resolve(process.cwd(), "data", "pglite");

  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch {
    // Abaikan error pembuatan folder di serverless
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
