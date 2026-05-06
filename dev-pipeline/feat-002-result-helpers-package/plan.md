# FEAT-002 — Plan

Frozen after Research. 4 task groups, one commit per group.

## Task groups

### G1 — Package skeleton

1. Create `packages/result-helpers/package.json` (private, type module, exports map with `.`/`./globals`/`./globals-types`, deps `@consolidados/results@^0.4.0`)
2. Create `packages/result-helpers/tsconfig.json` (extends base, includes src + tests)
3. Create `packages/result-helpers/src/index.ts` (type exports `Brand` + `EnumValues`)
4. Create `packages/result-helpers/src/globals.ts` (side-effect: `import "@consolidados/results"`)
5. Create `packages/result-helpers/src/globals-types.d.ts` (`/// <reference types="@consolidados/results/globals" />` + ambient `Result<T,E>`/`Option<T>`)
6. Run `bun install` from root — installs `@consolidados/results`, registers workspace
7. Sanity: `bun run lint` clean, `bun run typecheck` clean
8. **Commit C1**: `feat(result-helpers): scaffold package with subpath exports for globals`

### G2 — Smoke test

9. Create `packages/result-helpers/tests/tsconfig.json` (extends `../tsconfig.json`, adds `types: ["@gala-audit-trail/result-helpers/globals-types"]`)
10. Create `packages/result-helpers/tests/smoke.test.ts` — side-effect import of globals; assertions on `Ok(42).isOk()`, `Err("x").isErr()`, type-level use of `Result<number, string>` and `Option<number>`
11. Run `bun test` from root — passes
12. **Commit C2**: `test(result-helpers): add smoke test exercising globals end-to-end`

### G3 — Verification

13. Full local run: `bun install --frozen-lockfile`, `bun run lint`, `bun run typecheck`, `bun test`, `cargo check --workspace` (Rust unaffected, sanity), `cargo test --workspace`. All green.

### G4 — Close + push + PR

14. Update `feature.md` status `planned → done`, tick all acceptance boxes
15. **Commit C3**: `chore(meta): mark FEAT-002 done`
16. Push `feat/result-helpers-package` to origin
17. Wait for owner OK → `gh pr create`

## Acceptance criteria mapping

| Criterion (from feature.md) | Task |
|-----------------------------|------|
| `src/index.ts` exports `Brand` + `EnumValues` (≤ 20 lines) | G1.3 |
| `src/globals.ts` is side-effect entry | G1.4 |
| `src/globals-types.d.ts` declares ambient + references `@consolidados/results/globals` | G1.5 |
| `package.json` with three subpath exports | G1.1 |
| Consumer config (chaincode tsconfig) picks up globals types | DEFERRED to FEAT-003 (apps/chaincode doesn't exist yet); FEAT-002 validates the consumer pattern via the smoke test's `tests/tsconfig.json` |
| `bun test` smoke test passes | G2 |

## Out of scope (per feature.md)

- Consumer wiring in `apps/chaincode` and `apps/frontend` — those features land the `tsconfig.json` types ref + side-effect import in their respective entry points

## Plan frozen — proceeding to Act