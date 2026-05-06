# FEAT-003 — Tasks

Live checklist. Tick as we go.

## G1 — `apps/chaincode` workspace setup

- [x] T1.1 — `apps/chaincode/package.json` (deps: result-helpers workspace, @consolidados/results, json-stringify-deterministic, js-sha3)
- [x] T1.2 — `apps/chaincode/tsconfig.json` (extends base, types ref to result-helpers globals)
- [x] T1.3 — `apps/chaincode/src/index.ts` (placeholder barrel)
- [x] T1.4 — `bun install` — register workspace, install deps
- [x] T1.5 — Update root `typecheck` script to include `apps/chaincode/tsconfig.json`
- [x] T1.6 — `bun run lint` + `bun run typecheck` clean
- [x] **C1** — Commit: `feat(chaincode): scaffold workspace with result-helpers wired and globals types ref`

## G2 — Domain types: enums, entities, errors

- [x] T2.1 — `src/domain/types.ts` — SessionStatus, EventType, GameSession, SessionEvent
- [x] T2.2 — `src/domain/errors.ts` — DomainError const-object-as-enum (10 variants per SDD-001 §5)
- [x] T2.3 — `src/domain/index.ts` — barrel
- [x] T2.4 — `src/index.ts` re-exports `./domain`
- [x] T2.5 — `bun run typecheck` clean
- [x] **C2** — Commit: `feat(chaincode): add domain types, status enums, and DomainError shape`

## G3 — Use cases + canonical helper

- [x] T3.1 — `src/domain/canonical.ts` — canonicalSerialize + keccak256Hex
- [x] T3.2 — `src/domain/initiate-session.ts`
- [x] T3.3 — `src/domain/append-checkpoint.ts` (computes prevHash)
- [x] T3.4 — `src/domain/finalize-session.ts`
- [x] T3.5 — `src/domain/verify-integrity.ts`
- [x] T3.6 — Update barrel
- [x] T3.7 — `bun run typecheck` clean
- [x] **C3** — Commit: `feat(chaincode): implement domain use cases with hash chain via keccak256`

## G4 — Unit tests

- [x] T4.1 — `tests/unit/domain/initiate-session.test.ts`
- [x] T4.2 — `tests/unit/domain/append-checkpoint.test.ts`
- [x] T4.3 — `tests/unit/domain/finalize-session.test.ts`
- [x] T4.4 — `tests/unit/domain/verify-integrity.test.ts`
- [x] T4.5 — `tests/unit/domain/canonical.test.ts`
- [x] T4.6 — `bun test` all pass
- [x] T4.7 — Coverage ≥ 70% on domain
- [x] **C4** — Commit: `test(chaincode): add unit tests covering all 7 domain invariants`

## G5 — Close + push + PR

- [x] T5.1 — Full local run: bun install, lint, typecheck, test; cargo check + test (regression)
- [x] T5.2 — Update `feature.md` status `planned → done`, tick acceptance boxes
- [x] **C5** — Commit: `chore(meta): mark FEAT-003 done`
- [x] Push `feat/chaincode-domain-model` to origin
- [x] Wait for owner OK → open PR via `gh`