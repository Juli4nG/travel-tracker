import index from "./index.html";
import { auth } from "./lib/auth";
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
} from "./db/queries";

// Helper to get authenticated user from request
async function getSession(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session;
}

// Helper to require authentication
async function requireAuth(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return null;
  }
  return session;
}

const server = Bun.serve({
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method;

    // ============================================
    // Better Auth Routes
    // ============================================
    if (pathname.startsWith("/api/auth")) {
      return auth.handler(req);
    }

    // ============================================
    // Static Routes
    // ============================================
    if (pathname === "/" || pathname === "/index.html") {
      return new Response(Bun.file("src/index.html"));
    }

    // ============================================
    // Protected API Routes
    // ============================================

    // Get all trips
    if (pathname === "/api/trips" && method === "GET") {
      const session = await requireAuth(req);
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const trips = await getAllTrips(session.user.id);
        return Response.json(trips);
      } catch (error) {
        console.error("Error fetching trips:", error);
        return Response.json(
          { error: "Failed to fetch trips" },
          { status: 500 }
        );
      }
    }

    // Create trip
    if (pathname === "/api/trips" && method === "POST") {
      const session = await requireAuth(req);
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const body = (await req.json()) as TripInput;

        if (!body.destination || !body.departure_date || !body.return_date) {
          return Response.json(
            { error: "Missing required fields" },
            { status: 400 }
          );
        }

        const trip = await createTrip(session.user.id, body);
        return Response.json(trip, { status: 201 });
      } catch (error) {
        console.error("Error creating trip:", error);
        return Response.json({ error: "Invalid request body" }, { status: 400 });
      }
    }

    // Get stats
    if (pathname === "/api/stats" && method === "GET") {
      const session = await requireAuth(req);
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const stats = await getStats(session.user.id);
        return Response.json(stats);
      } catch (error) {
        console.error("Error fetching stats:", error);
        return Response.json(
          { error: "Failed to fetch stats" },
          { status: 500 }
        );
      }
    }

    // Get green card date
    if (pathname === "/api/settings/green-card-date" && method === "GET") {
      const session = await requireAuth(req);
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const date = await getGreenCardDate(session.user.id);
        return Response.json({ greenCardDate: date });
      } catch (error) {
        console.error("Error fetching green card date:", error);
        return Response.json(
          { error: "Failed to fetch green card date" },
          { status: 500 }
        );
      }
    }

    // Set green card date
    if (pathname === "/api/settings/green-card-date" && method === "PUT") {
      const session = await requireAuth(req);
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const body = (await req.json()) as { greenCardDate: string };
        if (!body.greenCardDate) {
          return Response.json(
            { error: "Missing greenCardDate" },
            { status: 400 }
          );
        }
        await setGreenCardDate(session.user.id, body.greenCardDate);
        return Response.json({
          success: true,
          greenCardDate: body.greenCardDate,
        });
      } catch (error) {
        console.error("Error setting green card date:", error);
        return Response.json({ error: "Invalid request body" }, { status: 400 });
      }
    }

    // Individual trip operations - GET
    const tripMatch = pathname.match(/^\/api\/trips\/(\d+)$/);
    if (tripMatch) {
      const id = parseInt(tripMatch[1]);
      const session = await requireAuth(req);
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (method === "GET") {
        try {
          const trip = await getTripById(session.user.id, id);
          if (!trip) {
            return Response.json({ error: "Trip not found" }, { status: 404 });
          }
          return Response.json(trip);
        } catch (error) {
          console.error("Error fetching trip:", error);
          return Response.json(
            { error: "Failed to fetch trip" },
            { status: 500 }
          );
        }
      }

      if (method === "PUT") {
        try {
          const body = (await req.json()) as TripInput;

          if (!body.destination || !body.departure_date || !body.return_date) {
            return Response.json(
              { error: "Missing required fields" },
              { status: 400 }
            );
          }

          const trip = await updateTrip(session.user.id, id, body);
          if (!trip) {
            return Response.json({ error: "Trip not found" }, { status: 404 });
          }
          return Response.json(trip);
        } catch (error) {
          console.error("Error updating trip:", error);
          return Response.json(
            { error: "Invalid request body" },
            { status: 400 }
          );
        }
      }

      if (method === "DELETE") {
        try {
          const deleted = await deleteTrip(session.user.id, id);
          if (!deleted) {
            return Response.json({ error: "Trip not found" }, { status: 404 });
          }
          return Response.json({ success: true });
        } catch (error) {
          console.error("Error deleting trip:", error);
          return Response.json(
            { error: "Failed to delete trip" },
            { status: 500 }
          );
        }
      }
    }

    // ============================================
    // 404 for unmatched routes
    // ============================================
    return new Response("Not Found", { status: 404 });
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`Travel Tracker running at http://localhost:${server.port}`);
