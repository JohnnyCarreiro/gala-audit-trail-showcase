# FEAT-004 — Tasks

Live checklist. **DONE** — G1 through G8 complete; PR pending owner approval.

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

## G7 — Integration tests

- [x] T7.1 — Smoke-test `fixture()` import + AuditTrailContract registration in bun:test. Root-cause discovered: `import { type GalaChainContext, ... }` was type-only, so bun erased it at runtime and `Reflect.getMetadata("design:paramtypes")` fell back to `Object`, which fabric-contract-api rejects. Fix: value-import + `biome-ignore lint/style/useImportType` with documented reason on `audit-trail-contract.ts:1`.
- [x] T7.2 — Happy path: initiate → 2× checkpoint → finalize → VerifyIntegrity returns `Valid(3)`.
- [x] T7.3 — Edge: appending to completed → `CONFLICT` (SessionAlreadyCompleted via ADR-0005 mapping).
- [x] T7.4 — Edge: unauthorized signer (registered but not in `players`) → `FORBIDDEN` (UnauthorizedSigner).
- [x] T7.5 — Edge: double-finalize → `CONFLICT` (SessionAlreadyCompleted). Note: `enforceUniqueKey` would also block a literal replay, so the test builds a *fresh* DTO with a new uniqueKey to isolate the domain-level rejection.
- [x] T7.6 — Edge: pre-corrupted prevHash chain via `fixture.savedState(...)`. Bypasses the write-then-mutate path (which is masked by the stub's read cache) and exercises VerifyIntegrity cleanly. Reports `Tampered(eventsVerified: 1, tamperedAt: 2, PrevHashMismatch)`.
- [x] **C7** — `test(chaincode): add FEAT-004 G7 integration tests via @gala-chain/test fixture`

> Two non-obvious bits worth flagging for next time:
> 1. `@gala-chain/test`'s package barrel re-exports `./e2e` which pulls `@gala-chain/client` → `fabric-ca-client`. Bun fails to resolve that dep in our minimal setup; **import from the `unit/` subpath** to dodge it.
> 2. Don't call `fixture.callingUser(...)` when DTOs are signed — `@Submit`/`@Evaluate` decorators run `authenticate()` which sets `ctx.callingUserData` from the DTO signature, and the SDK guards against double-set.

## G8 — Close + push + PR

- [x] T8.1 — Full local run: `bun run lint` clean (44 files), `bun run typecheck` clean (root + 2 packages + chaincode), `bun test` 35/35 green, `cargo test --workspace` 0/0 (no regressions; Rust crates still scaffold-only).
- [x] T8.2 — Update `feature.md` status `in-progress → done`, all 6 acceptance criteria ticked.
- [ ] **C8** — `chore(meta): mark FEAT-004 done`
- [ ] Owner approval → open PR via `gh pr create`
