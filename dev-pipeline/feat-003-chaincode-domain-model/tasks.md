# FEAT-003 — Tasks

Live checklist. Tick as we go.

## G1 — `apps/chaincode` workspace setup

- [ ] T1.1 — `apps/chaincode/package.json` (deps: result-helpers workspace, @consolidados/results, json-stringify-deterministic, js-sha3)
- [ ] T1.2 — `apps/chaincode/tsconfig.json` (extends base, types ref to result-helpers globals)
- [ ] T1.3 — `apps/chaincode/src/index.ts` (placeholder barrel)
- [ ] T1.4 — `bun install` — register workspace, install deps
- [ ] T1.5 — Update root `typecheck` script to include `apps/chaincode/tsconfig.json`
- [ ] T1.6 — `bun run lint` + `bun run typecheck` clean
- [ ] **C1** — Commit: `feat(chaincode): scaffold workspace with result-helpers wired and globals types ref`

## G2 — Domain types: enums, entities, errors

- [ ] T2.1 — `src/domain/types.ts` — SessionStatus, EventType, GameSession, SessionEvent
- [ ] T2.2 — `src/domain/errors.ts` — DomainError const-object-as-enum (10 variants per SDD-001 §5)
- [ ] T2.3 — `src/domain/index.ts` — barrel
- [ ] T2.4 — `src/index.ts` re-exports `./domain`
- [ ] T2.5 — `bun run typecheck` clean
- [ ] **C2** — Commit: `feat(chaincode): add domain types, status enums, and DomainError shape`

## G3 — Use cases + canonical helper

- [ ] T3.1 — `src/domain/canonical.ts` — canonicalSerialize + keccak256Hex
- [ ] T3.2 — `src/domain/initiate-session.ts`
- [ ] T3.3 — `src/domain/append-checkpoint.ts` (computes prevHash)
- [ ] T3.4 — `src/domain/finalize-session.ts`
- [ ] T3.5 — `src/domain/verify-integrity.ts`
- [ ] T3.6 — Update barrel
- [ ] T3.7 — `bun run typecheck` clean
- [ ] **C3** — Commit: `feat(chaincode): implement domain use cases with hash chain via keccak256`

## G4 — Unit tests

- [ ] T4.1 — `tests/unit/domain/initiate-session.test.ts`
- [ ] T4.2 — `tests/unit/domain/append-checkpoint.test.ts`
- [ ] T4.3 — `tests/unit/domain/finalize-session.test.ts`
- [ ] T4.4 — `tests/unit/domain/verify-integrity.test.ts`
- [ ] T4.5 — `tests/unit/domain/canonical.test.ts`
- [ ] T4.6 — `bun test` all pass
- [ ] T4.7 — Coverage ≥ 70% on domain
- [ ] **C4** — Commit: `test(chaincode): add unit tests covering all 7 domain invariants`

## G5 — Close + push + PR

- [ ] T5.1 — Full local run: bun install, lint, typecheck, test; cargo check + test (regression)
- [ ] T5.2 — Update `feature.md` status `planned → done`, tick acceptance boxes
- [ ] **C5** — Commit: `chore(meta): mark FEAT-003 done`
- [ ] Push `feat/chaincode-domain-model` to origin
- [ ] Wait for owner OK → open PR via `gh`