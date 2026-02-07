import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Create a PostgreSQL connection pool
// In production (Vercel), use POSTGRES_URL
// In development, you can use a local postgres or the Vercel connection
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "Warning: No POSTGRES_URL or DATABASE_URL found. Database operations will fail."
  );
}

const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes("vercel")
    ? { rejectUnauthorized: false }
    : undefined,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
