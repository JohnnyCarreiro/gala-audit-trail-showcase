import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Idiomatic shadcn helper — composes Tailwind classes with dedup of
 * conflicting utilities (e.g., `p-2` overrides `p-4`).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
