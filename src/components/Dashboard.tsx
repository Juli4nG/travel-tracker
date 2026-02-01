import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Plane, Calendar, AlertTriangle, Clock, Award, CalendarPlus } from "lucide-react";
import { cn } from "../lib/utils";
import { format } from "date-fns";

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

interface DashboardProps {
  stats: Stats | null;
  loading: boolean;
}

export function Dashboard({ stats, loading }: DashboardProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-4 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded mb-2" />
              <div className="h-3 w-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const progressColor =
    stats.warningLevel === "danger"
      ? "bg-red-500"
      : stats.warningLevel === "caution"
      ? "bg-yellow-500"
      : "bg-green-500";

  const projectedProgressColor =
    stats.projectedWarningLevel === "danger"
      ? "bg-red-500"
      : stats.projectedWarningLevel === "caution"
      ? "bg-yellow-500"
      : "bg-blue-500";

  const isEligible = stats.daysUntilEligible !== null && stats.daysUntilEligible <= 0;

  return (
    <div className="space-y-6">
      {/* Eligibility Banner */}
      {stats.eligibilityDate && (
        <Card className={cn(
          "border-2",
          isEligible ? "border-green-500 bg-green-50" : "border-primary/20 bg-primary/5"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full",
                  isEligible ? "bg-green-500" : "bg-primary"
                )}>
                  <Award className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {isEligible ? "You are eligible to apply!" : "Citizenship Eligibility"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isEligible
                      ? `You became eligible on ${format(new Date(stats.eligibilityDate), "MMMM d, yyyy")}`
                      : `You will be eligible on ${format(new Date(stats.eligibilityDate), "MMMM d, yyyy")}`
                    }
                  </p>
                </div>
              </div>
              {!isEligible && stats.daysUntilEligible !== null && (
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">{stats.daysUntilEligible}</div>
                  <div className="text-sm text-muted-foreground">days to go</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Outside US</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDaysOutside}</div>
            {stats.plannedDaysOutside > 0 && (
              <p className="text-xs text-blue-600 font-medium">
                +{stats.plannedDaysOutside} planned
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              since {format(new Date(stats.periodStart), "MMM d, yyyy")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Remaining</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                stats.warningLevel === "danger" && "text-red-500",
                stats.warningLevel === "caution" && "text-yellow-600"
              )}
            >
              {stats.daysRemaining}
            </div>
            {stats.plannedDaysOutside > 0 && (
              <p className={cn(
                "text-xs font-medium",
                stats.projectedWarningLevel === "danger" ? "text-red-500" :
                stats.projectedWarningLevel === "caution" ? "text-yellow-600" : "text-blue-600"
              )}>
                {stats.projectedDaysRemaining} after planned trips
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              of 913 days allowed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Longest Trip</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                stats.longestTrip > 365 && "text-red-500"
              )}
            >
              {stats.longestTrip}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.longestTrip > 365
                ? "Exceeds 1-year limit!"
                : "days (max 365 per trip)"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pastTripCount}</div>
            {stats.plannedTripCount > 0 && (
              <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                <CalendarPlus className="h-3 w-3" />
                +{stats.plannedTripCount} planned
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              completed trips
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Travel Allowance
            {stats.projectedWarningLevel !== "safe" && (
              <AlertTriangle
                className={cn(
                  "h-4 w-4",
                  stats.projectedWarningLevel === "danger"
                    ? "text-red-500"
                    : "text-yellow-500"
                )}
              />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Usage */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Current</span>
              <span className="text-muted-foreground">{stats.totalDaysOutside} / 913 days</span>
            </div>
            <Progress
              value={stats.percentUsed}
              className="h-2"
              indicatorClassName={progressColor}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{stats.percentUsed.toFixed(1)}% used</span>
              <span>{stats.daysRemaining} remaining</span>
            </div>
          </div>

          {/* Projected Usage (with planned trips) */}
          {stats.plannedDaysOutside > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span className="font-medium flex items-center gap-1">
                  <CalendarPlus className="h-3 w-3 text-blue-500" />
                  Including Planned Trips
                </span>
                <span className="text-muted-foreground">{stats.projectedTotalDays} / 913 days</span>
              </div>
              <Progress
                value={stats.projectedPercentUsed}
                className="h-2"
                indicatorClassName={projectedProgressColor}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{stats.projectedPercentUsed.toFixed(1)}% projected</span>
                <span>{stats.projectedDaysRemaining} will remain</span>
              </div>
            </div>
          )}

          {stats.projectedWarningLevel === "danger" && (
            <p className="text-sm text-red-500 mt-2">
              Warning: With your planned trips, you will approach the maximum allowed days outside the US.
            </p>
          )}
          {stats.projectedWarningLevel === "caution" && stats.warningLevel === "safe" && (
            <p className="text-sm text-yellow-600 mt-2">
              Note: Your planned trips will push you over 70% of your allowed days.
            </p>
          )}
          {stats.longestTrip > 365 && (
            <p className="text-sm text-red-500 mt-2">
              Alert: Your longest trip exceeds 1 year, which may affect your
              citizenship eligibility.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
