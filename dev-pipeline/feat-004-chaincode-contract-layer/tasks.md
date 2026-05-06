# FEAT-004 — Tasks

Live checklist. Tick as we go.

## G1 — SDK deps

- [ ] T1.1 — Add `@gala-chain/api`, `@gala-chain/chaincode` to deps; `@gala-chain/test`, `class-validator`, `class-transformer` to devDeps
- [ ] T1.2 — `bun install`, regenerate lockfile
- [ ] T1.3 — Verify `bun run lint` + `bun run typecheck` clean
- [ ] **C1** — Commit

## G2 — DTOs

- [ ] T2.1 — `InitiateSessionDto extends SubmitCallDTO`
- [ ] T2.2 — `AppendCheckpointDto extends SubmitCallDTO`
- [ ] T2.3 — `FinalizeSessionDto extends SubmitCallDTO`
- [ ] T2.4 — `GetSessionDto extends ChainCallDTO`
- [ ] T2.5 — Barrel + smoke typecheck
- [ ] **C2** — Commit

## G3 — Persistence

- [ ] T3.1 — `GameSessionChainObject extends ChainObject` (single-key)
- [ ] T3.2 — `SessionEventChainObject extends ChainObject` (composite key)
- [ ] T3.3 — `converters.ts` — Option ↔ nullable conversion
- [ ] T3.4 — Barrel
- [ ] **C3** — Commit

## G4 — Repository

- [ ] T4.1 — `InfraError` const-object-as-enum
- [ ] T4.2 — `session-repository.ts` — findSession / saveSession / findEventsBySession / findLastEvent / saveEvent. **`try/catch` only here.**
- [ ] T4.3 — Barrel
- [ ] **C4** — Commit

## G5 — Error adapters

- [ ] T5.1 — `domainErrorToChainError` exhaustive
- [ ] T5.2 — `infraErrorToChainError` exhaustive
- [ ] **C5** — Commit

## G6 — Contract

- [ ] T6.1 — `AuditTrailContract` class shell (extends GalaContract, name + version)
- [ ] T6.2 — `initiateSession` method
- [ ] T6.3 — `appendCheckpoint` method (incl. status transition `Initiated → InProgress`)
- [ ] T6.4 — `finalizeSession` method (atomic session + terminal event persist)
- [ ] T6.5 — `getSession`, `getSessionEvents`, `verifyIntegrity` (read methods)
- [ ] T6.6 — Update `src/index.ts` to export contract
- [ ] **C6** — Commit

## G7 — Integration tests

- [ ] T7.1 — Smoke-test `TestChaincode` import in bun:test (confirm Q-E decision works)
- [ ] T7.2 — Happy path: initiate → 2× checkpoint → finalize → verify
- [ ] T7.3 — Edge: appending to completed
- [ ] T7.4 — Edge: unauthorized signer
- [ ] T7.5 — Edge: double-finalize
- [ ] T7.6 — Edge: verify on tampered chain
- [ ] **C7** — Commit (or document fallback in OQ-04 if blocked)

## G8 — Close + push + PR

- [ ] T8.1 — Full local run (bun + cargo regression)
- [ ] T8.2 — Update `feature.md` status, tick acceptance
- [ ] **C8** — Commit
- [ ] Push, await owner approval, `gh pr create`