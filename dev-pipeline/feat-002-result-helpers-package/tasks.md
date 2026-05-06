# FEAT-002 — Tasks

Live checklist. Tick as we go.

## G1 — Package skeleton

- [x] T1.1 — `packages/result-helpers/package.json` (3 subpath exports + `@consolidados/results@^0.4.0` dep)
- [x] T1.2 — `packages/result-helpers/tsconfig.json` (extends base, includes `src/**/*`)
- [x] T1.3 — `packages/result-helpers/src/index.ts` (`export type` Brand + EnumValues with examples in JSDoc)
- [x] T1.4 — `packages/result-helpers/src/globals.ts` (side-effect `import "@consolidados/results"`)
- [x] T1.5 — `packages/result-helpers/src/globals-types.d.ts` (`/// <reference />` + ambient Result/Option)
- [x] T1.6 — `bun install` registered workspace + installed `@consolidados/results@0.4.0`
- [x] T1.7 — Bumped `biome.json` `$schema` to 2.4.14 (matches installed Biome version); `bun run lint` clean, `bun run typecheck` clean
- [x] **C1** — Commit: `feat(result-helpers): scaffold package with subpath exports for globals`

## G2 — Smoke test

- [x] T2.1 — Pivot from separate tests/tsconfig.json to a `tests/types.d.ts` with triple-slash reference (Bun isolated install doesn't create a top-level symlink for the package until a consumer app declares the dep, so the `types: ["@gala-audit-trail/result-helpers/globals-types"]` self-reference can't resolve at this stage; the triple-slash works around it cleanly and the consumer apps will use the proper subpath types ref)
- [x] T2.2 — `packages/result-helpers/tests/smoke.test.ts` — 4 tests covering `Ok().isOk()`, `Err().isErr()`, `Some/None`, `match` exhaustive, all using ambient `Result<T,E>` / `Option<T>` types
- [x] T2.3 — `bun test` 4 pass / 0 fail; `bun run typecheck` clean (after adding `@types/bun` for `bun:test` types)
- [x] Updated root `package.json` typecheck script to also run `tsc -p packages/result-helpers/tsconfig.json --noEmit`
- [x] **C2** — Commit: `test(result-helpers): add smoke test exercising globals end-to-end`

## G3 — Verification

- [x] T3.1 — Full local run end-to-end: `bun install --frozen-lockfile` (no changes), `bun run lint` clean, `bun run typecheck` clean (root + package), `bun test` 4 pass / 0 fail, `cargo check --workspace` ok, `cargo test --workspace` ok (regression sanity)

## G4 — Close + push + PR

- [x] T4.1 — Update `feature.md` status `in-progress → done`, tick acceptance boxes (consumer-config criterion explicitly deferred with rationale to FEAT-003 / FEAT-005)
- [x] **C3** — Commit: `chore(meta): mark FEAT-002 done`
- [ ] Push `feat/result-helpers-package` to origin
- [ ] Wait for owner OK → open PR via `gh`