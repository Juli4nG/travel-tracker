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

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  greenCardDate: string | null;
  onSave: (date: string) => Promise<void>;
}

export function SettingsDialog({
  open,
  onOpenChange,
  greenCardDate,
  onSave,
}: SettingsDialogProps) {
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (greenCardDate) {
      setDate(greenCardDate);
    } else {
      setDate("");
    }
    setError(null);
  }, [greenCardDate, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!date) {
      setError("Please enter your green card start date");
      return;
    }

    setLoading(true);
    try {
      await onSave(date);
      onOpenChange(false);
    } catch (err) {
      setError("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Green Card Settings</DialogTitle>
            <DialogDescription>
              Set the date you first entered the US as a green card holder.
              This is used to calculate your 5-year eligibility period.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="greenCardDate">
                Green Card Start Date
              </Label>
              <Input
                id="greenCardDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The date you first entered the US as a permanent resident.
              </p>
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
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
