import React, { useState } from "react";
import { signOut } from "../lib/auth-client";
import { Button } from "./ui/button";
import { LogOut, User, ChevronDown, Loader2 } from "lucide-react";

interface UserMenuProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  onSignOut?: () => void;
}

export function UserMenu({ user, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      onSignOut?.();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="flex items-center gap-2"
        onClick={() => setOpen(!open)}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <User className="h-4 w-4 text-primary" />
          )}
        </div>
        <span className="hidden sm:inline-block max-w-[150px] truncate">
          {user.name}
        </span>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 rounded-md border bg-background shadow-lg z-50">
            <div className="p-3 border-b">
              <p className="font-medium truncate">{user.name}</p>
              <p className="text-sm text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
            <div className="p-1">
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
