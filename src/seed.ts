import { createTrip, setGreenCardDate, getAllTrips } from "./db";

// Your trip data (dates in DD/MM/YYYY format, converted to YYYY-MM-DD)
const trips = [
  { departure: "2024-01-20", return: "2024-02-05", destination: "Trip 1" },
  { departure: "2024-04-26", return: "2024-05-13", destination: "Trip 2" },
  { departure: "2024-08-25", return: "2024-12-04", destination: "Trip 3" },
  { departure: "2025-03-15", return: "2025-04-27", destination: "Trip 4" },
  { departure: "2025-06-24", return: "2025-07-11", destination: "Trip 5" },
  { departure: "2025-08-03", return: "2025-08-14", destination: "Trip 6" },
  { departure: "2025-08-17", return: "2025-09-19", destination: "Trip 7" },
  { departure: "2025-12-04", return: "2026-02-10", destination: "Trip 8" },
  { departure: "2026-06-16", return: "2026-08-21", destination: "Trip 9" },
];

// Check if database already has trips
const existingTrips = getAllTrips();
if (existingTrips.length > 0) {
  console.log(`Database already has ${existingTrips.length} trips. Skipping seed.`);
  console.log("To re-seed, delete travel-tracker.db and run again.");
} else {
  // Set green card date - August 13, 2023
  setGreenCardDate("2023-08-13");
  console.log("Set green card date to: August 13, 2023");

  // Insert all trips
  for (const trip of trips) {
    createTrip({
      destination: trip.destination,
      departure_date: trip.departure,
      return_date: trip.return,
    });
    console.log(`Added trip: ${trip.departure} to ${trip.return}`);
  }

  console.log(`\nSeeded ${trips.length} trips successfully!`);
}
