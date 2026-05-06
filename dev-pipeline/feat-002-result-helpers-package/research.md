# FEAT-002 — Research

## Context

`packages/result-helpers` is the canonical owner of `@consolidados/results` for the monorepo. Mirrors `my-approfile/packages/types` exactly (verified at `/home/johnny/Dev/projects/my-approfile/packages/types/`). Once shipped, FEAT-003 (chaincode) and FEAT-005 (frontend) consume it via workspace dep, configure their `tsconfig.json` with the `globals-types` ref, and side-effect-import `globals` at entry point.

## Reference pattern (my-approfile/packages/types)

**`package.json` exports map** (verified):
```json
"exports": {
  ".": "./src/index.ts",
  "./auth": "./src/auth.ts",
  "./result-helpers": "./src/result-helpers.ts",
  "./globals": "./src/globals.ts",
  "./globals-types": { "types": "./src/globals-types.d.ts" }
}
"dependencies": { "@consolidados/results": "^0.4.0" }
```

**`src/index.ts`** (verified):
```ts
export type * as auth from "./auth";
export type { Brand, EnumValues } from "./result-helpers";
```

**`src/globals.ts`** (verified):
```ts
import "@consolidados/results";
```

**`src/globals-types.d.ts`** (verified):
```ts
/// <reference types="@consolidados/results/globals" />
import type { Option as _Option, Result as _Result } from "@consolidados/results";
declare global {
  type Result<T, E> = _Result<T, E>;
  type Option<T> = _Option<T>;
}
```

**`src/result-helpers.ts`** (verified):
```ts
export type Brand<T, B> = T & { readonly __brand: B };
export type EnumValues<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => infer R ? R : T[K];
}[keyof T];
```

## Decisions for our package (resolved before Plan freeze)

### Q-A — File layout: separate `result-helpers.ts` or fold into `index.ts`?

**Decision:** Fold into `index.ts`. Our package is **named** `result-helpers` (not the more general `types` like my-approfile). Having an internal `result-helpers.ts` inside `result-helpers/` is naming repetition without value. Two helpers, one file (`index.ts`), ~10 lines.

This diverges slightly from my-approfile but makes more sense given our package scope: only result-related helpers, no auth or schemas.

### Q-B — `index.ts`: `export type` or `export`?

**Decision:** `export type`. Both `Brand<T, B>` and `EnumValues<T>` are pure type aliases — no runtime emission. Using `export type` makes intent clear and prevents accidental runtime references.

### Q-C — `tsconfig.json` for the package

**Decision:** Extend `tsconfig.base.json`, no `types` ref needed (the package doesn't *consume* its own globals; it imports `@consolidados/results` directly). Compiler options minimal.

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*", "tests/**/*"]
}
```

### Q-D — Smoke test location and shape

**Decision:** `tests/smoke.test.ts` consuming the package as a downstream consumer would (validates real DX):

- Side-effect import: `import "@gala-audit-trail/result-helpers/globals"` (registers globals at runtime)
- Type-level: `Result<number, string>` should resolve without explicit type imports (validates ambient types)
- Runtime: `Ok(42).isOk()` should return `true` (validates side-effect registration)

Ambient `Result`/`Option` types come from `globals-types`, registered via `tsconfig.json`'s `types` array. Tests need a tsconfig that includes the types ref. Two paths:

1. Single package `tsconfig.json` includes types ref — but then the package itself "consumes" its own globals, awkward.
2. Separate `tests/tsconfig.json` extends package config and adds the types ref — clean, mirrors how consumer apps will configure.

**Picked option 2.** Test tsconfig is the right place for the consumer-style configuration.

### Q-E — `@consolidados/results` dependency level

**Decision:** Regular `dependencies` (not `devDependencies` or `peerDependencies`). The package re-exports / runtime-imports the lib; consumers transitively get it via Bun workspace resolution.

### Q-F — Ambient declarations file detection by tsc

**Decision:** Confirmed — TS picks up `globals-types.d.ts` only when explicitly listed in `types` array of consumer tsconfig. Including it in the test's `types` ref is what activates the ambient declarations.

The smoke test is the verification this all works end-to-end.

## No remaining blockers

Plan ready to freeze.
