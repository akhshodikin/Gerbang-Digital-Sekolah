import * as schema from "./schema";
import path from "path";
import fs from "fs";

let dbInstance: any = null;

function normalizeDatabaseUrl(rawUrl: string): string {
  let url = rawUrl.trim();

  // Ubah karakter khusus @ pada password jika belum di-encode (contoh postgres:@Khmad...)
  if (url.includes("postgres:@")) {
    url = url.replace("postgres:@", "postgres:%40");
  }

  // Jika menggunakan host direct Supabase (IPv6-only) yang tidak dapat diakses langsung dari AWS Lambda Vercel,
  // alihkan secara otomatis ke Connection Pooler resmi Supabase (IPv4-ready di region Tokyo ap-northeast-1)
  if (url.includes("db.ektutwerkupziymvacuv.supabase.co")) {
    url = url
      .replace("db.ektutwerkupziymvacuv.supabase.co:5432", "aws-0-ap-northeast-1.pooler.supabase.com:5432")
      .replace("db.ektutwerkupziymvacuv.supabase.co", "aws-0-ap-northeast-1.pooler.supabase.com:5432");

    if (url.includes("://postgres:") || url.includes("://postgres%3A")) {
      url = url.replace("://postgres:", "://postgres.ektutwerkupziymvacuv:");
    }
  }

  return url;
}

export function getDb() {
  if (dbInstance) return dbInstance;

  let rawDatabaseUrl = process.env.DATABASE_URL?.trim();

  // Fallback otomatis ke Supabase Pooler jika berjalan di Vercel dan DATABASE_URL belum diatur
  if (!rawDatabaseUrl && process.env.VERCEL) {
    rawDatabaseUrl = "postgresql://postgres.ektutwerkupziymvacuv:%40KhmadShodikin85@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres";
  }

  if (rawDatabaseUrl && rawDatabaseUrl.length > 0) {
    const databaseUrl = normalizeDatabaseUrl(rawDatabaseUrl);
    const { Pool } = require("pg");
    const { drizzle } = require("drizzle-orm/node-postgres");
    const isLocalhost = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");

    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: process.env.VERCEL ? 3 : 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    });

    pool.on("error", (err: any) => {
      console.error("Postgres pool error:", err);
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
