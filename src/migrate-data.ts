/**
 * Data Migration Script
 *
 * Migrates data from the local SQLite database to Vercel Postgres.
 *
 * Usage:
 *   bun src/migrate-data.ts <user-email>
 *
 * Example:
 *   bun src/migrate-data.ts you@example.com
 *
 * Prerequisites:
 *   1. Set POSTGRES_URL environment variable (or use .env file)
 *   2. Run database migrations first: bun drizzle-kit push
 *   3. Sign up on the app first to create your user account
 */

import { Database } from "bun:sqlite";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema";

// Get user email from command line
const userEmail = process.argv[2];

if (!userEmail) {
  console.error("Usage: bun src/migrate-data.ts <user-email>");
  console.error("Example: bun src/migrate-data.ts you@example.com");
  console.error("\nNote: You must sign up on the app first to create your user account.");
  process.exit(1);
}

// Check for POSTGRES_URL
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Error: POSTGRES_URL or DATABASE_URL environment variable is required");
  console.error("You can set it in a .env file or export it directly");
  process.exit(1);
}

// Check if SQLite database exists
const sqliteFile = Bun.file("travel-tracker.db");
if (!(await sqliteFile.exists())) {
  console.error("Error: travel-tracker.db not found in current directory");
  console.error("Make sure you're running this from the project root");
  process.exit(1);
}

console.log("Starting data migration...\n");

// Connect to SQLite
console.log("1. Connecting to SQLite database...");
const sqlite = new Database("travel-tracker.db");

// Connect to Postgres
console.log("2. Connecting to Postgres database...");
const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("vercel")
    ? { rejectUnauthorized: false }
    : undefined,
});
const db = drizzle(pool, { schema });

// Find user by email
console.log(`3. Looking up user: ${userEmail}...`);
const users = await db
  .select()
  .from(schema.user)
  .where(eq(schema.user.email, userEmail))
  .limit(1);

if (users.length === 0) {
  console.error(`\nError: User not found with email: ${userEmail}`);
  console.error("Please sign up on the app first to create your user account.");
  await pool.end();
  process.exit(1);
}

const targetUser = users[0];
console.log(`   Found user: ${targetUser.name} (${targetUser.id})`);

// Read trips from SQLite
console.log("4. Reading trips from SQLite...");
interface SqliteTrip {
  id: number;
  destination: string;
  departure_date: string;
  return_date: string;
  notes: string | null;
  created_at: string;
}

const sqliteTrips = sqlite
  .query("SELECT * FROM trips ORDER BY departure_date")
  .all() as SqliteTrip[];

console.log(`   Found ${sqliteTrips.length} trips`);

// Read settings from SQLite
console.log("5. Reading settings from SQLite...");
interface SqliteSetting {
  key: string;
  value: string;
}

const sqliteSettings = sqlite.query("SELECT * FROM settings").all() as SqliteSetting[];
console.log(`   Found ${sqliteSettings.length} settings`);

// Migrate trips
console.log("6. Migrating trips to Postgres...");
let tripsImported = 0;
let tripsSkipped = 0;

for (const trip of sqliteTrips) {
  try {
    await db.insert(schema.trips).values({
      userId: targetUser.id,
      destination: trip.destination,
      departureDate: trip.departure_date,
      returnDate: trip.return_date,
      notes: trip.notes,
    });
    tripsImported++;
    console.log(`   + ${trip.destination} (${trip.departure_date} - ${trip.return_date})`);
  } catch (error) {
    console.log(`   - Skipped: ${trip.destination} (may already exist)`);
    tripsSkipped++;
  }
}

// Migrate settings
console.log("7. Migrating settings to Postgres...");
let settingsImported = 0;

for (const setting of sqliteSettings) {
  try {
    // Check if setting exists
    const existing = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.userId, targetUser.id))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.settings).values({
        userId: targetUser.id,
        key: setting.key,
        value: setting.value,
      });
      settingsImported++;
      console.log(`   + ${setting.key}: ${setting.value}`);
    } else {
      console.log(`   - Skipped: ${setting.key} (already exists)`);
    }
  } catch (error) {
    console.log(`   - Error migrating setting: ${setting.key}`);
  }
}

// Close connections
sqlite.close();
await pool.end();

// Summary
console.log("\n========================================");
console.log("Migration Complete!");
console.log("========================================");
console.log(`Trips imported:    ${tripsImported}`);
console.log(`Trips skipped:     ${tripsSkipped}`);
console.log(`Settings imported: ${settingsImported}`);
console.log("\nYour data has been migrated to the cloud!");
