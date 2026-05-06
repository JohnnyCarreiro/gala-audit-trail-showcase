/**
 * Smoke test for `@gala-audit-trail/result-helpers`.
 *
 * Validates the consumer experience end-to-end:
 *   - Side-effect import of `./globals` registers `Ok`, `Err`, `Some`, `None`,
 *     `match` on `globalThis` (runtime).
 *   - Ambient `Result<T, E>` and `Option<T>` types resolve without explicit
 *     imports (compile-time, via the `types` ref in this folder's tsconfig).
 *
 * If this file passes:
 *   - `bun test`  →  runtime globals work (consumer apps will work the same)
 *   - `tsc --noEmit` against this folder  →  ambient types resolve
 */

// Side-effect: registers Ok/Err/Some/None/match on globalThis.
// Apps will do this once at their entry point.
import "@gala-audit-trail/result-helpers/globals";

import { expect, test } from "bun:test";

test("Ok value: isOk() narrows and exposes the value", () => {
  const result: Result<number, string> = Ok(42);
  expect(result.isOk()).toBe(true);
  expect(result.isErr()).toBe(false);
  if (result.isOk()) {
    // narrowed to number — would not compile against `string` here
    expect(result.value()).toBe(42);
  }
});

test("Err value: isErr() narrows and exposes the error", () => {
  const result: Result<number, string> = Err("boom");
  expect(result.isErr()).toBe(true);
  expect(result.isOk()).toBe(false);
  if (result.isErr()) {
    expect(result.value()).toBe("boom");
  }
});

test("Option<T>: Some/None ambient", () => {
  const some: Option<number> = Some(7);
  const none: Option<number> = None();
  expect(some.isSome()).toBe(true);
  expect(none.isNone()).toBe(true);
});

test("match consumes Result exhaustively", () => {
  const result: Result<number, string> = Ok(10);
  const message = match(result, {
    Ok: (v) => `ok: ${v}`,
    Err: (e) => `err: ${e}`,
  });
  expect(message).toBe("ok: 10");
});
