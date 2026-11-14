import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;
type DatabaseClient = { db: Database; sql: ReturnType<typeof postgres> };

const globalForDb = globalThis as typeof globalThis & { slateDb?: DatabaseClient };

export function getDb(): Database | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!globalForDb.slateDb) {
    const sql = postgres(url, { max: 2, connect_timeout: 5, idle_timeout: 20 });
    globalForDb.slateDb = { db: drizzle(sql, { schema }), sql };
  }
  return globalForDb.slateDb.db;
}