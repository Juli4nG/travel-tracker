import { eq, and, desc } from "drizzle-orm";
import { db, trips, settings, type Trip, type TripInsert } from "./index";

// ============================================
// Types
// ============================================

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

// ============================================
// Settings Functions
// ============================================

export async function getSetting(
  userId: string,
  key: string
): Promise<string | null> {
  const result = await db
    .select()
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, key)))
    .limit(1);

  return result[0]?.value || null;
}

export async function setSetting(
  userId: string,
  key: string,
  value: string
): Promise<void> {
  // Check if setting exists
  const existing = await db
    .select()
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, key)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(settings)
      .set({ value })
      .where(and(eq(settings.userId, userId), eq(settings.key, key)));
  } else {
    await db.insert(settings).values({ userId, key, value });
  }
}

export async function getGreenCardDate(userId: string): Promise<string | null> {
  return getSetting(userId, "greenCardDate");
}

export async function setGreenCardDate(
  userId: string,
  date: string
): Promise<void> {
  return setSetting(userId, "greenCardDate", date);
}

// ============================================
// Trip CRUD Operations
// ============================================

export async function getAllTrips(userId: string): Promise<Trip[]> {
  return db
    .select()
    .from(trips)
    .where(eq(trips.userId, userId))
    .orderBy(desc(trips.departureDate));
}

export async function getTripById(
  userId: string,
  id: number
): Promise<Trip | null> {
  const result = await db
    .select()
    .from(trips)
    .where(and(eq(trips.userId, userId), eq(trips.id, id)))
    .limit(1);

  return result[0] || null;
}

export async function createTrip(
  userId: string,
  trip: TripInput
): Promise<Trip> {
  const result = await db
    .insert(trips)
    .values({
      userId,
      destination: trip.destination,
      departureDate: trip.departure_date,
      returnDate: trip.return_date,
      notes: trip.notes || null,
    })
    .returning();

  return result[0];
}

export async function updateTrip(
  userId: string,
  id: number,
  trip: TripInput
): Promise<Trip | null> {
  const result = await db
    .update(trips)
    .set({
      destination: trip.destination,
      departureDate: trip.departure_date,
      returnDate: trip.return_date,
      notes: trip.notes || null,
    })
    .where(and(eq(trips.userId, userId), eq(trips.id, id)))
    .returning();

  return result[0] || null;
}

export async function deleteTrip(userId: string, id: number): Promise<boolean> {
  const result = await db
    .delete(trips)
    .where(and(eq(trips.userId, userId), eq(trips.id, id)))
    .returning();

  return result.length > 0;
}

// ============================================
// Stats Calculation
// ============================================

// Calculate days between two dates
function daysBetween(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both departure and return day
}

// For naturalization: max 913 days (30 months) outside US in 5 years
// No single trip can exceed 365 days
const MAX_DAYS_ALLOWED = 913;
const FIVE_YEARS_MS = 5 * 365 * 24 * 60 * 60 * 1000;

export async function getStats(userId: string): Promise<Stats> {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const greenCardDate = await getGreenCardDate(userId);

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

  const userTrips = await getAllTrips(userId);

  let totalDaysOutside = 0; // Past/current trips only
  let plannedDaysOutside = 0; // Future trips only
  let longestTrip = 0;
  let pastTripCount = 0;
  let plannedTripCount = 0;

  for (const trip of userTrips) {
    const tripStart = new Date(trip.departureDate);
    const tripEnd = new Date(trip.returnDate);
    const tripStartStr = trip.departureDate;

    // Skip trips before the period
    if (tripEnd < periodStart) continue;

    const fullTripDays = daysBetween(trip.departureDate, trip.returnDate);

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
  const projectedDaysRemaining = Math.max(
    0,
    MAX_DAYS_ALLOWED - projectedTotalDays
  );
  const percentUsed = Math.min(
    100,
    (totalDaysOutside / MAX_DAYS_ALLOWED) * 100
  );
  const projectedPercentUsed = Math.min(
    100,
    (projectedTotalDays / MAX_DAYS_ALLOWED) * 100
  );

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
    tripCount: userTrips.length,
    pastTripCount,
    plannedTripCount,
    periodStart: periodStart.toISOString().split("T")[0],
    eligibilityDate: eligibilityDate
      ? eligibilityDate.toISOString().split("T")[0]
      : null,
    daysUntilEligible,
    greenCardDate,
    warningLevel,
    projectedWarningLevel,
  };
}
