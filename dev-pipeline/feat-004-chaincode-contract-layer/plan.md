# FEAT-004 — Plan

Frozen after Research. 8 task groups; logic groups (G1–G6) form a coherent unit; tests + close (G7–G8) are a separable phase.

## Task groups

### G1 — SDK deps
1. `apps/chaincode/package.json` — add `@gala-chain/api@^3.1.1`, `@gala-chain/chaincode@^3.1.1` to `dependencies`; `@gala-chain/test@^3.1.1` + `class-validator` + `class-transformer` to `devDependencies` (class-validator likely a peer of `@gala-chain/api` — confirm at install time)
2. `bun install`
3. **C1**: `chore(chaincode): add @gala-chain/api, chaincode, and test SDK deps`

### G2 — DTOs
4. `src/dto/initiate-session-dto.ts` — `InitiateSessionDto extends SubmitCallDTO` (sessionId UUID, gameId, players[], studioSigner, metadata Optional)
5. `src/dto/append-checkpoint-dto.ts` — `AppendCheckpointDto extends SubmitCallDTO` (sessionId, eventId, payload, signedBy, signature, timestamp)
6. `src/dto/finalize-session-dto.ts` — `FinalizeSessionDto extends SubmitCallDTO` (sessionId, eventId, outcomeHash, ...)
7. `src/dto/get-session-dto.ts` — `GetSessionDto extends ChainCallDTO` (sessionId only)
8. `src/dto/index.ts` barrel
9. **C2**: `feat(chaincode): add Submit/ChainCall DTOs with class-validator`

### G3 — Persistence ChainObjects + converters
10. `src/persistence/game-session-chain-object.ts` — `GameSessionChainObject extends ChainObject` with `@ChainKey({ position: 0 }) sessionId`, plain fields for other domain props (using nullable `?` shape, not `Option`)
11. `src/persistence/session-event-chain-object.ts` — `SessionEventChainObject extends ChainObject` with composite key `(sessionId, sequence)`
12. `src/persistence/converters.ts` — `gameSessionToDomain(co): GameSession`, `gameSessionFromDomain(s): GameSessionChainObject`, same for events. **`Option<T>` ↔ `T | null/undefined` conversion lives here** (per Q-C).
13. `src/persistence/index.ts` barrel
14. **C3**: `feat(chaincode): add ChainObject persistence types and domain converters`

### G4 — Repository
15. `src/infra/errors.ts` — `InfraError` const-object-as-enum + `EnumValues` (variants: `LedgerFailure(cause)`, more as needed)
16. `src/infra/session-repository.ts` — wrappers around `getObjectByKey`/`putChainObject`/`getObjectsByPartialCompositeKey`. Each returns `Result<...>`. **The single `try/catch` site of the chaincode lives here.**
17. Functions to land: `findSession(ctx, id)`, `saveSession(ctx, session)`, `findEventsBySession(ctx, sessionId)`, `findLastEvent(ctx, sessionId)`, `saveEvent(ctx, event)`
18. `src/infra/index.ts` barrel
19. **C4**: `feat(chaincode): add session repository wrapping ledger I/O into Result/Option`

### G5 — Error adapters
20. `src/contracts/error-adapter.ts`:
    - `domainErrorToChainError(err: DomainError): ChainError` — exhaustive `match` over 9 variants
    - `infraErrorToChainError(err: InfraError): ChainError`
21. **C5**: `feat(chaincode): map DomainError and InfraError to ChainError at the SDK boundary`

### G6 — AuditTrailContract
22. `src/contracts/audit-trail-contract.ts`:
    - `class AuditTrailContract extends GalaContract` (constructor with name + version per SDK convention)
    - `@Submit` `initiateSession` — calls repo.findSession (must be None), domain.initiateSession, repo.saveSession; throws via adapter on Err
    - `@Submit` `appendCheckpoint` — calls repo.findSession (must be Some), repo.findLastEvent, domain.appendCheckpoint, repo.saveEvent (+ session status update); throws via adapter
    - `@Submit` `finalizeSession` — same shape; persists both updated session + terminal event
    - `@Evaluate` `getSession` — returns the session (as ChainObject — SDK serializes for response)
    - `@Evaluate` `getSessionEvents` — returns the event list
    - `@Evaluate` `verifyIntegrity` — calls repo.findSession + repo.findEventsBySession, domain.verifyIntegrity, returns IntegrityVerdict
23. Update `src/index.ts` to export the contract class
24. **C6**: `feat(chaincode): add AuditTrailContract extending GalaContract`

### G7 — Integration tests
25. `tests/integration/audit-trail-contract.spec.ts` — try bun:test + `TestChaincode` first
26. Cover happy path: initiate → append × 2 → finalize → verify → all-good
27. Cover edge cases: appending to completed session → ConflictError; unauthorized signer → DefaultError or similar; double-finalize → ConflictError; sequence-gap detection via verifyIntegrity
28. If bun:test + TestChaincode incompatible: document in `docs/open-questions.md` (rephrase OQ-04), fall back to direct contract-method invocation (no harness) for the same test scenarios — degraded but functional
29. **C7**: `test(chaincode): add integration tests for AuditTrailContract via TestChaincode`

### G8 — Close + PR
30. Full local run; update `feature.md` status `planned → done`; tick acceptance
31. **C8**: `chore(meta): mark FEAT-004 done`
32. Push + open PR after owner approval

## Acceptance criteria mapping

| Criterion (from feature.md) | Task |
|-----------------------------|------|
| DTOs with class-validator | G2 |
| `session-repository.ts` wrapping SDK throws into Result | G4 |
| `error-adapter.ts` exhaustive match | G5 |
| `AuditTrailContract` extends GalaContract; throws ChainError only via adapter | G6 |
| `audit-trail-contract.spec.ts` covers happy + edge cases | G7 |
| Local `chaincode-test` runs green | G7 |

## Out of scope (deferred)

- Frontend wiring — FEAT-005
- Off-chain Rust verifier — FEAT-006 / FEAT-007
- TNT deployment + e2e — handled separately in `docs/deployment.md`

## Plan frozen — proceeding to Act
