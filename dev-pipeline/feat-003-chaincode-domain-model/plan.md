# FEAT-003 — Plan

Frozen after Research. 5 task groups, one commit per group.

## Task groups

### G1 — `apps/chaincode` workspace setup

1. Create `apps/chaincode/package.json` (name `@gala-audit-trail/chaincode`, private, type module, deps: `@gala-audit-trail/result-helpers` workspace, `@consolidados/results`, `json-stringify-deterministic`, `js-sha3`)
2. Create `apps/chaincode/tsconfig.json` (extends base, includes src + tests, `types: ["@gala-audit-trail/result-helpers/globals-types"]`)
3. Create `apps/chaincode/src/index.ts` (barrel re-exporting domain — placeholder stub to register entry point)
4. Run `bun install` from root, regenerate lockfile, register workspace
5. Sanity: `bun run lint` clean, `bun run typecheck` extends to apps/chaincode (update root script if needed)
6. **C1**: `feat(chaincode): scaffold workspace with result-helpers wired and globals types ref`

### G2 — Domain types: enums, entities, errors

7. `apps/chaincode/src/domain/types.ts` — `SessionStatus` and `EventType` const-object-as-enum + `EnumValues<typeof X>` derivations; `GameSession` and `SessionEvent` interfaces (per SDD-001 §2)
8. `apps/chaincode/src/domain/errors.ts` — `DomainError` const-object-as-enum + factory functions for variants carrying payload (`SessionAlreadyExists`, `SessionNotFound`, `SessionAlreadyCompleted`, `SessionAlreadyDisputed`, `InvalidEventSequence`, `UnauthorizedSigner`, `InvalidStatusTransition`, `OutcomeAlreadySet`, `InvalidSignature`, `AlreadyDisputed` bare)
9. `apps/chaincode/src/domain/index.ts` — barrel exporting types + errors
10. `apps/chaincode/src/index.ts` updated to re-export `domain/`
11. `bun run typecheck` clean
12. **C2**: `feat(chaincode): add domain types, status enums, and DomainError shape`

### G3 — Use cases + canonical helper

13. `apps/chaincode/src/domain/canonical.ts` — `canonicalSerialize(obj)` via `json-stringify-deterministic`, `keccak256Hex(input)` via `js-sha3`. Pure helpers, no I/O.
14. `apps/chaincode/src/domain/initiate-session.ts` — `initiateSession(input, existing)` returning `Result<GameSession, DomainError>`
15. `apps/chaincode/src/domain/append-checkpoint.ts` — `appendCheckpoint(session, lastEvent, input)` returning `Result<SessionEvent, DomainError>`. Computes `prevHash` via canonical helpers.
16. `apps/chaincode/src/domain/finalize-session.ts` — `finalizeSession(session, input)` returning `Result<GameSession, DomainError>`
17. `apps/chaincode/src/domain/verify-integrity.ts` — `verifyIntegrity(session, events)` returning `Result<IntegrityVerdict, DomainError>` (re-walks the hash chain, validates sequence + chain).
18. `apps/chaincode/src/domain/index.ts` updated to export use cases
19. `bun run typecheck` clean
20. **C3**: `feat(chaincode): implement domain use cases with hash chain via keccak256`

### G4 — Unit tests covering all 7 invariants

21. `apps/chaincode/tests/unit/domain/initiate-session.test.ts` — happy + duplicate (Inv. 1 partially)
22. `apps/chaincode/tests/unit/domain/append-checkpoint.test.ts` — happy + sequence violation (Inv. 2) + status-finished rejection (Inv. 1) + unauthorized signer (Inv. 3)
23. `apps/chaincode/tests/unit/domain/finalize-session.test.ts` — happy + status-not-in-progress rejection (Inv. 4) + outcome immutability (Inv. 5)
24. `apps/chaincode/tests/unit/domain/verify-integrity.test.ts` — happy + sequence-gap detection + payload mutation detection + signature mismatch detection (Inv. 6)
25. `apps/chaincode/tests/unit/domain/canonical.test.ts` — round-trip stability of `canonicalSerialize` (smoke for the Rust verifier compat point)
26. Run `bun test` — all green
27. Confirm domain coverage ≥ 70% (`bun test --coverage` if Bun supports it, otherwise spot-check)
28. **C4**: `test(chaincode): add unit tests covering all 7 domain invariants`

### G5 — Verify + close + push + open PR

29. Full local run: `bun install --frozen-lockfile`, `bun run lint`, `bun run typecheck`, `bun test`, `cargo check --workspace`, `cargo test --workspace`. All green.
30. Update `feature.md` status `planned → done`, tick acceptance boxes
31. **C5**: `chore(meta): mark FEAT-003 done`
32. Push `feat/chaincode-domain-model` to origin
33. Wait for owner OK → `gh pr create`

## Acceptance criteria mapping

| Criterion (from feature.md) | Task |
|-----------------------------|------|
| Entities `GameSession` and `SessionEvent` with `Option<T>` for nullable | G2.7 |
| `SessionStatus` and `EventType` as const-object-as-enum | G2.7 |
| `DomainError` as const-object-as-enum + `EnumValues` | G2.8 |
| `initiateSession` use case | G3.14 |
| `appendCheckpoint` use case | G3.15 |
| `finalizeSession` use case | G3.16 |
| `verifyIntegrity` use case | G3.17 |
| Each invariant from SDD-001 §4 has at least one test | G4.21–24 |
| Domain coverage ≥ 70% | G4.27 |
| `bun test` passes for `apps/chaincode/tests/unit/domain/` | G4.26 |

## Out of scope (deferred to FEAT-004)

- DTOs (`InitiateSessionDto`, `AppendCheckpointDto`, `FinalizeSessionDto`)
- ChainObject persistence subclasses (`@ChainKey`, `@StringEnumProperty`, etc.)
- Repository wrappers around `getObjectByKey` / `putChainObject`
- `AuditTrailContract` extends `GalaContract`
- `domainErrorToChainError` / `infraErrorToChainError` adapters

## Plan frozen — proceeding to Act
