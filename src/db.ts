import { Database } from "bun:sqlite";

const db = new Database("travel-tracker.db");

// Initialize the database
db.run(`
  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    destination TEXT NOT NULL,
    departure_date TEXT NOT NULL,
    return_date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

export interface Trip {
  id: number;
  destination: string;
  departure_date: string;
  return_date: string;
  notes: string | null;
  created_at: string;
}

export interface TripInput {
  destination: string;
  departure_date: string;
  return_date: string;
  notes?: string;
}

export interface Stats {
  totalDaysOutside: number;
  plannedDaysOutside: number;
  projectedTotalDays: number;
  daysRemaining: number;
  projectedDaysRemaining: number;
  percentUsed: number;
  projectedPercentUsed: number;
  longestTrip: number;
  tripCount: number;
  pastTripCount: number;
  plannedTripCount: number;
  periodStart: string;
  eligibilityDate: string | null;
  daysUntilEligible: number | null;
  greenCardDate: string | null;
  warningLevel: "safe" | "caution" | "danger";
  projectedWarningLevel: "safe" | "caution" | "danger";
}

// Settings functions
export function getSetting(key: string): string | null {
  const result = db.query("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | null;
  return result?.value || null;
}

export function setSetting(key: string, value: string): void {
  db.run(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    [key, value]
  );
}

export function getGreenCardDate(): string | null {
  return getSetting("greenCardDate");
}

export function setGreenCardDate(date: string): void {
  setSetting("greenCardDate", date);
}

// CRUD Operations
export function getAllTrips(): Trip[] {
  return db.query("SELECT * FROM trips ORDER BY departure_date DESC").all() as Trip[];
}

export function getTripById(id: number): Trip | null {
  return db.query("SELECT * FROM trips WHERE id = ?").get(id) as Trip | null;
}

export function createTrip(trip: TripInput): Trip {
  const stmt = db.prepare(`
    INSERT INTO trips (destination, departure_date, return_date, notes)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(
    trip.destination,
    trip.departure_date,
    trip.return_date,
    trip.notes || null
  );
  return getTripById(Number(result.lastInsertRowid))!;
}

export function updateTrip(id: number, trip: TripInput): Trip | null {
  const stmt = db.prepare(`
    UPDATE trips
    SET destination = ?, departure_date = ?, return_date = ?, notes = ?
    WHERE id = ?
  `);
  stmt.run(
    trip.destination,
    trip.departure_date,
    trip.return_date,
    trip.notes || null,
    id
  );
  return getTripById(id);
}

export function deleteTrip(id: number): boolean {
  const stmt = db.prepare("DELETE FROM trips WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

// Calculate days between two dates
function daysBetween(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both departure and return day
}

// Calculate citizenship stats
// For naturalization: max 913 days (30 months) outside US in 5 years
// No single trip can exceed 365 days
const MAX_DAYS_ALLOWED = 913;
const FIVE_YEARS_MS = 5 * 365 * 24 * 60 * 60 * 1000;
const FIVE_YEARS_DAYS = 5 * 365;

export function getStats(): Stats {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const greenCardDate = getGreenCardDate();

  // Use green card date if set, otherwise use rolling 5-year window
  let periodStart: Date;
  let eligibilityDate: Date | null = null;

  if (greenCardDate) {
    periodStart = new Date(greenCardDate);
    // Eligibility is 5 years from green card date
    eligibilityDate = new Date(periodStart);
    eligibilityDate.setFullYear(eligibilityDate.getFullYear() + 5);
  } else {
    periodStart = new Date(now.getTime() - FIVE_YEARS_MS);
  }

  const trips = getAllTrips();

  let totalDaysOutside = 0;      // Past/current trips only
  let plannedDaysOutside = 0;    // Future trips only
  let longestTrip = 0;
  let pastTripCount = 0;
  let plannedTripCount = 0;

  for (const trip of trips) {
    const tripStart = new Date(trip.departure_date);
    const tripEnd = new Date(trip.return_date);
    const tripStartStr = trip.departure_date;

    // Skip trips before the period
    if (tripEnd < periodStart) continue;

    const fullTripDays = daysBetween(trip.departure_date, trip.return_date);

    // Track longest trip
    if (fullTripDays > longestTrip) {
      longestTrip = fullTripDays;
    }

    // Is this a future trip? (starts after today)
    if (tripStartStr > today) {
      // Fully planned trip
      plannedTripCount++;
      plannedDaysOutside += fullTripDays;
    } else {
      // Past or current trip
      pastTripCount++;

      // Adjust for trips that span boundaries
      const effectiveStart = tripStart < periodStart ? periodStart : tripStart;
      const effectiveEnd = tripEnd > now ? now : tripEnd;

      if (effectiveStart <= now) {
        const days = daysBetween(
          effectiveStart.toISOString().split("T")[0],
          effectiveEnd.toISOString().split("T")[0]
        );
        totalDaysOutside += days;
      }
    }
  }

  const projectedTotalDays = totalDaysOutside + plannedDaysOutside;
  const daysRemaining = Math.max(0, MAX_DAYS_ALLOWED - totalDaysOutside);
  const projectedDaysRemaining = Math.max(0, MAX_DAYS_ALLOWED - projectedTotalDays);
  const percentUsed = Math.min(100, (totalDaysOutside / MAX_DAYS_ALLOWED) * 100);
  const projectedPercentUsed = Math.min(100, (projectedTotalDays / MAX_DAYS_ALLOWED) * 100);

  const getWarningLevel = (percent: number): "safe" | "caution" | "danger" => {
    if (percent >= 90) return "danger";
    if (percent >= 70) return "caution";
    return "safe";
  };

  const warningLevel = getWarningLevel(percentUsed);
  const projectedWarningLevel = getWarningLevel(projectedPercentUsed);

  // Calculate days until eligible
  let daysUntilEligible: number | null = null;
  if (eligibilityDate) {
    const diffTime = eligibilityDate.getTime() - now.getTime();
    daysUntilEligible = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysUntilEligible < 0) daysUntilEligible = 0;
  }

  return {
    totalDaysOutside,
    plannedDaysOutside,
    projectedTotalDays,
    daysRemaining,
    projectedDaysRemaining,
    percentUsed,
    projectedPercentUsed,
    longestTrip,
    tripCount: trips.length,
    pastTripCount,
    plannedTripCount,
    periodStart: periodStart.toISOString().split("T")[0],
    eligibilityDate: eligibilityDate ? eligibilityDate.toISOString().split("T")[0] : null,
    daysUntilEligible,
    greenCardDate,
    warningLevel,
    projectedWarningLevel,
  };
}

export default db;
