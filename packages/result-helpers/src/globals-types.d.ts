/// <reference types="@consolidados/results/globals" />

/**
 * `@consolidados/results/globals` declares the value names (`Ok`, `Err`,
 * `Some`, `None`, `match`) on `globalThis` but stops short of exposing the
 * generic *type* aliases. We bridge them here so any file in any consuming
 * workspace can use `Result<T, E>` and `Option<T>` without a per-file import.
 *
 * Activate by adding to the consumer's tsconfig:
 *   "types": ["@gala-audit-trail/result-helpers/globals-types"]
 *
 * Pair with the runtime side-effect import
 * (`@gala-audit-trail/result-helpers/globals`) in the entry point so the
 * values are actually registered at runtime.
 */
import type { Option as _Option, Result as _Result } from "@consolidados/results";

declare global {
  type Result<T, E> = _Result<T, E>;
  type Option<T> = _Option<T>;
}
