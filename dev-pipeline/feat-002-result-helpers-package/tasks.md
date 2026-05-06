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

- [ ] T2.1 — `packages/result-helpers/tests/tsconfig.json` (adds types ref)
- [ ] T2.2 — `packages/result-helpers/tests/smoke.test.ts` (Ok().isOk(), Err().isErr(), ambient Result/Option types)
- [ ] T2.3 — `bun test` passes
- [ ] **C2** — Commit: `test(result-helpers): add smoke test exercising globals end-to-end`

## G3 — Verification

- [ ] T3.1 — Full local run: bun install --frozen-lockfile, lint, typecheck, test; cargo check + test (regression sanity)

## G4 — Close + push + PR

- [ ] T4.1 — Update `feature.md` status `planned → done`, tick acceptance boxes
- [ ] **C3** — Commit: `chore(meta): mark FEAT-002 done`
- [ ] Push `feat/result-helpers-package` to origin
- [ ] Wait for owner OK → open PR via `gh`