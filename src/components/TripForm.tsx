import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface Trip {
  id: number;
  destination: string;
  departure_date: string;
  return_date: string;
  notes: string | null;
  created_at: string;
}

interface TripFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (trip: {
    destination: string;
    departure_date: string;
    return_date: string;
    notes?: string;
  }) => Promise<void>;
  editTrip?: Trip | null;
}

export function TripForm({
  open,
  onOpenChange,
  onSubmit,
  editTrip,
}: TripFormProps) {
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editTrip) {
      setDestination(editTrip.destination);
      setDepartureDate(editTrip.departure_date);
      setReturnDate(editTrip.return_date);
      setNotes(editTrip.notes || "");
    } else {
      setDestination("");
      setDepartureDate("");
      setReturnDate("");
      setNotes("");
    }
    setError(null);
  }, [editTrip, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!destination || !departureDate || !returnDate) {
      setError("Please fill in all required fields");
      return;
    }

    if (new Date(returnDate) < new Date(departureDate)) {
      setError("Return date must be after departure date");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        destination,
        departure_date: departureDate,
        return_date: returnDate,
        notes: notes || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError("Failed to save trip. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const dayCount =
    departureDate && returnDate
      ? Math.ceil(
          (new Date(returnDate).getTime() - new Date(departureDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editTrip ? "Edit Trip" : "Add New Trip"}
            </DialogTitle>
            <DialogDescription>
              {editTrip
                ? "Update your trip details below."
                : "Enter the details of your trip outside the US."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="destination">Destination Country *</Label>
              <Input
                id="destination"
                placeholder="e.g., Japan, France, Mexico"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="departure">Departure Date *</Label>
                <Input
                  id="departure"
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="return">Return Date *</Label>
                <Input
                  id="return"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </div>
            </div>
            {dayCount > 0 && (
              <p className="text-sm text-muted-foreground">
                Trip duration:{" "}
                <span
                  className={dayCount > 365 ? "text-red-500 font-medium" : ""}
                >
                  {dayCount} days
                </span>
                {dayCount > 365 && " (exceeds 1-year limit!)"}
              </p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="Purpose of trip, places visited..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : editTrip ? "Update Trip" : "Add Trip"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
