import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "./styles.built.css";
import { Dashboard } from "./components/Dashboard";
import { TripList } from "./components/TripList";
import { TripForm } from "./components/TripForm";
import { SettingsDialog } from "./components/SettingsDialog";
import { Button } from "./components/ui/button";
import { Plus, Globe, Settings } from "lucide-react";

interface Trip {
  id: number;
  destination: string;
  departure_date: string;
  return_date: string;
  notes: string | null;
  created_at: string;
}

interface Stats {
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

function App() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editTrip, setEditTrip] = useState<Trip | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [tripsRes, statsRes] = await Promise.all([
        fetch("/api/trips"),
        fetch("/api/stats"),
      ]);
      const tripsData = await tripsRes.json();
      const statsData = await statsRes.json();
      setTrips(tripsData);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddTrip = async (trip: {
    destination: string;
    departure_date: string;
    return_date: string;
    notes?: string;
  }) => {
    const response = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trip),
    });

    if (!response.ok) {
      throw new Error("Failed to create trip");
    }

    await fetchData();
  };

  const handleEditTrip = async (trip: {
    destination: string;
    departure_date: string;
    return_date: string;
    notes?: string;
  }) => {
    if (!editTrip) return;

    const response = await fetch(`/api/trips/${editTrip.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trip),
    });

    if (!response.ok) {
      throw new Error("Failed to update trip");
    }

    setEditTrip(null);
    await fetchData();
  };

  const handleDeleteTrip = async (id: number) => {
    if (!confirm("Are you sure you want to delete this trip?")) {
      return;
    }

    const response = await fetch(`/api/trips/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      console.error("Failed to delete trip");
      return;
    }

    await fetchData();
  };

  const handleSaveGreenCardDate = async (date: string) => {
    const response = await fetch("/api/settings/green-card-date", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ greenCardDate: date }),
    });

    if (!response.ok) {
      throw new Error("Failed to save green card date");
    }

    await fetchData();
  };

  const openEditForm = (trip: Trip) => {
    setEditTrip(trip);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditTrip(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Globe className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Travel Tracker</h1>
              <p className="text-xs text-muted-foreground">
                Track your days outside the US
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Trip
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Show setup prompt if no green card date is set */}
        {!loading && !stats?.greenCardDate && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <h3 className="font-medium text-yellow-800">Setup Required</h3>
              <p className="text-sm text-yellow-700">
                Set your green card start date to calculate your citizenship eligibility.
              </p>
            </div>
            <Button variant="outline" onClick={() => setSettingsOpen(true)}>
              Set Date
            </Button>
          </div>
        )}

        <Dashboard stats={stats} loading={loading} />
        <TripList
          trips={trips}
          loading={loading}
          onEdit={openEditForm}
          onDelete={handleDeleteTrip}
        />
      </main>

      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>
            For US naturalization: You can be outside the US for a maximum of 30
            months (913 days) during the 5-year period before applying.
          </p>
          <p className="mt-1">
            No single trip should exceed 1 year, or it may break continuous
            residence.
          </p>
        </div>
      </footer>

      <TripForm
        open={formOpen}
        onOpenChange={handleFormClose}
        onSubmit={editTrip ? handleEditTrip : handleAddTrip}
        editTrip={editTrip}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        greenCardDate={stats?.greenCardDate || null}
        onSave={handleSaveGreenCardDate}
      />
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
