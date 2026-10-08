import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
let instance: ReturnType<typeof drizzle<typeof schema>> | undefined;
export function db() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_NOT_CONFIGURED");
  try {
    const url = new URL(connectionString);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname)
      throw new Error("invalid");
  } catch {
    throw new Error("DATABASE_URL_INVALID");
  }
  if (!instance) {
    const pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 10,
    });
    pool.on("error", (error: unknown) =>
      console.error("Database pool connection error", {
        name: error instanceof Error ? error.name : "unknown",
      }),
    );
    instance = drizzle(pool, { schema });
  }
  return instance;
}
