---
id: FEAT-002
slug: result-helpers-package
status: done
depends-on: [FEAT-001]
blocks: [FEAT-003, FEAT-005]
---

# FEAT-002 — `packages/result-helpers` (TS shared package)

## Goal

Create the internal package that exposes `Brand<T, B>`, `EnumValues<T>`, and the ResulTS globals setup. Consumed by `apps/chaincode` and `apps/frontend`.

## Acceptance criteria

- [x] `packages/result-helpers/src/index.ts` exports `Brand<T, B>` and `EnumValues<T>` (~30 lines including JSDoc; types-only via `export type`)
- [x] `packages/result-helpers/src/globals.ts` is a side-effect entry that does `import "@consolidados/results"`
- [x] `packages/result-helpers/src/globals-types.d.ts` declares ambient `Result<T, E>` and `Option<T>` and references `@consolidados/results/globals`
- [x] `package.json` exposes three subpath exports: `"."`, `"./globals"`, `"./globals-types"`
- [ ] Consumer config in `apps/chaincode/tsconfig.json` (and later `apps/frontend/tsconfig.json`) picks up the globals types — **deferred** to FEAT-003 / FEAT-005 (those apps don't exist yet); the consumer pattern is validated here via the smoke test's `tests/types.d.ts` triple-slash reference, which mirrors the architecture consumer apps will use via the proper subpath types ref once they declare the workspace dep
- [x] `bun test` passes a smoke test that uses globals without explicit imports (4 tests covering `Ok().isOk()`, `Err().isErr()`, `Some/None`, exhaustive `match`)

## Scope

**In:** the package, its tsconfig, exports map, smoke test.
**Out:** consumers — they get configured in their own features.

## Open questions

- Confirm that `@consolidados/results/globals` import + ambient type re-export plays well across both Node and browser bundles (frontend is Next.js — App Router server runtime + browser runtime). Working assumption: yes, the side-effect import is no-op on the type side.

## Branch

`feat/result-helpers-package`.
