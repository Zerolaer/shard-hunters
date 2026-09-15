import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

/** Neon HTTP driver does not use libpq channel binding; strip it to avoid odd URL parsing. */
function normalizeDatabaseUrl(url: string) {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
    return u.toString();
  } catch {
    return url.replace(/([?&])channel_binding=[^&]*/g, "$1").replace(/[?&]$/, "");
  }
}

export function getDb() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!cached) {
    const sql = neon(normalizeDatabaseUrl(raw));
    cached = drizzle(sql, { schema });
  }
  return cached;
}
