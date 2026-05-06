# FEAT-004 — Tasks

Live checklist. Pause point at end of G6 — see bottom for resume notes.

## G1 — SDK deps

- [x] T1.1 — Added `@gala-chain/api@^3.1.1`, `@gala-chain/chaincode@^3.1.1` to deps; `@gala-chain/test@^3.1.1` to devDeps; plus `class-validator@^0.14.1`, `class-transformer@^0.5.1`, `reflect-metadata@^0.2.2`
- [x] T1.2 — `bun install` ok (787 transitive deps)
- [x] T1.3 — `bun run lint` + `bun run typecheck` clean
- [x] **C1** — `chore(chaincode): add @gala-chain/api, chaincode, and test SDK deps`

## G2 — DTOs

- [x] T2.1 — `InitiateSessionDto extends SubmitCallDTO`
- [x] T2.2 — `AppendCheckpointDto extends SubmitCallDTO`
- [x] T2.3 — `FinalizeSessionDto extends SubmitCallDTO` (outcomeHash regex-validated as 0x + 64 hex)
- [x] T2.4 — `GetSessionDto extends ChainCallDTO`
- [x] T2.5 — Barrel + tsconfig adjustments (`experimentalDecorators`, `emitDecoratorMetadata`, `useDefineForClassFields: false`); `import "reflect-metadata"` at entry point
- [x] **C2** — `feat(chaincode): add Submit/ChainCall DTOs with class-validator`

## G3 — Persistence

- [x] T3.1 — `GameSessionChainObject extends ChainObject` (`@ChainKey position 0` on sessionId; INDEX_KEY `GAUDS`)
- [x] T3.2 — `SessionEventChainObject extends ChainObject` (composite key `(sessionId, sequence)`; INDEX_KEY `GAUDE`)
- [x] T3.3 — `converters.ts` — 4 functions; Option ↔ nullable conversion lives **only** here
- [x] T3.4 — Barrel
- [x] **C3** — `feat(chaincode): add ChainObject persistence types and domain converters`

## G4 — Repository

- [x] T4.1 — `InfraError` const-object-as-enum (`LedgerFailure`, `SerializationError`)
- [x] T4.2 — `session-repository.ts` — 5 functions wrapping `getObjectByKey`, `getObjectsByPartialCompositeKey`, `putChainObject`. **The single `try/catch` site of the chaincode.** `NotFoundError` (not `ObjectNotFoundError`) is the actual SDK export — fixed during typecheck.
- [x] T4.3 — Barrel
- [x] **C4** — `feat(chaincode): add session repository wrapping ledger I/O into Result/Option`

## G5 — Error adapters

- [x] T5.1 — `domainErrorToChainError` exhaustive (9 variants → ConflictError / NotFoundError / ForbiddenError / DefaultError per ADR-0005 mapping policy)
- [x] T5.2 — `infraErrorToChainError` exhaustive (both InfraError variants → DefaultError)
- [x] **C5** — `feat(chaincode): map DomainError and InfraError to ChainError at the SDK boundary`

## G6 — Contract

- [x] T6.1 — `AuditTrailContract` class shell (extends `GalaContract`, name + version 0.1.0)
- [x] T6.2 — `InitiateSession` method (`@Submit`)
- [x] T6.3 — `AppendCheckpoint` method (`@Submit`, status transition `Initiated → InProgress` on first checkpoint)
- [x] T6.4 — `FinalizeSession` method (`@Submit`, atomic session + terminal event persist)
- [x] T6.5 — `GetSession`, `GetSessionEvents`, `VerifyIntegrity` (`@Evaluate` reads)
- [x] T6.6 — `src/index.ts` exports the contract
- [x] **C6** — `feat(chaincode): add AuditTrailContract extending GalaContract`

> Decorator imports are from `@gala-chain/chaincode` (not `/api` — first draft was wrong, TS caught it). Added `strictFunctionTypes: false` to chaincode tsconfig only — narrow override that lets legacy decorator signatures (typed as `Function`) accept our typed methods. Domain code's strict checks are preserved via the base config.

---

## ⏸ PAUSE POINT — end of G6

Branch pushed to `origin/feat/chaincode-contract-layer` with G1–G6 complete and verified locally:
- `bun run lint` clean (42 files)
- `bun run typecheck` clean (root + 2 packages + chaincode)
- `bun test` 29/29 (FEAT-003 domain tests still pass — no regression)

PR **not opened yet** — acceptance criterion "Local `chaincode-test` runs green" is still pending (G7).

### Resume in next session: G7

Pick up at T7.1 (smoke-test `TestChaincode` import in bun:test). The Q-E decision lives in `research.md` — try bun:test first, fall back to documenting OQ-08 in `docs/open-questions.md` if `TestChaincode` has Jest-specific runtime needs.

---

## G7 — Integration tests (PENDING)

- [ ] T7.1 — Smoke-test `TestChaincode` import + minimal invoke in bun:test
- [ ] T7.2 — Happy path: initiate → 2× checkpoint → finalize → verify
- [ ] T7.3 — Edge: appending to completed
- [ ] T7.4 — Edge: unauthorized signer
- [ ] T7.5 — Edge: double-finalize
- [ ] T7.6 — Edge: verify on tampered chain
- [ ] **C7** — Commit (or document fallback in OQ-08 if blocked)

## G8 — Close + push + PR (PENDING)

- [ ] T8.1 — Full local run (bun + cargo regression)
- [ ] T8.2 — Update `feature.md` status, tick acceptance
- [ ] **C8** — `chore(meta): mark FEAT-004 done`
- [ ] Owner approval → open PR via `gh pr create`
