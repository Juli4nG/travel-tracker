import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Pencil, Trash2, Plane, CalendarPlus, History } from "lucide-react";
import { format } from "date-fns";

interface Trip {
  id: number;
  destination: string;
  departure_date: string;
  return_date: string;
  notes: string | null;
  created_at: string;
}

interface TripListProps {
  trips: Trip[];
  loading: boolean;
  onEdit: (trip: Trip) => void;
  onDelete: (id: number) => void;
}

function getDayCount(departure: string, returnDate: string): number {
  return (
    Math.ceil(
      (new Date(returnDate).getTime() - new Date(departure).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1
  );
}

function TripCard({
  trip,
  isPlanned,
  onEdit,
  onDelete,
}: {
  trip: Trip;
  isPlanned: boolean;
  onEdit: (trip: Trip) => void;
  onDelete: (id: number) => void;
}) {
  const days = getDayCount(trip.departure_date, trip.return_date);
  const isLongTrip = days > 365;

  return (
    <div
      className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
        isPlanned ? "border-blue-200 bg-blue-50/50" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            isPlanned ? "bg-blue-100" : "bg-primary/10"
          }`}
        >
          {isPlanned ? (
            <CalendarPlus className="h-5 w-5 text-blue-600" />
          ) : (
            <Plane className="h-5 w-5 text-primary" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{trip.destination}</h4>
            {isPlanned && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                Planned
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(trip.departure_date), "MMM d, yyyy")} -{" "}
            {format(new Date(trip.return_date), "MMM d, yyyy")}
          </p>
          {trip.notes && (
            <p className="text-xs text-muted-foreground mt-1">{trip.notes}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <span
            className={`text-lg font-semibold ${isLongTrip ? "text-red-500" : ""}`}
          >
            {days}
          </span>
          <span className="text-sm text-muted-foreground ml-1">days</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(trip)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(trip.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TripList({ trips, loading, onEdit, onDelete }: TripListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Trips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border rounded-lg animate-pulse"
              >
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-48 bg-muted rounded" />
                </div>
                <div className="h-8 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (trips.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Trips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Plane className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No trips yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add your first trip to start tracking your days outside the US.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const plannedTrips = trips.filter((t) => t.departure_date > today);
  const pastTrips = trips.filter((t) => t.departure_date <= today);

  return (
    <div className="space-y-6">
      {/* Planned Trips Section */}
      {plannedTrips.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <CalendarPlus className="h-5 w-5" />
              Planned Trips
              <span className="text-sm font-normal text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                {plannedTrips.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {plannedTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  isPlanned={true}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Trips Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            Past Trips
            <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {pastTrips.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pastTrips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No past trips recorded yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pastTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  isPlanned={false}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
