import type { VercelRequest, VercelResponse } from "@vercel/node";
import { auth } from "../src/lib/auth";
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
} from "../src/db/queries";
import { readFileSync } from "fs";
import { join } from "path";

// Helper to get authenticated session
async function getSession(req: VercelRequest) {
  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value) {
      headers.set(key, Array.isArray(value) ? value[0] : value);
    }
  });

  const session = await auth.api.getSession({ headers });
  return session;
}

// Convert VercelRequest to Web Request for Better Auth
function toWebRequest(req: VercelRequest): Request {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const url = new URL(req.url || "/", `${protocol}://${host}`);

  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value) {
      headers.set(key, Array.isArray(value) ? value[0] : value);
    }
  });

  return new Request(url.toString(), {
    method: req.method,
    headers,
    body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined,
  });
}

// Send Response back through Vercel
async function sendResponse(res: VercelResponse, response: Response) {
  res.status(response.status);

  // Copy headers
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const body = await response.text();
  res.send(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathname = req.url?.split("?")[0] || "/";
  const method = req.method || "GET";

  try {
    // ============================================
    // Better Auth Routes
    // ============================================
    if (pathname.startsWith("/api/auth")) {
      const webRequest = toWebRequest(req);
      const response = await auth.handler(webRequest);
      return sendResponse(res, response);
    }

    // ============================================
    // Static Routes - Serve index.html
    // ============================================
    if (pathname === "/" || pathname === "/index.html") {
      try {
        const htmlPath = join(process.cwd(), "src", "index.html");
        const html = readFileSync(htmlPath, "utf-8");
        res.setHeader("Content-Type", "text/html");
        return res.send(html);
      } catch {
        return res.status(500).send("Failed to load page");
      }
    }

    // ============================================
    // Protected API Routes
    // ============================================

    // Get all trips
    if (pathname === "/api/trips" && method === "GET") {
      const session = await getSession(req);
      if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const trips = await getAllTrips(session.user.id);
      return res.json(trips);
    }

    // Create trip
    if (pathname === "/api/trips" && method === "POST") {
      const session = await getSession(req);
      if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const body = req.body as TripInput;
      if (!body.destination || !body.departure_date || !body.return_date) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const trip = await createTrip(session.user.id, body);
      return res.status(201).json(trip);
    }

    // Get stats
    if (pathname === "/api/stats" && method === "GET") {
      const session = await getSession(req);
      if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const stats = await getStats(session.user.id);
      return res.json(stats);
    }

    // Get green card date
    if (pathname === "/api/settings/green-card-date" && method === "GET") {
      const session = await getSession(req);
      if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const date = await getGreenCardDate(session.user.id);
      return res.json({ greenCardDate: date });
    }

    // Set green card date
    if (pathname === "/api/settings/green-card-date" && method === "PUT") {
      const session = await getSession(req);
      if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const body = req.body as { greenCardDate: string };
      if (!body.greenCardDate) {
        return res.status(400).json({ error: "Missing greenCardDate" });
      }

      await setGreenCardDate(session.user.id, body.greenCardDate);
      return res.json({ success: true, greenCardDate: body.greenCardDate });
    }

    // Individual trip operations
    const tripMatch = pathname.match(/^\/api\/trips\/(\d+)$/);
    if (tripMatch) {
      const id = parseInt(tripMatch[1]);
      const session = await getSession(req);
      if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (method === "GET") {
        const trip = await getTripById(session.user.id, id);
        if (!trip) {
          return res.status(404).json({ error: "Trip not found" });
        }
        return res.json(trip);
      }

      if (method === "PUT") {
        const body = req.body as TripInput;
        if (!body.destination || !body.departure_date || !body.return_date) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        const trip = await updateTrip(session.user.id, id, body);
        if (!trip) {
          return res.status(404).json({ error: "Trip not found" });
        }
        return res.json(trip);
      }

      if (method === "DELETE") {
        const deleted = await deleteTrip(session.user.id, id);
        if (!deleted) {
          return res.status(404).json({ error: "Trip not found" });
        }
        return res.json({ success: true });
      }
    }

    // ============================================
    // 404 for unmatched routes
    // ============================================
    return res.status(404).send("Not Found");
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
