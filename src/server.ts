import index from "./index.html";
import {
  getAllTrips,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip,
  getStats,
  getGreenCardDate,
  setGreenCardDate,
  type TripInput,
} from "./db";

const server = Bun.serve({
  port: 3000,
  routes: {
    "/": index,

    // Get all trips
    "/api/trips": {
      GET: () => {
        const trips = getAllTrips();
        return Response.json(trips);
      },
      POST: async (req) => {
        try {
          const body = (await req.json()) as TripInput;

          if (!body.destination || !body.departure_date || !body.return_date) {
            return Response.json(
              { error: "Missing required fields" },
              { status: 400 }
            );
          }

          const trip = createTrip(body);
          return Response.json(trip, { status: 201 });
        } catch (error) {
          return Response.json(
            { error: "Invalid request body" },
            { status: 400 }
          );
        }
      },
    },

    // Get stats
    "/api/stats": {
      GET: () => {
        const stats = getStats();
        return Response.json(stats);
      },
    },

    // Green card date settings
    "/api/settings/green-card-date": {
      GET: () => {
        const date = getGreenCardDate();
        return Response.json({ greenCardDate: date });
      },
      PUT: async (req) => {
        try {
          const body = (await req.json()) as { greenCardDate: string };
          if (!body.greenCardDate) {
            return Response.json(
              { error: "Missing greenCardDate" },
              { status: 400 }
            );
          }
          setGreenCardDate(body.greenCardDate);
          return Response.json({ success: true, greenCardDate: body.greenCardDate });
        } catch (error) {
          return Response.json(
            { error: "Invalid request body" },
            { status: 400 }
          );
        }
      },
    },

    // Individual trip operations
    "/api/trips/:id": {
      GET: (req) => {
        const id = parseInt(req.params.id);
        const trip = getTripById(id);

        if (!trip) {
          return Response.json({ error: "Trip not found" }, { status: 404 });
        }

        return Response.json(trip);
      },
      PUT: async (req) => {
        try {
          const id = parseInt(req.params.id);
          const body = (await req.json()) as TripInput;

          if (!body.destination || !body.departure_date || !body.return_date) {
            return Response.json(
              { error: "Missing required fields" },
              { status: 400 }
            );
          }

          const trip = updateTrip(id, body);

          if (!trip) {
            return Response.json({ error: "Trip not found" }, { status: 404 });
          }

          return Response.json(trip);
        } catch (error) {
          return Response.json(
            { error: "Invalid request body" },
            { status: 400 }
          );
        }
      },
      DELETE: (req) => {
        const id = parseInt(req.params.id);
        const deleted = deleteTrip(id);

        if (!deleted) {
          return Response.json({ error: "Trip not found" }, { status: 404 });
        }

        return Response.json({ success: true });
      },
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`Travel Tracker running at http://localhost:${server.port}`);
