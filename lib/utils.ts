import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Backend stores `name` lowercased. Title-case each whitespace-separated word
// for display. `instructor user` → `Instructor User`.
function titleCase(s: string): string {
  return s
    .split(/(\s+)/)
    .map(part => (/^\s+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}

type UserLike = { name?: string | null; username?: string | null } | null | undefined;

// Single source of truth for the user's displayed name. Falls through
// `name → username → "there"`. Greeting, sidebar footer, and any future
// renderer should route through this — never read `user.name` directly for
// display.
export function displayName(user: UserLike): string {
  const raw = user?.name?.trim() || user?.username?.trim();
  if (!raw) return "there";
  return titleCase(raw);
}

// First word of the displayed name, suitable for "Good morning, {firstName}".
export function displayFirstName(user: UserLike): string {
  return displayName(user).split(" ")[0] || "there";
}

// Two-letter initials for the avatar, derived from the displayed name. Always
// returns at least one character so the avatar is never empty.
export function displayInitials(user: UserLike): string {
  const raw = user?.name?.trim() || user?.username?.trim();
  if (!raw) return "?";
  const initials = raw
    .split(/\s+/)
    .map(p => p[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "?";
}

// Time-of-day-aware greeting. Pure function of an hour (0–23) so it's testable
// without mocking the clock; callers pass `new Date().getHours()`.
export function timeGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
